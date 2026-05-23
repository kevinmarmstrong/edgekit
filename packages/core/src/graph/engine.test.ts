import { describe, it, expect, beforeEach } from 'vitest'
import { createGraphEngine } from './engine.js'
import { createInitialState, updateState, type AgentState } from './state.js'
import { createEventEmitter } from '../events/emitter.js'
import type { GraphNode, NodeContext, NodeErrorPolicy, AgentConfig } from './node.js'
import type { GraphDefinition } from './types.js'
import type { AgentEvent } from '../events/types.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockNode(
  id: string,
  behavior?: (state: AgentState, ctx: NodeContext) => Promise<AgentState>,
  errorPolicy?: NodeErrorPolicy,
): GraphNode {
  const defaultBehavior = async (state: AgentState): Promise<AgentState> =>
    updateState(state, { currentNode: id })

  return {
    id,
    execute: behavior ?? defaultBehavior,
    ...(errorPolicy ? { errorPolicy } : {}),
  }
}

function createTestContext(overrides?: Partial<NodeContext>): NodeContext {
  const config: AgentConfig = {
    maxIterations: 20,
    tracing: true,
    downloadPolicy: 'auto',
  }
  return {
    emitter: createEventEmitter(),
    signal: new AbortController().signal,
    tools: [],
    config,
    ...overrides,
  }
}

