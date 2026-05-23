import { describe, it, expect } from 'vitest'
import { createInitialState, updateState, type AgentState } from './state.js'

describe('createInitialState', () => {
  it('creates state with system prompt message', () => {
    const state = createInitialState({
      runId: 'run-1',
      modelId: 'test-model',
      downloadPolicy: 'auto',
      systemPrompt: 'You are a helpful assistant.',
    })

    expect(state.runId).toBe('run-1')
    expect(state.modelId).toBe('test-model')
    expect(state.downloadPolicy).toBe('auto')
    expect(state.messages).toHaveLength(1)
    expect(state.messages[0]).toEqual({
      role: 'system',
      content: 'You are a helpful assistant.',
    })
    expect(state.turn).toBe(0)
    expect(state.turnId).toBe('run-1-turn-0')
    expect(state.currentNode).toBe('input_guardrail')
    expect(state.pendingToolCalls).toEqual([])
    expect(state.toolResults).toEqual([])
    expect(state.retrievedChunks).toEqual([])
    expect(state.awaitingApproval).toBe(false)
    expect(state.routingConfidence).toBe(0)
    expect(state.steps).toEqual([])
    expect(state.metadata).toEqual({})
    expect(state.inferenceMode).toBe('local')
  })

  it('creates state without system prompt (empty messages)', () => {
    const state = createInitialState({
      runId: 'run-2',
      modelId: 'test-model',
      downloadPolicy: 'never',
    })

    expect(state.messages).toEqual([])
    expect(state.downloadPolicy).toBe('never')
  })

  it('sets startedAt to a recent timestamp', () => {
    const before = Date.now()
    const state = createInitialState({
      runId: 'run-3',
      modelId: 'test-model',
      downloadPolicy: 'prompt',
    })
    const after = Date.now()

    expect(state.startedAt).toBeGreaterThanOrEqual(before)
    expect(state.startedAt).toBeLessThanOrEqual(after)
  })
})

describe('updateState', () => {
  const baseState: AgentState = createInitialState({
    runId: 'run-base',
    modelId: 'test-model',
    downloadPolicy: 'auto',
    systemPrompt: 'Hello',
  })

  it('preserves unchanged fields (structural sharing)', () => {
    const updated = updateState(baseState, { turn: 5 })

    expect(updated.turn).toBe(5)
    // unchanged fields should be the same references
    expect(updated.messages).toBe(baseState.messages)
    expect(updated.pendingToolCalls).toBe(baseState.pendingToolCalls)
    expect(updated.steps).toBe(baseState.steps)
    expect(updated.metadata).toBe(baseState.metadata)
    expect(updated.runId).toBe(baseState.runId)
  })

  it('only replaces specified fields', () => {
    const updated = updateState(baseState, {
      currentNode: 'think',
      turn: 3,
    })

    expect(updated.currentNode).toBe('think')
    expect(updated.turn).toBe(3)
    // everything else unchanged
    expect(updated.runId).toBe(baseState.runId)
    expect(updated.modelId).toBe(baseState.modelId)
    expect(updated.downloadPolicy).toBe(baseState.downloadPolicy)
    expect(updated.messages).toBe(baseState.messages)
    expect(updated.inferenceMode).toBe(baseState.inferenceMode)
  })

  it('does not mutate the original state', () => {
    const originalTurn = baseState.turn
    const originalNode = baseState.currentNode

    updateState(baseState, { turn: 99, currentNode: 'respond' })

    expect(baseState.turn).toBe(originalTurn)
    expect(baseState.currentNode).toBe(originalNode)
  })

  it('returns a new object reference', () => {
    const updated = updateState(baseState, { turn: 1 })
    expect(updated).not.toBe(baseState)
  })

  it('handles updating messages array immutably', () => {
    const newMessages = [
      ...baseState.messages,
      { role: 'user' as const, content: 'test' },
    ]
    const updated = updateState(baseState, { messages: newMessages })

    expect(updated.messages).toHaveLength(2)
    expect(updated.messages[1]).toEqual({ role: 'user', content: 'test' })
    expect(baseState.messages).toHaveLength(1) // original unchanged
  })

  it('handles updating with empty partial (no changes)', () => {
    const updated = updateState(baseState, {})
    expect(updated).not.toBe(baseState) // new reference
    expect(updated.turn).toBe(baseState.turn)
    expect(updated.runId).toBe(baseState.runId)
  })

  it('replaces metadata without merging', () => {
    const stateWithMeta = updateState(baseState, {
      metadata: { key1: 'value1' },
    })
    const updated = updateState(stateWithMeta, {
      metadata: { key2: 'value2' },
    })

    expect(updated.metadata).toEqual({ key2: 'value2' })
    expect(stateWithMeta.metadata).toEqual({ key1: 'value1' })
  })
})
