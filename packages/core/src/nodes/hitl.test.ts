import { describe, it, expect, vi, afterEach } from 'vitest'
import { createHitlNode } from './hitl.js'
import { createInitialState, updateState } from '../graph/state.js'
import type { AgentState, ApprovalResult } from '../graph/state.js'
import type { NodeContext, AgentConfig } from '../graph/node.js'
import type { AgentEvent } from '../events/types.js'

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
    modelId: 'test',
    downloadPolicy: 'prompt' as const,
  })
  return updateState(state, overrides)
}

function createApprovalState(overrides: Partial<AgentState> = {}): AgentState {
  return createTestState({
    awaitingApproval: true,
    approvalRequest: {
      type: 'tool_execution',
      description: 'Allow file write to /tmp/data.json',
    },
    ...overrides,
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createHitlNode', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns state unchanged when awaitingApproval is false', async () => {
    const state = createTestState({ awaitingApproval: false })
    const context = createTestContext()
    const node = createHitlNode()

    const result = await node.execute(state, context)

    expect(result).toBe(state)
  })

  it('emits hitl:request event when awaitingApproval is true', async () => {
    const state = createApprovalState()
    const waitForApproval = vi.fn(
      async (): Promise<ApprovalResult> => ({ approved: true }),
    )
    const context = createTestContext({ waitForApproval })
    const node = createHitlNode()

    await node.execute(state, context)

    const emitCalls = (context.emitter.emit as ReturnType<typeof vi.fn>).mock
      .calls
    const requestEvent = emitCalls.find(
      ([e]: [AgentEvent]) => e.type === 'edgekit:hitl:request',
    )

    expect(requestEvent).toBeDefined()
    const event = requestEvent![0] as AgentEvent & {
      checkpointId: string
      description: string
    }
    expect(event.type).toBe('edgekit:hitl:request')
    expect(event.runId).toBe('test-run')
    expect(event.description).toBe('Allow file write to /tmp/data.json')
    expect(event.checkpointId).toMatch(/^test-run-hitl-\d+$/)
  })

  it('calls waitForApproval and waits for result', async () => {
    const waitForApproval = vi.fn(
      async (): Promise<ApprovalResult> => ({ approved: true }),
    )
    const state = createApprovalState()
    const context = createTestContext({ waitForApproval })
    const node = createHitlNode()

    await node.execute(state, context)

    expect(waitForApproval).toHaveBeenCalledTimes(1)
    expect(waitForApproval).toHaveBeenCalledWith(
      expect.stringMatching(/^test-run-hitl-\d+$/),
    )
  })

  it('updates state with approval result (approved: true)', async () => {
    const waitForApproval = vi.fn(
      async (): Promise<ApprovalResult> => ({ approved: true }),
    )
    const state = createApprovalState()
    const context = createTestContext({ waitForApproval })
    const node = createHitlNode()

    const result = await node.execute(state, context)

    expect(result.awaitingApproval).toBe(false)
    expect(result.approvalRequest).toBeUndefined()
    const lastApproval = result.metadata.lastApproval as ApprovalResult
    expect(lastApproval.approved).toBe(true)
  })

  it('updates state with denial result (approved: false)', async () => {
    const waitForApproval = vi.fn(
      async (): Promise<ApprovalResult> => ({
        approved: false,
        reason: 'User denied',
      }),
    )
    const state = createApprovalState()
    const context = createTestContext({ waitForApproval })
    const node = createHitlNode()

    const result = await node.execute(state, context)

    expect(result.awaitingApproval).toBe(false)
    const lastApproval = result.metadata.lastApproval as ApprovalResult
    expect(lastApproval.approved).toBe(false)
    expect(lastApproval.reason).toBe('User denied')
  })

  it('clears awaitingApproval and approvalRequest after completion', async () => {
    const waitForApproval = vi.fn(
      async (): Promise<ApprovalResult> => ({ approved: true }),
    )
    const state = createApprovalState()
    const context = createTestContext({ waitForApproval })
    const node = createHitlNode()

    const result = await node.execute(state, context)

    expect(result.awaitingApproval).toBe(false)
    expect(result.approvalRequest).toBeUndefined()
  })

  it('stores approval result in state.metadata', async () => {
    const approval: ApprovalResult = { approved: true, reason: 'Looks good' }
    const waitForApproval = vi.fn(async () => approval)
    const state = createApprovalState({
      metadata: { existingKey: 'preserved' },
    })
    const context = createTestContext({ waitForApproval })
    const node = createHitlNode()

    const result = await node.execute(state, context)

    expect(result.metadata.lastApproval).toEqual(approval)
    expect(result.metadata.existingKey).toBe('preserved')
  })

  it('emits hitl:response event after approval', async () => {
    const waitForApproval = vi.fn(
      async (): Promise<ApprovalResult> => ({ approved: true }),
    )
    const state = createApprovalState()
    const context = createTestContext({ waitForApproval })
    const node = createHitlNode()

    await node.execute(state, context)

    const emitCalls = (context.emitter.emit as ReturnType<typeof vi.fn>).mock
      .calls
    const responseEvent = emitCalls.find(
      ([e]: [AgentEvent]) => e.type === 'edgekit:hitl:response',
    )

    expect(responseEvent).toBeDefined()
    const event = responseEvent![0] as AgentEvent & {
      checkpointId: string
      approved: boolean
    }
    expect(event.type).toBe('edgekit:hitl:response')
    expect(event.approved).toBe(true)
    expect(event.runId).toBe('test-run')
  })

  it('auto-approves when waitForApproval is not provided in context', async () => {
    const state = createApprovalState()
    const context = createTestContext()
    const node = createHitlNode()

    const result = await node.execute(state, context)

    expect(result.awaitingApproval).toBe(false)
    const lastApproval = result.metadata.lastApproval as ApprovalResult
    expect(lastApproval.approved).toBe(true)
  })

  it('handles timeout and treats as denial', async () => {
    vi.useFakeTimers()

    const neverResolve = vi.fn(
      () => new Promise<ApprovalResult>(() => {}),
    )
    const state = createApprovalState()
    const context = createTestContext({ waitForApproval: neverResolve })
    const node = createHitlNode({ timeoutMs: 5000 })

    const executePromise = node.execute(state, context)

    await vi.advanceTimersByTimeAsync(5000)

    const result = await executePromise

    expect(result.awaitingApproval).toBe(false)
    const lastApproval = result.metadata.lastApproval as ApprovalResult
    expect(lastApproval.approved).toBe(false)
    expect(lastApproval.reason).toBe('Approval timed out')

    vi.useRealTimers()
  })

  it('has error policy set to halt', () => {
    const node = createHitlNode()

    expect(node.errorPolicy).toEqual({ onError: 'halt' })
  })

  it('does not mutate original state', async () => {
    const waitForApproval = vi.fn(
      async (): Promise<ApprovalResult> => ({ approved: true }),
    )
    const state = createApprovalState({
      metadata: { existing: 'value' },
    })
    const originalMetadata = state.metadata
    const context = createTestContext({ waitForApproval })
    const node = createHitlNode()

    const result = await node.execute(state, context)

    expect(state.awaitingApproval).toBe(true)
    expect(state.approvalRequest).toBeDefined()
    expect(state.metadata).toBe(originalMetadata)
    expect(result).not.toBe(state)
  })

  it('throws when abort signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    const state = createApprovalState()
    const context = createTestContext({ signal: controller.signal })
    const node = createHitlNode()

    await expect(node.execute(state, context)).rejects.toThrow('HITL aborted')
  })

  it('rejects when abort signal fires during wait', async () => {
    const controller = new AbortController()
    const waitForApproval = vi.fn(
      () => new Promise<ApprovalResult>(() => {}),
    )
    const state = createApprovalState()
    const context = createTestContext({
      signal: controller.signal,
      waitForApproval,
    })
    const node = createHitlNode()

    const executePromise = node.execute(state, context)
    controller.abort()

    await expect(executePromise).rejects.toThrow('HITL aborted')
  })

  it('uses default description when approvalRequest has none', async () => {
    const waitForApproval = vi.fn(
      async (): Promise<ApprovalResult> => ({ approved: true }),
    )
    const state = createTestState({
      awaitingApproval: true,
      approvalRequest: undefined,
    })
    const context = createTestContext({ waitForApproval })
    const node = createHitlNode()

    await node.execute(state, context)

    const emitCalls = (context.emitter.emit as ReturnType<typeof vi.fn>).mock
      .calls
    const requestEvent = emitCalls.find(
      ([e]: [AgentEvent]) => e.type === 'edgekit:hitl:request',
    )
    const event = requestEvent![0] as AgentEvent & { description: string }
    expect(event.description).toBe('Approval required')
  })

  it('emits request before response in correct order', async () => {
    const eventTypes: string[] = []
    const emitFn = vi.fn((event: AgentEvent) => {
      eventTypes.push(event.type)
    })
    const waitForApproval = vi.fn(
      async (): Promise<ApprovalResult> => ({ approved: false }),
    )
    const state = createApprovalState()
    const context = createTestContext({ waitForApproval })
    ;(context as { emitter: { emit: typeof emitFn } }).emitter.emit = emitFn
    const node = createHitlNode()

    await node.execute(state, context)

    expect(eventTypes).toEqual([
      'edgekit:hitl:request',
      'edgekit:hitl:response',
    ])
  })
})