function createTestState(): AgentState {
  return createInitialState({
    runId: 'test-run',
    modelId: 'test-model',
    downloadPolicy: 'auto',
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GraphEngine', () => {
  let context: NodeContext
  let state: AgentState

  beforeEach(() => {
    context = createTestContext()
    state = createTestState()
  })

  it('executes nodes sequentially in the correct order', async () => {
    const executionOrder: string[] = []

    const nodeA = createMockNode('a', async (s) => {
      executionOrder.push('a')
      return updateState(s, { currentNode: 'a' })
    })
    const nodeB = createMockNode('b', async (s) => {
      executionOrder.push('b')
      return updateState(s, { currentNode: 'b' })
    })
    const nodeC = createMockNode('c', async (s) => {
      executionOrder.push('c')
      return updateState(s, { currentNode: 'c' })
    })

    const definition: GraphDefinition = {
      nodes: { a: nodeA, b: nodeB, c: nodeC },
      edges: [['a', 'b'], ['b', 'c']],
      entryNode: 'a',
    }

    const engine = createGraphEngine(definition, context, state)
    await engine.run('hello')

    expect(executionOrder).toEqual(['a', 'b', 'c'])
    engine.dispose()
  })

  it('evaluates edge conditions for conditional transitions', async () => {
    const executionOrder: string[] = []

    const nodeA = createMockNode('a', async (s) => {
      executionOrder.push('a')
      return updateState(s, {
        currentNode: 'a',
        metadata: { shouldSkip: true },
      })
    })
    const nodeB = createMockNode('b', async (s) => {
      executionOrder.push('b')
      return updateState(s, { currentNode: 'b' })
    })
    const nodeC = createMockNode('c', async (s) => {
      executionOrder.push('c')
      return updateState(s, { currentNode: 'c' })
    })

    const definition: GraphDefinition = {
      nodes: { a: nodeA, b: nodeB, c: nodeC },
      edges: [
        ['a', 'b', { condition: (s) => !s.metadata.shouldSkip }],
        ['a', 'c', { condition: (s) => !!s.metadata.shouldSkip }],
      ],
      entryNode: 'a',
    }

    const engine = createGraphEngine(definition, context, state)
    await engine.run('test')

    expect(executionOrder).toEqual(['a', 'c'])
    engine.dispose()
  })

  it('stops execution on AbortSignal cancellation', async () => {
    const executionOrder: string[] = []
    const controller = new AbortController()

    const nodeA = createMockNode('a', async (s) => {
      executionOrder.push('a')
      controller.abort(new DOMException('Aborted', 'AbortError'))
      return updateState(s, { currentNode: 'a' })
    })
    const nodeB = createMockNode('b', async (s) => {
      executionOrder.push('b')
      return updateState(s, { currentNode: 'b' })
    })

    const definition: GraphDefinition = {
      nodes: { a: nodeA, b: nodeB },
      edges: [['a', 'b']],
      entryNode: 'a',
    }

    const ctx = createTestContext({ signal: controller.signal })
    const engine = createGraphEngine(definition, ctx, state)
    const result = await engine.run('test', { signal: controller.signal })

    // Node b should not have executed
    expect(executionOrder).toEqual(['a'])
    expect(result).toBeDefined()
    engine.dispose()
  })

  it('retries node on error with retry policy', async () => {
    let attempts = 0

    const retryNode = createMockNode(
      'retry-me',
      async (s) => {
        attempts++
        if (attempts < 3) {
          throw new Error('Transient failure')
        }
        return updateState(s, { currentNode: 'retry-me' })
      },
      { onError: 'retry', maxRetries: 3, retryDelay: 0 },
    )

    const definition: GraphDefinition = {
      nodes: { 'retry-me': retryNode },
      edges: [],
      entryNode: 'retry-me',
    }

    const engine = createGraphEngine(definition, context, state)
    const result = await engine.run('test')

    expect(attempts).toBe(3) // failed twice, succeeded third
    expect(result.steps.some((s) => s.status === 'completed')).toBe(true)
    engine.dispose()
  })

  it('skips failed node with skip policy', async () => {
    const nodeA = createMockNode(
      'skip-me',
      async () => {
        throw new Error('I should be skipped')
      },
      { onError: 'skip' },
    )
    const nodeB = createMockNode('after', async (s) =>
      updateState(s, { currentNode: 'after' }),
    )

    const definition: GraphDefinition = {
      nodes: { 'skip-me': nodeA, after: nodeB },
      edges: [['skip-me', 'after']],
      entryNode: 'skip-me',
    }

    const engine = createGraphEngine(definition, context, state)
    const result = await engine.run('test')

    const skipStep = result.steps.find((s) => s.nodeId === 'skip-me')
    expect(skipStep?.status).toBe('skipped')
    expect(skipStep?.error).toBe('I should be skipped')
    engine.dispose()
  })

  it('halts execution with halt policy (default)', async () => {
    const nodeA = createMockNode('halt-me', async () => {
      throw new Error('Fatal error')
    })
    const nodeB = createMockNode('never-reached', async (s) =>
      updateState(s, { currentNode: 'never-reached' }),
    )

    const definition: GraphDefinition = {
      nodes: { 'halt-me': nodeA, 'never-reached': nodeB },
      edges: [['halt-me', 'never-reached']],
      entryNode: 'halt-me',
    }

    const engine = createGraphEngine(definition, context, state)

    await expect(engine.run('test')).rejects.toThrow('Fatal error')
    engine.dispose()
  })

  it('redirects to fallback node with fallback policy', async () => {
    const executionOrder: string[] = []

    const nodeA = createMockNode(
      'failing',
      async () => {
        executionOrder.push('failing')
        throw new Error('need fallback')
      },
      { onError: 'fallback', fallbackNode: 'fallback-node' },
    )
    const fallbackNode = createMockNode('fallback-node', async (s) => {
      executionOrder.push('fallback-node')
      return updateState(s, { currentNode: 'fallback-node' })
    })

    const definition: GraphDefinition = {
      nodes: { failing: nodeA, 'fallback-node': fallbackNode },
      edges: [],
      entryNode: 'failing',
    }

    const engine = createGraphEngine(definition, context, state)
    const result = await engine.run('test')

    expect(executionOrder).toEqual(['failing', 'fallback-node'])
    const failedStep = result.steps.find((s) => s.nodeId === 'failing')
    expect(failedStep?.status).toBe('failed')
    const fallbackStep = result.steps.find((s) => s.nodeId === 'fallback-node')
    expect(fallbackStep?.status).toBe('completed')
    engine.dispose()
  })

  it('respects maxIterations guard to prevent infinite loops', async () => {
    const lowIterContext = createTestContext({
      config: {
        maxIterations: 3,
        tracing: true,
        downloadPolicy: 'auto',
      },
    })

    // Create a loop: a -> b -> a -> b -> ...
    const nodeA = createMockNode('a', async (s) =>
      updateState(s, { currentNode: 'a' }),
    )
    const nodeB = createMockNode('b', async (s) =>
      updateState(s, { currentNode: 'b' }),
    )

    const definition: GraphDefinition = {
      nodes: { a: nodeA, b: nodeB },
      edges: [['a', 'b'], ['b', 'a']],
      entryNode: 'a',
    }

    const engine = createGraphEngine(definition, lowIterContext, state)
    const result = await engine.run('test')

    // Should have stopped at 3 iterations
    expect(result.steps.length).toBe(3)
    engine.dispose()
  })

  it('records step traces with stepId, nodeId, timing, and status', async () => {
    const nodeA = createMockNode('trace-node', async (s) =>
      updateState(s, { currentNode: 'trace-node' }),
    )

    const definition: GraphDefinition = {
      nodes: { 'trace-node': nodeA },
      edges: [],
      entryNode: 'trace-node',
    }

    const engine = createGraphEngine(definition, context, state)
    const result = await engine.run('test')

    expect(result.steps).toHaveLength(1)
    const step = result.steps[0]!
    expect(step.stepId).toBeDefined()
    expect(step.nodeId).toBe('trace-node')
    expect(step.startedAt).toBeGreaterThan(0)
    expect(step.finishedAt).toBeGreaterThanOrEqual(step.startedAt)
    expect(step.status).toBe('completed')
    expect(step.error).toBeUndefined()
    engine.dispose()
  })

  it('emits RunStarted and RunFinished events', async () => {
    const events: AgentEvent[] = []

    const nodeA = createMockNode('simple', async (s) =>
      updateState(s, { currentNode: 'simple' }),
    )

    const definition: GraphDefinition = {
      nodes: { simple: nodeA },
      edges: [],
      entryNode: 'simple',
    }

    const engine = createGraphEngine(definition, context, state)
    engine.on((evt) => events.push(evt))

    await engine.run('test')

    const runStarted = events.find((e) => e.type === 'run:started')
    const runFinished = events.find((e) => e.type === 'run:finished')

    expect(runStarted).toBeDefined()
    expect(runStarted?.type).toBe('run:started')
    expect(runFinished).toBeDefined()
    expect(runFinished?.type).toBe('run:finished')
    if (runFinished?.type === 'run:finished') {
      expect(runFinished.status).toBe('completed')
    }
    engine.dispose()
  })

  it('emits StepStarted and StepFinished events for each node', async () => {
    const events: AgentEvent[] = []

    const nodeA = createMockNode('s1', async (s) =>
      updateState(s, { currentNode: 's1' }),
    )
    const nodeB = createMockNode('s2', async (s) =>
      updateState(s, { currentNode: 's2' }),
    )

    const definition: GraphDefinition = {
      nodes: { s1: nodeA, s2: nodeB },
      edges: [['s1', 's2']],
      entryNode: 's1',
    }

    const engine = createGraphEngine(definition, context, state)
    engine.on((evt) => events.push(evt))

    await engine.run('test')

    const stepStarted = events.filter((e) => e.type === 'step:started')
    const stepFinished = events.filter((e) => e.type === 'step:finished')

    expect(stepStarted).toHaveLength(2)
    expect(stepFinished).toHaveLength(2)

    // Verify node IDs match
    if (stepStarted[0]?.type === 'step:started') {
      expect(stepStarted[0].nodeId).toBe('s1')
    }
    if (stepStarted[1]?.type === 'step:started') {
      expect(stepStarted[1].nodeId).toBe('s2')
    }
    engine.dispose()
  })

  it('appends user message to state on run', async () => {
    const nodeA = createMockNode('echo', async (s) =>
      updateState(s, { currentNode: 'echo' }),
    )

    const definition: GraphDefinition = {
      nodes: { echo: nodeA },
      edges: [],
      entryNode: 'echo',
    }

    const engine = createGraphEngine(definition, context, state)
    const result = await engine.run('Hello there')

    const lastMsg = result.messages[result.messages.length - 1]
    expect(lastMsg).toEqual({ role: 'user', content: 'Hello there' })
    engine.dispose()
  })

  it('emits run:finished with failed status when halt throws', async () => {
    const events: AgentEvent[] = []

    const nodeA = createMockNode('fail', async () => {
      throw new Error('boom')
    })

    const definition: GraphDefinition = {
      nodes: { fail: nodeA },
      edges: [],
      entryNode: 'fail',
    }

    const engine = createGraphEngine(definition, context, state)
    engine.on((evt) => events.push(evt))

    await expect(engine.run('test')).rejects.toThrow('boom')

    const runFinished = events.find(
      (e) => e.type === 'run:finished',
    )
    expect(runFinished).toBeDefined()
    if (runFinished?.type === 'run:finished') {
      expect(runFinished.status).toBe('failed')
      expect(runFinished.error).toBe('boom')
    }
    engine.dispose()
  })

  it('halt with respond-with-error returns state instead of throwing', async () => {
    const nodeA = createMockNode('fail', async () => {
      throw new Error('soft fail')
    })

    const definition: GraphDefinition = {
      nodes: { fail: nodeA },
      edges: [],
      entryNode: 'fail',
    }

    const engine = createGraphEngine(definition, context, state, {
      defaultPolicy: { onError: 'halt' },
      onUnhandled: 'respond-with-error',
    })

    const result = await engine.run('test')

    const failedStep = result.steps.find((s) => s.nodeId === 'fail')
    expect(failedStep?.status).toBe('failed')
    expect(failedStep?.error).toBe('soft fail')
    engine.dispose()
  })
})
