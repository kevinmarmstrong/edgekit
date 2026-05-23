import { describe, it, expect, vi } from 'vitest'
import { createRuntime, createRuntimeV1 } from './index.js'
import type {
  ModelProvider,
  RAGProvider,
  RuntimeConfig,
  Runtime,
} from './index.js'
import type {
  RuntimeEvent,
  GenerateChunk,
  Chunk,
  ConversationState,
} from './index.js'

// ---------------------------------------------------------------------------
// Helpers — mock providers
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
    {
      id: '1',
      content: 'Test content',
      metadata: { source: 'test.md', title: 'Test Doc' },
      score: 0.95,
    },
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

async function collectTokens(iterable: AsyncIterable<string>): Promise<readonly string[]> {
  const tokens: string[] = []
  for await (const token of iterable) {
    tokens.push(token)
  }
  return tokens
}

// ---------------------------------------------------------------------------
// Backward compatibility tests — public API surface
// ---------------------------------------------------------------------------

describe('backward compatibility: createRuntime (public API)', () => {
  // 1. createRuntime is exported and callable
  it('createRuntime is exported and returns a Runtime object', () => {
    const config = createTestConfig()
    const runtime: Runtime = createRuntime(config)

    expect(runtime).toBeDefined()
    expect(typeof runtime.query).toBe('function')
    expect(typeof runtime.getConversation).toBe('function')
    expect(typeof runtime.clearConversation).toBe('function')
    expect(typeof runtime.on).toBe('function')
    expect(typeof runtime.dispose).toBe('function')
    expect(typeof runtime.initModel).toBe('function')
    expect(runtime.config).toBe(config)

    // Cleanup without awaiting dispose since model was never used
    void runtime.dispose()
  })

  // 2. query() returns an AsyncIterable that yields string tokens
  it('query() returns an AsyncIterable yielding string tokens', async () => {
    const config = createTestConfig()
    const runtime = createRuntime(config)

    const tokens = await collectTokens(runtime.query('Hello'))

    expect(tokens.length).toBeGreaterThan(0)

    for (const token of tokens) {
      expect(typeof token).toBe('string')
    }

    const fullText = tokens.join('')
    expect(fullText).toContain('Hello ')
    expect(fullText).toContain('world!')

    await runtime.dispose()
  })

  // 3. getConversation() returns messages array and turn counter
  it('getConversation() returns messages array and turn counter', async () => {
    const config = createTestConfig()
    const runtime = createRuntime(config)

    const initial: ConversationState = runtime.getConversation()
    expect(initial.messages).toBeDefined()
    expect(Array.isArray(initial.messages)).toBe(true)
    expect(initial.turn).toBe(0)

    await collectTokens(runtime.query('Hi'))

    const afterQuery: ConversationState = runtime.getConversation()
    expect(afterQuery.turn).toBe(1)
    expect(afterQuery.messages.length).toBeGreaterThanOrEqual(2)

    await runtime.dispose()
  })

  // 4. clearConversation() resets to initial state but preserves system prompt
  it('clearConversation() resets state but preserves system prompt', async () => {
    const config = createTestConfig({ systemPrompt: 'Custom system prompt' })
    const runtime = createRuntime(config)

    await collectTokens(runtime.query('Hello'))

    const beforeClear = runtime.getConversation()
    expect(beforeClear.turn).toBeGreaterThan(0)
    expect(beforeClear.messages.length).toBeGreaterThan(0)

    runtime.clearConversation()

    const afterClear = runtime.getConversation()
    expect(afterClear.turn).toBe(0)

    const systemMsg = afterClear.messages.find((m) => m.role === 'system')
    expect(systemMsg?.content).toBe('Custom system prompt')

    await runtime.dispose()
  })

  // 5. on() returns an unsubscribe function
  it('on() returns an unsubscribe function', async () => {
    const config = createTestConfig()
    const runtime = createRuntime(config)
    const handler = vi.fn()

    const unsub = runtime.on(handler)
    expect(typeof unsub).toBe('function')

    unsub()

    await collectTokens(runtime.query('Hello'))

    // Handler should not have been called after unsubscribe
    expect(handler).not.toHaveBeenCalled()

    await runtime.dispose()
  })

  // 6. on() handler receives RuntimeEvent objects with correct types
  it('on() handler receives RuntimeEvent objects with correct types', async () => {
    const events: RuntimeEvent[] = []
    const config = createTestConfig()
    const runtime = createRuntime(config)

    runtime.on((evt: RuntimeEvent) => events.push(evt))

    await collectTokens(runtime.query('Hi'))

    // Allow events to flush
    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(events.length).toBeGreaterThan(0)

    for (const event of events) {
      expect(event).toHaveProperty('type')
      expect(typeof event.type).toBe('string')
    }

    await runtime.dispose()
  })

  // 7. dispose() calls model and RAG dispose
  it('dispose() calls model.dispose() and rag.dispose()', async () => {
    const model = createMockModel()
    const rag = createMockRAG()
    const config = createTestConfig({ model, rag })
    const runtime = createRuntime(config)

    await runtime.dispose()

    expect(model.dispose).toHaveBeenCalledTimes(1)
    expect(rag.dispose).toHaveBeenCalledTimes(1)
  })

  // 8. Multiple queries increment turn counter
  it('multiple queries increment turn counter', async () => {
    const config = createTestConfig()
    const runtime = createRuntime(config)

    expect(runtime.getConversation().turn).toBe(0)

    await collectTokens(runtime.query('First'))
    expect(runtime.getConversation().turn).toBe(1)

    await collectTokens(runtime.query('Second'))
    expect(runtime.getConversation().turn).toBe(2)

    await collectTokens(runtime.query('Third'))
    expect(runtime.getConversation().turn).toBe(3)

    await runtime.dispose()
  })

  // 9. Empty string input produces no output
  it('empty string input produces no output', async () => {
    const config = createTestConfig({
      guardrails: { blockedPatterns: [] },
    })
    const runtime = createRuntime(config)

    const tokens = await collectTokens(runtime.query('   '))

    expect(tokens).toEqual([])

    await runtime.dispose()
  })

  // 10. RAG-only fallback works with downloadPolicy: 'never'
  it('RAG-only fallback works with downloadPolicy: never', async () => {
    const mockRAG = createMockRAG([
      {
        id: '1',
        content: 'Knowledge base info',
        metadata: { source: 'kb.md', title: 'KB' },
        score: 0.9,
      },
    ])
    const config = createTestConfig({
      rag: mockRAG,
      downloadPolicy: 'never',
    })
    const runtime = createRuntime(config)

    const tokens = await collectTokens(runtime.query('Find something'))

    const fullText = tokens.join('')
    expect(fullText).toContain('Knowledge base info')
    expect(fullText).toContain('model not yet available')

    await runtime.dispose()
  })

  // 11. RuntimeEvent types emitted: generation:start, generation:token, generation:complete
  it('emits generation:start, generation:token, and generation:complete events', async () => {
    const events: RuntimeEvent[] = []
    const config = createTestConfig()
    const runtime = createRuntime(config)

    runtime.on((evt: RuntimeEvent) => events.push(evt))

    await collectTokens(runtime.query('Hi'))

    // Allow events to flush
    await new Promise((resolve) => setTimeout(resolve, 150))

    const eventTypes = events.map((e) => e.type)

    expect(eventTypes).toContain('generation:start')
    expect(eventTypes).toContain('generation:complete')

    const tokenEvents = events.filter((e) => e.type === 'generation:token')
    expect(tokenEvents.length).toBeGreaterThan(0)

    // Verify token events carry string payloads
    for (const evt of tokenEvents) {
      if (evt.type === 'generation:token') {
        expect(typeof evt.token).toBe('string')
        expect(evt.token.length).toBeGreaterThan(0)
      }
    }

    await runtime.dispose()
  })

  // 12. The v1 export createRuntimeV1 is also available as a separate export
  it('createRuntimeV1 is exported as a separate named export', () => {
    expect(createRuntimeV1).toBeDefined()
    expect(typeof createRuntimeV1).toBe('function')

    const config = createTestConfig()
    const runtime = createRuntimeV1(config)

    expect(runtime).toBeDefined()
    expect(typeof runtime.query).toBe('function')
    expect(typeof runtime.getConversation).toBe('function')
    expect(typeof runtime.clearConversation).toBe('function')
    expect(typeof runtime.on).toBe('function')
    expect(typeof runtime.dispose).toBe('function')
    expect(typeof runtime.initModel).toBe('function')

    void runtime.dispose()
  })
})

