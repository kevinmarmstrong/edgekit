import { describe, it, expect, vi } from 'vitest'
import { defineAgent } from './agent.js'
import type { AgentDefinition, Agent } from './agent.js'
import type { ModelProvider } from './providers.js'
import type { GenerateChunk } from './types.js'
import type { AgentEvent } from './events/types.js'
import type { GraphNode } from './graph/node.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockModel(
  chunks?: readonly GenerateChunk[],
): ModelProvider {
  const defaultChunks: readonly GenerateChunk[] = [
    { type: 'text', text: 'Hello ' },
    { type: 'text', text: 'world!' },
  ]
  const yielded = chunks ?? defaultChunks

  return {
    id: 'test-model',
    init: vi.fn(async () => {}),
    generate: vi.fn(async function* () {
      for (const chunk of yielded) {
        yield chunk
      }
    }),
    generateStructured: vi.fn(async () => ({}) as never),
    capabilities: vi.fn(() => ({
      maxTokens: 4096,
      supportsToolCalling: false,
      supportsStreaming: true,
      modelId: 'test',
    })),
    dispose: vi.fn(async () => {}),
  }
}

function createMinimalDefinition(
  overrides?: Partial<AgentDefinition>,
): AgentDefinition {
  return {
    name: 'test-agent',
    description: 'A test agent',
    ...overrides,
  }
}

