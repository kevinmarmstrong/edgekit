import { describe, it, expect } from 'vitest'
import { createActNode, type ActNodeConfig } from './act.js'
import { createInitialState, updateState, type AgentState } from '../graph/state.js'
import { createEventEmitter } from '../events/emitter.js'
import type { NodeContext, AgentConfig } from '../graph/node.js'
import type { AgentEvent } from '../events/types.js'
import type { ToolCall } from '../types.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTestState(overrides?: Partial<AgentState>): AgentState {
  const base = createInitialState({
    runId: 'test-run',
    modelId: 'test-model',
    downloadPolicy: 'auto',
  })
  return overrides ? updateState(base, overrides) : base
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

function makeToolCall(overrides?: Partial<ToolCall>): ToolCall {
  return {
    id: 'tc-1',
    name: 'search',
    arguments: '{"query":"test"}',
    ...overrides,
  }
}

const defaultHandlers: ActNodeConfig['toolHandlers'] = {
  search: async (args: Record<string, unknown>) => `Found: ${args.query}`,
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createActNode', () => {
  it('executes tool call and stores result', async () => {
    const tc = makeToolCall()
    const state = createTestState({ pendingToolCalls: [tc] })
    const context = createTestContext()

    const node = createActNode({ toolHandlers: defaultHandlers })
    const result = await node.execute(state, context)

    expect(result.toolResults).toHaveLength(1)
    expect(result.toolResults[0]).toEqual({
      toolCallId: 'tc-1',
      name: 'search',
      result: 'Found: test',
    })
  })

  it('emits tool:start, tool:args, tool:end events', async () => {
    const events: AgentEvent[] = []
    const tc = makeToolCall()
    const state = createTestState({ pendingToolCalls: [tc] })
    const context = createTestContext()
    context.emitter.on((evt) => events.push(evt))

    const node = createActNode({ toolHandlers: defaultHandlers })
    await node.execute(state, context)

    const toolStart = events.find((e) => e.type === 'tool:start')
    const toolArgs = events.find((e) => e.type === 'tool:args')
    const toolEnd = events.find((e) => e.type === 'tool:end')

    expect(toolStart).toBeDefined()
    expect(toolArgs).toBeDefined()
    expect(toolEnd).toBeDefined()

    if (toolStart?.type === 'tool:start') {
      expect(toolStart.toolCallId).toBe('tc-1')
      expect(toolStart.name).toBe('search')
      expect(toolStart.runId).toBe('test-run')
    }

    if (toolArgs?.type === 'tool:args') {
      expect(toolArgs.toolCallId).toBe('tc-1')
      expect(toolArgs.args).toBe('{"query":"test"}')
    }

    if (toolEnd?.type === 'tool:end') {
      expect(toolEnd.toolCallId).toBe('tc-1')
      expect(toolEnd.result).toBe('Found: test')
      expect(toolEnd.error).toBeUndefined()
    }
  })

  it('adds tool message to state.messages', async () => {
    const tc = makeToolCall()
    const state = createTestState({
      messages: [{ role: 'user', content: 'Search for test' }],
      pendingToolCalls: [tc],
    })
    const context = createTestContext()

    const node = createActNode({ toolHandlers: defaultHandlers })
    const result = await node.execute(state, context)

    const toolMsg = result.messages[result.messages.length - 1]
    expect(toolMsg).toEqual({
      role: 'tool',
      content: 'Found: test',
      toolCallId: 'tc-1',
    })
  })

  it('clears pendingToolCalls after execution', async () => {
    const tc = makeToolCall()
    const state = createTestState({ pendingToolCalls: [tc] })
    const context = createTestContext()

    const node = createActNode({ toolHandlers: defaultHandlers })
    const result = await node.execute(state, context)

    expect(result.pendingToolCalls).toEqual([])
  })

  it('handles multiple tool calls', async () => {
    const handlers: ActNodeConfig['toolHandlers'] = {
      search: async (args: Record<string, unknown>) => `Found: ${args.query}`,
      calculate: async (args: Record<string, unknown>) => `Result: ${args.expression}`,
    }
    const tc1 = makeToolCall({ id: 'tc-1', name: 'search', arguments: '{"query":"foo"}' })
    const tc2 = makeToolCall({ id: 'tc-2', name: 'calculate', arguments: '{"expression":"1+1"}' })
    const state = createTestState({ pendingToolCalls: [tc1, tc2] })
    const context = createTestContext()

    const node = createActNode({ toolHandlers: handlers })
    const result = await node.execute(state, context)

    expect(result.toolResults).toHaveLength(2)
    expect(result.toolResults[0]?.result).toBe('Found: foo')
    expect(result.toolResults[1]?.result).toBe('Result: 1+1')
    expect(result.messages).toHaveLength(2)
    expect(result.pendingToolCalls).toEqual([])
  })

  it('handles missing tool handler gracefully', async () => {
    const events: AgentEvent[] = []
    const tc = makeToolCall({ name: 'unknown_tool' })
    const state = createTestState({ pendingToolCalls: [tc] })
    const context = createTestContext()
    context.emitter.on((evt) => events.push(evt))

    const node = createActNode({ toolHandlers: defaultHandlers })
    const result = await node.execute(state, context)

    expect(result.toolResults).toHaveLength(1)
    expect(result.toolResults[0]?.error).toBe('No handler found for tool: unknown_tool')
    expect(result.toolResults[0]?.result).toBe('')

    const toolEnd = events.find((e) => e.type === 'tool:end')
    if (toolEnd?.type === 'tool:end') {
      expect(toolEnd.error).toBe('No handler found for tool: unknown_tool')
    }
  })

  it('handles malformed JSON arguments', async () => {
    const events: AgentEvent[] = []
    const tc = makeToolCall({ arguments: '{not valid json}' })
    const state = createTestState({ pendingToolCalls: [tc] })
    const context = createTestContext()
    context.emitter.on((evt) => events.push(evt))

    const node = createActNode({ toolHandlers: defaultHandlers })
    const result = await node.execute(state, context)

    expect(result.toolResults).toHaveLength(1)
    expect(result.toolResults[0]?.error).toContain('Failed to parse tool arguments')
    expect(result.toolResults[0]?.result).toBe('')

    const toolEnd = events.find((e) => e.type === 'tool:end')
    if (toolEnd?.type === 'tool:end') {
      expect(toolEnd.error).toContain('Failed to parse tool arguments')
    }
  })

  it('handles tool handler error with try/catch', async () => {
    const failingHandlers: ActNodeConfig['toolHandlers'] = {
      search: async () => { throw new Error('Network timeout') },
    }
    const events: AgentEvent[] = []
    const tc = makeToolCall()
    const state = createTestState({ pendingToolCalls: [tc] })
    const context = createTestContext()
    context.emitter.on((evt) => events.push(evt))

    const node = createActNode({ toolHandlers: failingHandlers })
    const result = await node.execute(state, context)

    expect(result.toolResults).toHaveLength(1)
    expect(result.toolResults[0]?.error).toBe('Network timeout')
    expect(result.toolResults[0]?.result).toBe('')

    const toolEnd = events.find((e) => e.type === 'tool:end')
    if (toolEnd?.type === 'tool:end') {
      expect(toolEnd.error).toBe('Network timeout')
    }
  })

  it('returns state unchanged when no pending tool calls', async () => {
    const state = createTestState({ pendingToolCalls: [] })
    const context = createTestContext()

    const node = createActNode({ toolHandlers: defaultHandlers })
    const result = await node.execute(state, context)

    expect(result).toBe(state)
  })

  it('preserves state immutability', async () => {
    const tc = makeToolCall()
    const state = createTestState({
      messages: [{ role: 'user', content: 'hi' }],
      pendingToolCalls: [tc],
    })
    const originalMessages = state.messages
    const originalToolResults = state.toolResults
    const originalPendingToolCalls = state.pendingToolCalls

    const context = createTestContext()

    const node = createActNode({ toolHandlers: defaultHandlers })
    const result = await node.execute(state, context)

    // Original state references unchanged
    expect(state.messages).toBe(originalMessages)
    expect(state.toolResults).toBe(originalToolResults)
    expect(state.pendingToolCalls).toBe(originalPendingToolCalls)
    expect(state.messages).toHaveLength(1)
    expect(state.pendingToolCalls).toHaveLength(1)

    // Result is a different object
    expect(result).not.toBe(state)
    expect(result.messages).toHaveLength(2)
    expect(result.pendingToolCalls).toHaveLength(0)
  })

  it('stores tool result in toolResults array alongside existing results', async () => {
    const existingResult = { toolCallId: 'tc-0', name: 'previous', result: 'old' }
    const tc = makeToolCall()
    const state = createTestState({
      pendingToolCalls: [tc],
      toolResults: [existingResult],
    })
    const context = createTestContext()

    const node = createActNode({ toolHandlers: defaultHandlers })
    const result = await node.execute(state, context)

    expect(result.toolResults).toHaveLength(2)
    expect(result.toolResults[0]).toEqual(existingResult)
    expect(result.toolResults[1]).toEqual({
      toolCallId: 'tc-1',
      name: 'search',
      result: 'Found: test',
    })
  })

  it('emits events in correct order for each tool call', async () => {
    const events: AgentEvent[] = []
    const tc = makeToolCall()
    const state = createTestState({ pendingToolCalls: [tc] })
    const context = createTestContext()
    context.emitter.on((evt) => events.push(evt))

    const node = createActNode({ toolHandlers: defaultHandlers })
    await node.execute(state, context)

    const types = events.map((e) => e.type)
    expect(types).toEqual(['tool:start', 'tool:args', 'tool:end'])
  })
})