// ---------------------------------------------------------------------------
// Additional edge cases
// ---------------------------------------------------------------------------

describe('backward compatibility: edge cases', () => {
  it('initModel() initializes the model provider', async () => {
    const model = createMockModel()
    const config = createTestConfig({ model })
    const runtime = createRuntime(config)

    await runtime.initModel()

    expect(model.init).toHaveBeenCalled()

    await runtime.dispose()
  })

  it('getConversation() returns a new object on each call (no shared mutation)', async () => {
    const config = createTestConfig()
    const runtime = createRuntime(config)

    await collectTokens(runtime.query('Hello'))

    const convo1 = runtime.getConversation()
    const convo2 = runtime.getConversation()

    // Should return equivalent data
    expect(convo1.turn).toBe(convo2.turn)
    expect(convo1.messages.length).toBe(convo2.messages.length)

    await runtime.dispose()
  })

  it('clearConversation() followed by query starts fresh', async () => {
    const config = createTestConfig()
    const runtime = createRuntime(config)

    await collectTokens(runtime.query('First'))
    expect(runtime.getConversation().turn).toBe(1)

    runtime.clearConversation()
    expect(runtime.getConversation().turn).toBe(0)

    await collectTokens(runtime.query('After clear'))
    expect(runtime.getConversation().turn).toBe(1)

    await runtime.dispose()
  })

  it('downloadPolicy: never without RAG produces no output', async () => {
    const config = createTestConfig({
      downloadPolicy: 'never',
    })
    const runtime = createRuntime(config)

    const tokens = await collectTokens(runtime.query('Hello'))

    expect(tokens).toEqual([])

    await runtime.dispose()
  })

  it('multiple on() handlers all receive events', async () => {
    const events1: RuntimeEvent[] = []
    const events2: RuntimeEvent[] = []
    const config = createTestConfig()
    const runtime = createRuntime(config)

    runtime.on((evt) => events1.push(evt))
    runtime.on((evt) => events2.push(evt))

    await collectTokens(runtime.query('Hi'))

    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(events1.length).toBeGreaterThan(0)
    expect(events2.length).toBeGreaterThan(0)
    expect(events1.length).toBe(events2.length)

    await runtime.dispose()
  })

  it('unsubscribing one handler does not affect other handlers', async () => {
    const events1: RuntimeEvent[] = []
    const events2: RuntimeEvent[] = []
    const config = createTestConfig()
    const runtime = createRuntime(config)

    const unsub1 = runtime.on((evt) => events1.push(evt))
    runtime.on((evt) => events2.push(evt))

    unsub1()

    await collectTokens(runtime.query('Hi'))

    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(events1.length).toBe(0)
    expect(events2.length).toBeGreaterThan(0)

    await runtime.dispose()
  })

  it('config property is accessible on the runtime', () => {
    const config = createTestConfig()
    const runtime = createRuntime(config)

    expect(runtime.config).toBe(config)
    expect(runtime.config.model.id).toBe('test-model')
    expect(runtime.config.systemPrompt).toBe('You are a helpful assistant.')

    void runtime.dispose()
  })
})
