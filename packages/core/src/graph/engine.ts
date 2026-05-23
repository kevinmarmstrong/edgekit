import type { AgentState, StepTrace } from './state.js'
import type { NodeContext } from './node.js'
import type {
  GraphDefinition,
  GraphErrorConfig,
  RunOptions,
} from './types.js'
import type { AgentEvent } from '../events/types.js'
import { updateState } from './state.js'
import { createEventEmitter } from '../events/emitter.js'

export interface GraphRunner {
  run(input: string, options?: RunOptions): Promise<AgentState>
  on(handler: (event: AgentEvent) => void): () => void
  dispose(): void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findNextNode(
  definition: GraphDefinition,
  currentNodeId: string,
  state: AgentState,
): string | undefined {
  for (const edge of definition.edges) {
    const [from, to, opts] = edge
    if (from !== currentNodeId) continue
    if (!opts || opts.condition(state)) return to
  }
  return undefined
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason as Error)
      return
    }
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(signal.reason as Error)
    }, { once: true })
  })
}

type TerminalStatus = 'completed' | 'failed' | 'skipped'

interface FinishedStep {
  readonly state: AgentState
  readonly trace: StepTrace & { readonly status: TerminalStatus }
}

function finishStep(
  state: AgentState,
  trace: StepTrace,
  status: TerminalStatus,
  error?: string,
): FinishedStep {
  const finished = {
    ...trace,
    finishedAt: Date.now(),
    status,
    error,
  } as const
  const steps = state.steps.map((s) =>
    s.stepId === trace.stepId ? finished : s,
  )
  return { state: updateState(state, { steps }), trace: finished }
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export function createGraphEngine(
  definition: GraphDefinition,
  context: NodeContext,
  initialState: AgentState,
  errorConfig?: GraphErrorConfig,
): GraphRunner {
  const emitter = createEventEmitter()
  let currentState = initialState

  const unsubContext = context.emitter.on((evt) => emitter.emit(evt))

  function emit(event: AgentEvent): void {
    context.emitter.emit(event)
  }

  function emitStepFinished(
    runId: string,
    trace: StepTrace & { readonly status: TerminalStatus },
  ): void {
    emit({
      type: 'step:finished',
      timestamp: trace.finishedAt ?? Date.now(),
      runId,
      stepId: trace.stepId,
      nodeId: trace.nodeId,
      status: trace.status,
      error: trace.error,
    })
  }

  async function executeNode(
    nodeId: string,
    state: AgentState,
    signal: AbortSignal,
  ): Promise<AgentState> {
    const node = definition.nodes[nodeId]
    if (!node) {
      throw new Error(`Node "${nodeId}" not found in graph definition`)
    }

    const stepId = crypto.randomUUID()
    const startedAt = Date.now()
    const trace: StepTrace = { stepId, nodeId, startedAt, status: 'running' }

    let stepState = updateState(state, {
      currentNode: nodeId,
      steps: [...state.steps, trace],
    })

    emit({
      type: 'step:started',
      timestamp: startedAt,
      runId: state.runId,
      stepId,
      nodeId,
    })

    const policy = node.errorPolicy ?? errorConfig?.defaultPolicy
    const maxAttempts = (policy?.maxRetries ?? 0) + 1
    let lastError: unknown

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
      try {
        const result = await node.execute(stepState, context)
        const fin = finishStep(result, trace, 'completed')
        emitStepFinished(state.runId, fin.trace)
        return fin.state
      } catch (err) {
        lastError = err
        if (policy?.onError === 'retry' && attempt < maxAttempts - 1) {
          await delay(policy.retryDelay ?? 1000, signal)
          continue
        }
        break
      }
    }

    const errorMsg =
      lastError instanceof Error ? lastError.message : String(lastError)
    const action = policy?.onError ?? 'halt'

    if (action === 'skip') {
      const fin = finishStep(stepState, trace, 'skipped', errorMsg)
      emitStepFinished(state.runId, fin.trace)
      return fin.state
    }

    if (action === 'fallback' && policy?.fallbackNode) {
      const fin = finishStep(stepState, trace, 'failed', errorMsg)
      emitStepFinished(state.runId, fin.trace)
      return executeNode(policy.fallbackNode, fin.state, signal)
    }

    // halt — emit failed and propagate
    const fin = finishStep(stepState, trace, 'failed', errorMsg)
    emitStepFinished(state.runId, fin.trace)
    stepState = fin.state

    if (errorConfig?.onUnhandled === 'respond-with-error') return stepState
    throw lastError
  }

  async function run(input: string, options?: RunOptions): Promise<AgentState> {
    const signal = options?.signal ?? new AbortController().signal

    let state = updateState(currentState, {
      messages: [...currentState.messages, { role: 'user' as const, content: input }],
      turn: currentState.turn + 1,
      turnId: `${currentState.runId}-turn-${currentState.turn + 1}`,
      metadata: { ...currentState.metadata, ...(options?.metadata ?? {}) },
    })

    emit({ type: 'run:started', timestamp: Date.now(), runId: state.runId })

    let nodeId: string | undefined = definition.entryNode
    let iterations = 0

    try {
      while (nodeId && iterations < context.config.maxIterations) {
        if (signal.aborted) {
          emit({ type: 'run:finished', timestamp: Date.now(), runId: state.runId, status: 'cancelled' })
          currentState = state
          return state
        }
        state = await executeNode(nodeId, state, signal)
        iterations++
        nodeId = findNextNode(definition, state.currentNode, state)
      }

      emit({ type: 'run:finished', timestamp: Date.now(), runId: state.runId, status: 'completed' })
      currentState = state
      return state
    } catch (err) {
      const isAbort =
        err instanceof DOMException && (err as DOMException).name === 'AbortError'
      emit({
        type: 'run:finished',
        timestamp: Date.now(),
        runId: state.runId,
        status: isAbort ? 'cancelled' : 'failed',
        error: isAbort ? undefined : (err instanceof Error ? err.message : String(err)),
      })
      currentState = state
      throw err
    }
  }

  return {
    run,
    on: (handler: (event: AgentEvent) => void) => emitter.on(handler),
    dispose(): void {
      unsubContext()
      emitter.dispose()
    },
  }
}