async function collectTokens(iterable: AsyncIterable<string>): Promise<readonly string[]> {
  const tokens: string[] = []
  for await (const token of iterable) {
    tokens.push(token)
  }
  return tokens
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('defineAgent', () => {
  it('creates an agent with just name and description (defaults)', () => {
    const agent = defineAgent(createMinimalDefinition())

    expect(agent.name).toBe('test-agent')
    expect(agent.description).toBe('A test agent')
    expect(agent.version).toBe('1.0.0')
  })

  it('version defaults to 1.0.0', () => {
    const agent = defineAgent(createMinimalDefinition())
    expect(agent.version).toBe('1.0.0')
  })

  it('accepts a custom version', () => {
    const agent = defineAgent(createMinimalDefinition({ version: '2.3.1' }))
    expect(agent.version).toBe('2.3.1')
  })

  it('creates an agent with custom system prompt', () => {
    const agent = defineAgent(
      createMinimalDefinition({
        systemPrompt: 'You are a pirate.',
        model: createMockModel(),
      }),
    )

    expect(agent.name).toBe('test-agent')

    // System prompt is reflected in conversation state
    const convo = agent.getConversation()
    const systemMsg = convo.messages.find((m) => m.role === 'system')
    expect(systemMsg?.content).toBe('You are a pirate.')
  })

  it('creates an agent with tools', () => {
    const tools = [
      {
        name: 'search',
        description: 'Search the web',
        parameters: { query: { type: 'string' } },
      },
    ] as const

    const agent = defineAgent(
      createMinimalDefinition({
        tools,
        model: createMockModel(),
      }),
    )

    expect(agent.name).toBe('test-agent')
    // Agent should be created without errors
    expect(agent.query).toBeDefined()
  })

  it('query() yields text tokens', async () => {
    const model = createMockModel([
      { type: 'text', text: 'Hi ' },
      { type: 'text', text: 'there!' },
    ])
    const agent = defineAgent(
      createMinimalDefinition({
        model,
        downloadPolicy: 'auto',
      }),
    )

    const tokens = await collectTokens(agent.query('Hello'))

    expect(tokens.length).toBeGreaterThan(0)
    const fullText = tokens.join('')
    expect(fullText).toContain('Hi ')
    expect(fullText).toContain('there!')

    await agent.dispose()
  })

  it('getConversation() tracks messages', async () => {
    const model = createMockModel()
    const agent = defineAgent(
      createMinimalDefinition({
        model,
        downloadPolicy: 'auto',
        systemPrompt: 'Test prompt',
      }),
    )

    const convoBefore = agent.getConversation()
    expect(convoBefore.turn).toBe(0)

    await collectTokens(agent.query('Hello'))

    const convoAfter = agent.getConversation()
    expect(convoAfter.turn).toBe(1)
    // Should have system + user + assistant messages at minimum
    expect(convoAfter.messages.length).toBeGreaterThanOrEqual(2)

    await agent.dispose()
  })

  it('clearConversation() resets state', async () => {
    const model = createMockModel()
    const agent = defineAgent(
      createMinimalDefinition({
        model,
        downloadPolicy: 'auto',
        systemPrompt: 'Custom system prompt',
      }),
    )

    await collectTokens(agent.query('Hello'))

    const convoBefore = agent.getConversation()
    expect(convoBefore.turn).toBeGreaterThan(0)

    agent.clearConversation()

    const convoAfter = agent.getConversation()
    expect(convoAfter.turn).toBe(0)
    // System prompt should be preserved
    const systemMsg = convoAfter.messages.find((m) => m.role === 'system')
    expect(systemMsg?.content).toBe('Custom system prompt')

    await agent.dispose()
  })

  it('on() subscribes to events', async () => {
    const model = createMockModel()
    const agent = defineAgent(
      createMinimalDefinition({
        model,
        downloadPolicy: 'auto',
      }),
    )

    const events: AgentEvent[] = []
    const unsub = agent.on((evt) => events.push(evt))

    await collectTokens(agent.query('Hello'))
    // Wait for events to flush
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(events.length).toBeGreaterThan(0)

    const eventTypes = events.map((e) => e.type)
    expect(eventTypes).toContain('run:started')
    expect(eventTypes).toContain('text:start')
    expect(eventTypes).toContain('text:content')

    unsub()
    await agent.dispose()
  })

  it('on() returns unsubscribe function that stops events', async () => {
    const model = createMockModel()
    const agent = defineAgent(
      createMinimalDefinition({
        model,
        downloadPolicy: 'auto',
      }),
    )

    const handler = vi.fn()
    const unsub = agent.on(handler)
    unsub()

    await collectTokens(agent.query('Hello'))
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(handler).not.toHaveBeenCalled()

    await agent.dispose()
  })

  it('dispose() cleans up resources', async () => {
    const model = createMockModel()
    const agent = defineAgent(
      createMinimalDefinition({ model }),
    )

    await agent.dispose()

    expect(model.dispose).toHaveBeenCalled()
  })

  it('dispose() cleans up model and rag', async () => {
    const model = createMockModel()
    const rag = {
      id: 'test-rag',
      init: vi.fn(async () => {}),
      retrieve: vi.fn(async () => []),
      dispose: vi.fn(async () => {}),
    }

    const agent = defineAgent(
      createMinimalDefinition({ model, rag }),
    )

    await agent.dispose()

    expect(model.dispose).toHaveBeenCalled()
    expect(rag.dispose).toHaveBeenCalled()
  })

  it('custom nodes can override defaults', async () => {
    const customExecute = vi.fn(async (state) => state)
    const customThinkNode: GraphNode = {
      id: 'think',
      execute: customExecute,
    }

    const agent = defineAgent(
      createMinimalDefinition({
        nodes: { think: customThinkNode },
        downloadPolicy: 'auto',
        model: createMockModel(),
      }),
    )

    await collectTokens(agent.query('Hello'))

    expect(customExecute).toHaveBeenCalled()

    await agent.dispose()
  })

  it('initModel() calls model.init()', async () => {
    const model = createMockModel()
    const agent = defineAgent(
      createMinimalDefinition({ model }),
    )

    await agent.initModel()

    expect(model.init).toHaveBeenCalled()

    await agent.dispose()
  })

  it('initModel() is a no-op when no model is provided', async () => {
    const agent = defineAgent(createMinimalDefinition())

    // Should not throw
    await agent.initModel()

    await agent.dispose()
  })

  it('onEvent callback receives events during query', async () => {
    const model = createMockModel()
    const onEvent = vi.fn()

    const agent = defineAgent(
      createMinimalDefinition({
        model,
        downloadPolicy: 'auto',
        onEvent,
      }),
    )

    await collectTokens(agent.query('Hello'))
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(onEvent).toHaveBeenCalled()

    const eventTypes = onEvent.mock.calls.map(
      (call: readonly [AgentEvent]) => call[0].type,
    )
    expect(eventTypes).toContain('run:started')

    await agent.dispose()
  })

  it('preserves readonly contract on returned agent', () => {
    const agent: Agent = defineAgent(createMinimalDefinition())

    // These properties should exist and be the correct types
    expect(typeof agent.name).toBe('string')
    expect(typeof agent.description).toBe('string')
    expect(typeof agent.version).toBe('string')
    expect(typeof agent.query).toBe('function')
    expect(typeof agent.getConversation).toBe('function')
    expect(typeof agent.clearConversation).toBe('function')
    expect(typeof agent.on).toBe('function')
    expect(typeof agent.initModel).toBe('function')
    expect(typeof agent.dispose).toBe('function')
  })

  it('accepts custom edges for custom flow control', () => {
    const customEdges: readonly GraphEdge[] = [
      ['input_guardrail', 'think'],
      ['think', 'respond'],
    ]

    const agent = defineAgent(
      createMinimalDefinition({
        edges: customEdges,
        model: createMockModel(),
      }),
    )

    expect(agent.name).toBe('test-agent')
    // Should create without errors
    expect(agent.query).toBeDefined()
  })

  it('accepts a custom entry node', () => {
    const agent = defineAgent(
      createMinimalDefinition({
        entryNode: 'route',
        model: createMockModel(),
      }),
    )

    expect(agent.name).toBe('test-agent')
  })

  it('supports guardrails config', () => {
    const agent = defineAgent(
      createMinimalDefinition({
        guardrails: {
          maxInputTokens: 100,
          maxOutputTokens: 200,
          blockedPatterns: [/badword/],
        },
        model: createMockModel(),
      }),
    )

    expect(agent.name).toBe('test-agent')
  })
})
