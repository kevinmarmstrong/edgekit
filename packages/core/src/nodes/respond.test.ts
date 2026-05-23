import { describe, it, expect } from 'vitest'
import { createRespondNode, type RespondNodeConfig } from './respond.js'
import { createInitialState, updateState, type AgentState } from '../graph/state.js'
import { createEventEmitter } from '../events/emitter.js'
import type { NodeContext, AgentConfig } from '../graph/node.js'
import type { AgentEvent } from '../events/types.js'
import type { Message } from '../types.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTestState(messages: readonly Message[]): AgentState {
  const base = createInitialState({
    runId: 'test-run',
    modelId: 'test-model',
    downloadPolicy: 'auto',
  })
  return updateState(base, { messages })
}

function createTestContext(): NodeContext {
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
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createRespondNode', () => {
  it('returns state unchanged when no assistant message', async () => {
    const context = createTestContext()
    const state = createTestState([
      { role: 'user', content: 'Hello' },
    ])

    const node = createRespondNode()
    const result = await node.execute(state, context)

    // Same reference because early return
    expect(result).toBe(state)
  })

  it('passes validation for clean responses', async () => {
    const context = createTestContext()
    const state = createTestState([
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello! How can I help?' },
    ])

    const node = createRespondNode()
    const result = await node.execute(state, context)

    expect(result.outputValidation?.valid).toBe(true)
    // Message content should be unchanged
    const assistantMsg = result.messages.find((m) => m.role === 'assistant')
    expect(assistantMsg?.content).toBe('Hello! How can I help?')
  })

  it('blocks responses matching blockedPatterns', async () => {
    const context = createTestContext()
    const state = createTestState([
      { role: 'user', content: 'Tell me secrets' },
      { role: 'assistant', content: 'The secret API key is abc123' },
    ])

    const config: RespondNodeConfig = {
      blockedPatterns: [/API key/i],
    }
    const node = createRespondNode(config)
    const result = await node.execute(state, context)

    expect(result.outputValidation?.valid).toBe(false)
    expect(result.outputValidation?.reason).toBe('Blocked pattern matched')
    expect(result.outputValidation?.blockedPattern).toBeDefined()
  })

  it('replaces blocked responses with fallback message', async () => {
    const context = createTestContext()
    const state = createTestState([
      { role: 'user', content: 'Give me secrets' },
      { role: 'assistant', content: 'Here is a secret password' },
    ])

    const config: RespondNodeConfig = {
      blockedPatterns: [/secret/i],
      fallbackMessage: 'I cannot share that information.',
    }
    const node = createRespondNode(config)
    const result = await node.execute(state, context)

    const assistantMsg = result.messages.find((m) => m.role === 'assistant')
    expect(assistantMsg?.content).toBe('I cannot share that information.')
  })

  it('uses default fallback message when none configured', async () => {
    const context = createTestContext()
    const state = createTestState([
      { role: 'user', content: 'Give me secrets' },
      { role: 'assistant', content: 'Here is a secret password' },
    ])

    const config: RespondNodeConfig = {
      blockedPatterns: [/secret/i],
    }
    const node = createRespondNode(config)
    const result = await node.execute(state, context)

    const assistantMsg = result.messages.find((m) => m.role === 'assistant')
    expect(assistantMsg?.content).toBe(
      "I'm sorry, I couldn't generate a valid response.",
    )
  })

  it('enforces maxResponseLength', async () => {
    const context = createTestContext()
    const longContent = 'x'.repeat(200)
    const state = createTestState([
      { role: 'user', content: 'Write something long' },
      { role: 'assistant', content: longContent },
    ])

    const config: RespondNodeConfig = {
      maxResponseLength: 100,
      fallbackMessage: 'Response too long.',
    }
    const node = createRespondNode(config)
    const result = await node.execute(state, context)

    expect(result.outputValidation?.valid).toBe(false)
    expect(result.outputValidation?.reason).toContain('max length')
    const assistantMsg = result.messages.find((m) => m.role === 'assistant')
    expect(assistantMsg?.content).toBe('Response too long.')
  })

  it('emits state:snapshot event', async () => {
    const events: AgentEvent[] = []
    const context = createTestContext()
    context.emitter.on((evt) => events.push(evt))

    const state = createTestState([
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello!' },
    ])

    const node = createRespondNode()
    await node.execute(state, context)

    const snapshot = events.find((e) => e.type === 'state:snapshot')
    expect(snapshot).toBeDefined()
    expect(snapshot?.type).toBe('state:snapshot')
    if (snapshot?.type === 'state:snapshot') {
      expect(snapshot.runId).toBe('test-run')
    }
  })

  it('does not mutate the original state', async () => {
    const context = createTestContext()
    const state = createTestState([
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Secret password here' },
    ])
    const originalMessages = state.messages

    const config: RespondNodeConfig = {
      blockedPatterns: [/Secret/],
      fallbackMessage: 'Blocked.',
    }
    const node = createRespondNode(config)
    await node.execute(state, context)

    expect(state.messages).toBe(originalMessages)
    expect(state.messages[1]?.content).toBe('Secret password here')
    expect(state.outputValidation).toBeUndefined()
  })

  it('validates last assistant message when multiple exist', async () => {
    const context = createTestContext()
    const state = createTestState([
      { role: 'user', content: 'Q1' },
      { role: 'assistant', content: 'Safe answer' },
      { role: 'user', content: 'Q2' },
      { role: 'assistant', content: 'Secret response' },
    ])

    const config: RespondNodeConfig = {
      blockedPatterns: [/Secret/i],
      fallbackMessage: 'Blocked.',
    }
    const node = createRespondNode(config)
    const result = await node.execute(state, context)

    // Last assistant message should be replaced
    expect(result.messages[3]?.content).toBe('Blocked.')
    // First assistant message should remain untouched
    expect(result.messages[1]?.content).toBe('Safe answer')
  })

  it('allows responses within maxResponseLength', async () => {
    const context = createTestContext()
    const state = createTestState([
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Short' },
    ])

    const config: RespondNodeConfig = {
      maxResponseLength: 100,
    }
    const node = createRespondNode(config)
    const result = await node.execute(state, context)

    expect(result.outputValidation?.valid).toBe(true)
    const assistantMsg = result.messages.find((m) => m.role === 'assistant')
    expect(assistantMsg?.content).toBe('Short')
  })
})
