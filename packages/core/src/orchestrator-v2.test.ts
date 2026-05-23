import { describe, it, expect, vi } from 'vitest'
import { createRuntimeV2 } from './orchestrator-v2.js'
import type { ModelProvider, RAGProvider, RuntimeConfig } from './providers.js'
import type { RuntimeEvent, GenerateChunk, Chunk } from './types.js'

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
    generate: vi.fn(async function* (_messages, _options) {
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

function createMockRAG(chunks?: readonly Chunk[]): RAGProvider {
  const defaultChunks: readonly Chunk[] = [
    { id: '1', content: 'Test content', metadata: { source: 'test.md', title: 'Test Doc' }, score: 0.95 },
  ]
  return {
    id: 'test-rag',
    init: vi.fn(async () => {}),
    retrieve: vi.fn(async (_query: string, _topK?: number) => chunks ?? defaultChunks),
    dispose: vi.fn(async () => {}),
  }
}

function createTestConfig(overrides?: Partial<RuntimeConfig>): RuntimeConfig {
  return {
    model: createMockModel(),
    downloadPolicy: 'auto',
    systemPrompt: 'You are a helpful assistant.',
    ...overrides,
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

describe('createRuntimeV2', () => {
  it('query() yields text tokens matching v1 API', async () => {
    const config = createTestConfig()
    const runtime = createRuntimeV2(config)

    const tokens = await collectTokens(runtime.query('Hello'))

    expect(tokens.length).toBeGreaterThan(0)
    const fullText = tokens.join('')
    expect(fullText).toContain('Hello ')
    expect(fullText).toContain('world!')

    await runtime.dispose()
  })

  it('emits legacy RuntimeEvent types (generation:start, generation:token, generation:complete)', async () => {
    const events: RuntimeEvent[] = []
    const config = createTestConfig()
    const runtime = createRuntimeV2(config)

    runtime.on((evt) => events.push(evt))

    await collectTokens(runtime.query('Hi'))

    // Wait a tick for events to flush
    await new Promise((resolve) => setTimeout(resolve, 100))

    const eventTypes = events.map((e) => e.type)
    expect(eventTypes).toContain('generation:start')
    expect(eventTypes).toContain('generation:complete')

    // generation:token events should also be emitted
    const tokenEvents = events.filter((e) => e.type === 'generation:token')
    expect(tokenEvents.length).toBeGreaterThan(0)

    await runtime.dispose()
  })

  it('emits retrieval:complete with chunks when RAG is configured', async () => {
    const events: RuntimeEvent[] = []
    const mockRAG = createMockRAG()
    const config = createTestConfig({ rag: mockRAG })
    const runtime = createRuntimeV2(config)

    runtime.on((evt) => events.push(evt))

    await collectTokens(runtime.query('What is this?'))

    // Wait a tick for events to flush
    await new Promise((resolve) => setTimeout(resolve, 100))

    const retrievalEvents = events.filter((e) => e.type === 'retrieval:complete')
    expect(retrievalEvents.length).toBeGreaterThan(0)

    // The final retrieval:complete event carries the actual chunks from final state
    const withChunks = retrievalEvents.find(
      (e) => e.type === 'retrieval:complete' && e.chunks.length > 0,
    )
    expect(withChunks).toBeDefined()
    if (withChunks?.type === 'retrieval:complete') {
      expect(withChunks.chunks[0]!.content).toBe('Test content')
    }

    await runtime.dispose()
  })

  it('RAG-only fallback works when model not available (downloadPolicy: never)', async () => {
    const mockRAG = createMockRAG([
      { id: '1', content: 'Found info', metadata: { source: 'kb.md', title: 'KB' }, score: 0.9 },
    ])
    const config = createTestConfig({
      rag: mockRAG,
      downloadPolicy: 'never',
    })
    const runtime = createRuntimeV2(config)

    const tokens = await collectTokens(runtime.query('Find something'))

    const fullText = tokens.join('')
    expect(fullText).toContain('Found info')
    expect(fullText).toContain('model not yet available')

    await runtime.dispose()
  })

  it('clearConversation resets state', async () => {
    const config = createTestConfig()
    const runtime = createRuntimeV2(config)

    // Run a query first
    await collectTokens(runtime.query('Hello'))

    const convoBeforeClear = runtime.getConversation()
    expect(convoBeforeClear.turn).toBeGreaterThan(0)
    expect(convoBeforeClear.messages.length).toBeGreaterThan(0)

    runtime.clearConversation()

    const convoAfterClear = runtime.getConversation()
    expect(convoAfterClear.turn).toBe(0)

    await runtime.dispose()
  })

  it('getConversation returns messages and turn count', async () => {
    const config = createTestConfig()
    const runtime = createRuntimeV2(config)

    const convoBefore = runtime.getConversation()
    expect(convoBefore.messages).toBeDefined()
    expect(convoBefore.turn).toBe(0)

    await collectTokens(runtime.query('Hi'))

    const convoAfter = runtime.getConversation()
    expect(convoAfter.turn).toBe(1)
    // Should have system + user + assistant messages
    expect(convoAfter.messages.length).toBeGreaterThanOrEqual(2)

    await runtime.dispose()
  })

  it('on() returns unsubscribe function', async () => {
    const config = createTestConfig()
    const runtime = createRuntimeV2(config)
    const handler = vi.fn()

    const unsub = runtime.on(handler)
    unsub()

    await collectTokens(runtime.query('Hello'))

    // Handler should not have been called after unsubscribe
    expect(handler).not.toHaveBeenCalled()

    await runtime.dispose()
  })

  it('validates input and does not query with empty string', async () => {
    const config = createTestConfig({
      guardrails: { blockedPatterns: [] },
    })
    const runtime = createRuntimeV2(config)

    const tokens = await collectTokens(runtime.query('   '))

    // Empty input should yield nothing
    expect(tokens).toEqual([])

    await runtime.dispose()
  })

  it('dispose calls model and rag dispose', async () => {
    const model = createMockModel()
    const rag = createMockRAG()
    const config = createTestConfig({ model, rag })
    const runtime = createRuntimeV2(config)

    await runtime.dispose()

    expect(model.dispose).toHaveBeenCalled()
    expect(rag.dispose).toHaveBeenCalled()
  })

  it('produces no output when downloadPolicy is never and no RAG', async () => {
    const config = createTestConfig({
      downloadPolicy: 'never',
      // no RAG
    })
    const runtime = createRuntimeV2(config)

    const tokens = await collectTokens(runtime.query('Hello'))

    expect(tokens).toEqual([])

    await runtime.dispose()
  })

  it('clearConversation preserves system prompt on reset', async () => {
    const config = createTestConfig({
      systemPrompt: 'Custom prompt',
    })
    const runtime = createRuntimeV2(config)

    await collectTokens(runtime.query('Hello'))
    runtime.clearConversation()

    const convo = runtime.getConversation()
    const systemMsg = convo.messages.find((m) => m.role === 'system')
    expect(systemMsg?.content).toBe('Custom prompt')

    await runtime.dispose()
  })
})
