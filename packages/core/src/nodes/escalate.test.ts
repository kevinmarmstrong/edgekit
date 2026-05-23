import { describe, it, expect, vi } from 'vitest'
import { createEscalateNode } from './escalate.js'
import { createInitialState, updateState } from '../graph/state.js'
import type { AgentState } from '../graph/state.js'
import type { NodeContext, AgentConfig } from '../graph/node.js'
import type { EscalationEvent } from '../events/types.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTestContext(overrides: Partial<NodeContext> = {}): NodeContext {
  const config: AgentConfig = {
    systemPrompt: 'test',
    maxIterations: 10,
    tracing: true,
    downloadPolicy: 'prompt' as const,
  }
  return {
    emitter: { emit: vi.fn(), on: vi.fn(() => () => {}), dispose: vi.fn() },
    signal: new AbortController().signal,
    tools: [],
    config,
    ...overrides,
  }
}

function createTestState(overrides: Partial<AgentState> = {}): AgentState {
  const state = createInitialState({
    runId: 'test-run',
    modelId: 'local-model',
    downloadPolicy: 'prompt' as const,
  })
  return updateState(state, overrides)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createEscalateNode', () => {
  it('stays local when routingConfidence is above threshold', async () => {
    const context = createTestContext()
    const state = createTestState({ routingConfidence: 0.8 })

    const node = createEscalateNode({ confidenceThreshold: 0.3 })
    const result = await node.execute(state, context)

    expect(result.inferenceMode).toBe('local')
  })

  it('escalates to cloud when routingConfidence is below threshold', async () => {
    const context = createTestContext()
    const state = createTestState({ routingConfidence: 0.1 })

    const node = createEscalateNode({ confidenceThreshold: 0.3 })
    const result = await node.execute(state, context)

    expect(result.inferenceMode).toBe('cloud')
  })

  it('sets inferenceMode to cloud on escalation', async () => {
    const context = createTestContext()
    const state = createTestState({ routingConfidence: 0.2 })

    const node = createEscalateNode()
    const result = await node.execute(state, context)

    expect(result.inferenceMode).toBe('cloud')
  })

  it('sets inferenceMode to local when staying local', async () => {
    const context = createTestContext()
    const state = createTestState({ routingConfidence: 0.5 })

    const node = createEscalateNode()
    const result = await node.execute(state, context)

    expect(result.inferenceMode).toBe('local')
  })

  it('updates modelId when cloudModelId is configured', async () => {
    const context = createTestContext()
    const state = createTestState({ routingConfidence: 0.1 })

    const node = createEscalateNode({ cloudModelId: 'claude-3-haiku' })
    const result = await node.execute(state, context)

    expect(result.modelId).toBe('claude-3-haiku')
  })

  it('does not change modelId when no cloudModelId is configured', async () => {
    const context = createTestContext()
    const state = createTestState({ routingConfidence: 0.1, modelId: 'local-model' })

    const node = createEscalateNode()
    const result = await node.execute(state, context)

    expect(result.modelId).toBe('local-model')
  })

  it('does not change modelId when staying local even if cloudModelId configured', async () => {
    const context = createTestContext()
    const state = createTestState({ routingConfidence: 0.8 })

    const node = createEscalateNode({ cloudModelId: 'claude-3-haiku' })
    const result = await node.execute(state, context)

    expect(result.modelId).toBe('local-model')
  })

  it('emits edgekit:escalation event', async () => {
    const context = createTestContext()
    const state = createTestState({ routingConfidence: 0.1 })

    const node = createEscalateNode()
    await node.execute(state, context)

    const emit = context.emitter.emit as ReturnType<typeof vi.fn>
    expect(emit).toHaveBeenCalledOnce()
    const event = emit.mock.calls[0]![0] as EscalationEvent
    expect(event.type).toBe('edgekit:escalation')
    expect(event.runId).toBe('test-run')
    expect(event.to).toBe('cloud')
    expect(event.from).toBe('local')
    expect(event.reason).toBeDefined()
    expect(event.timestamp).toBeGreaterThan(0)
  })

  it('stays local when allowCloudEscalation is false', async () => {
    const context = createTestContext()
    const state = createTestState({ routingConfidence: 0.05 })

    const node = createEscalateNode({ allowCloudEscalation: false })
    const result = await node.execute(state, context)

    expect(result.inferenceMode).toBe('local')
  })

  it('uses default confidenceThreshold of 0.3', async () => {
    const context = createTestContext()

    // 0.29 is below default threshold of 0.3
    const belowState = createTestState({ routingConfidence: 0.29 })
    const node = createEscalateNode()
    const belowResult = await node.execute(belowState, context)
    expect(belowResult.inferenceMode).toBe('cloud')

    // 0.3 is NOT below 0.3, so stays local
    const atState = createTestState({ routingConfidence: 0.3 })
    const atResult = await node.execute(atState, createTestContext())
    expect(atResult.inferenceMode).toBe('local')
  })

  it('has error policy with fallback to respond', () => {
    const node = createEscalateNode()

    expect(node.errorPolicy).toEqual({
      onError: 'fallback',
      fallbackNode: 'respond',
    })
  })

  it('does not mutate original state', async () => {
    const context = createTestContext()
    const state = createTestState({ routingConfidence: 0.1 })
    const originalInferenceMode = state.inferenceMode
    const originalModelId = state.modelId

    const node = createEscalateNode({ cloudModelId: 'claude-3-haiku' })
    const result = await node.execute(state, context)

    // Original state is unchanged
    expect(state.inferenceMode).toBe(originalInferenceMode)
    expect(state.modelId).toBe(originalModelId)
    // Result is different
    expect(result).not.toBe(state)
    expect(result.inferenceMode).toBe('cloud')
    expect(result.modelId).toBe('claude-3-haiku')
  })

  it('emits event even when staying local for trace completeness', async () => {
    const context = createTestContext()
    const state = createTestState({ routingConfidence: 0.9 })

    const node = createEscalateNode()
    await node.execute(state, context)

    const emit = context.emitter.emit as ReturnType<typeof vi.fn>
    expect(emit).toHaveBeenCalledOnce()
    const event = emit.mock.calls[0]![0] as EscalationEvent
    expect(event.type).toBe('edgekit:escalation')
    expect(event.to).toBe('local')
    expect(event.from).toBe('local')
  })

  it('uses custom reason from config', async () => {
    const context = createTestContext()
    const state = createTestState({ routingConfidence: 0.1 })

    const node = createEscalateNode({ reason: 'Model lacks capability for this query' })
    await node.execute(state, context)

    const emit = context.emitter.emit as ReturnType<typeof vi.fn>
    const event = emit.mock.calls[0]![0] as EscalationEvent
    expect(event.reason).toBe('Model lacks capability for this query')
  })

  it('includes confidence values in default reason', async () => {
    const context = createTestContext()
    const state = createTestState({ routingConfidence: 0.15 })

    const node = createEscalateNode({ confidenceThreshold: 0.5 })
    await node.execute(state, context)

    const emit = context.emitter.emit as ReturnType<typeof vi.fn>
    const event = emit.mock.calls[0]![0] as EscalationEvent
    expect(event.reason).toContain('0.15')
    expect(event.reason).toContain('0.5')
  })

  it('has node id of escalate', () => {
    const node = createEscalateNode()
    expect(node.id).toBe('escalate')
  })

  it('treats hybrid inferenceMode as local for from field', async () => {
    const context = createTestContext()
    const state = createTestState({
      routingConfidence: 0.1,
      inferenceMode: 'hybrid',
    })

    const node = createEscalateNode()
    await node.execute(state, context)

    const emit = context.emitter.emit as ReturnType<typeof vi.fn>
    const event = emit.mock.calls[0]![0] as EscalationEvent
    expect(event.from).toBe('local')
    expect(event.to).toBe('cloud')
  })
})
