import { describe, it, expect, vi } from 'vitest'
import { docsAgent } from './docs-agent.js'
import type { ModelProvider, RAGProvider, GenerateChunk, Chunk, Message, AgentEvent } from '@edgekit/core'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockModel(chunks?: readonly GenerateChunk[]): ModelProvider {
  const defaultChunks: readonly GenerateChunk[] = [
    { type: 'text', text: 'Based on the docs, ' },
    { type: 'text', text: 'here is the answer.' },
  ]

  return {
    id: 'test-model',
    init: vi.fn(async () => {}),
    generate: vi.fn(async function* () {
      for (const chunk of chunks ?? defaultChunks) {
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

function createMockRAG(chunks?: readonly Chunk[]): RAGProvider {
  const defaultChunks: readonly Chunk[] = [
    {
      id: '1',
      content: 'Getting started with edgekit is easy.',
      metadata: { source: 'getting-started.md', title: 'Getting Started' },
      score: 0.95,
    },
  ]
  return {
    id: 'test-rag',
    init: vi.fn(async () => {}),
    retrieve: vi.fn(async () => chunks ?? defaultChunks),
    dispose: vi.fn(async () => {}),
  }
}

async function collectTokens(iterable: AsyncIterable<string>): Promise<string[]> {
  const tokens: string[] = []
  for await (const token of iterable) {
    tokens.push(token)
  }
  return tokens
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('docsAgent', () => {
  it('creates an agent with default name', () => {
    const agent = docsAgent()
    expect(agent.name).toBe('docs-agent')
    expect(agent.description).toContain('Documentation')
  })

  it('creates an agent with custom name', () => {
    const agent = docsAgent({ name: 'my-docs' })
    expect(agent.name).toBe('my-docs')
  })

  it('has version 1.0.0', () => {
    const agent = docsAgent()
    expect(agent.version).toBe('1.0.0')
  })

  it('returns empty results before model init with downloadPolicy prompt', async () => {
    const agent = docsAgent({
      model: createMockModel(),
      downloadPolicy: 'prompt',
    })

    // downloadPolicy: prompt means model won't auto-init
    // but without a configured way to prompt, it just won't produce output
    const convo = agent.getConversation()
    expect(convo.turn).toBe(0)

    await agent.dispose()
  })

  it('query() yields text tokens with model', async () => {
    const model = createMockModel()
    const agent = docsAgent({
      model,
      downloadPolicy: 'auto',
    })

    const tokens = await collectTokens(agent.query('How do I install?'))
    const fullText = tokens.join('')
    expect(fullText).toContain('Based on the docs')

    await agent.dispose()
  })

  it('works with RAG and model together', async () => {
    const rag = createMockRAG()
    const model = createMockModel()
    const agent = docsAgent({
      model,
      rag,
      downloadPolicy: 'auto',
    })

    const tokens = await collectTokens(agent.query('How to get started?'))
    const fullText = tokens.join('')
    expect(fullText).toContain('Based on the docs')
    expect(rag.retrieve).toHaveBeenCalled()

    await agent.dispose()
  })

  it('getConversation tracks turn count', async () => {
    const agent = docsAgent({
      model: createMockModel(),
      downloadPolicy: 'auto',
    })

    expect(agent.getConversation().turn).toBe(0)

    await collectTokens(agent.query('First question'))
    expect(agent.getConversation().turn).toBe(1)

    await agent.dispose()
  })

  it('clearConversation resets state', async () => {
    const agent = docsAgent({
      model: createMockModel(),
      downloadPolicy: 'auto',
    })

    await collectTokens(agent.query('Hello'))
    expect(agent.getConversation().turn).toBe(1)

    agent.clearConversation()
    expect(agent.getConversation().turn).toBe(0)

    await agent.dispose()
  })

  it('preserves system prompt after clearConversation', async () => {
    const customPrompt = 'You are a test assistant.'
    const agent = docsAgent({
      model: createMockModel(),
      systemPrompt: customPrompt,
      downloadPolicy: 'auto',
    })

    await collectTokens(agent.query('Hello'))
    agent.clearConversation()

    const convo = agent.getConversation()
    const systemMsg = convo.messages.find((m: Message) => m.role === 'system')
    expect(systemMsg?.content).toBe(customPrompt)

    await agent.dispose()
  })

  it('on() subscribes to events', async () => {
    const events: string[] = []
    const agent = docsAgent({
      model: createMockModel(),
      downloadPolicy: 'auto',
    })

    const unsub = agent.on((event: AgentEvent) => {
      events.push(event.type)
    })

    await collectTokens(agent.query('Hello'))

    // Wait for events to flush
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(events.length).toBeGreaterThan(0)

    unsub()
    await agent.dispose()
  })

  it('dispose cleans up model and rag', async () => {
    const model = createMockModel()
    const rag = createMockRAG()
    const agent = docsAgent({ model, rag })

    await agent.dispose()

    expect(model.dispose).toHaveBeenCalled()
    expect(rag.dispose).toHaveBeenCalled()
  })

  it('uses default system prompt when none provided', () => {
    const agent = docsAgent()
    const convo = agent.getConversation()
    const systemMsg = convo.messages.find((m: Message) => m.role === 'system')
    expect(systemMsg?.content).toContain('documentation assistant')
  })

  it('onEvent callback receives events during query', async () => {
    const events: string[] = []
    const agent = docsAgent({
      model: createMockModel(),
      downloadPolicy: 'auto',
      onEvent: (event: AgentEvent) => events.push(event.type),
    })

    await collectTokens(agent.query('Hello'))
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(events.length).toBeGreaterThan(0)

    await agent.dispose()
  })
})
