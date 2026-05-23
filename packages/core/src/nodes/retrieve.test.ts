import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRetrieveNode, type RetrieveNodeConfig } from './retrieve.js'
import { createInitialState, updateState, type AgentState } from '../graph/state.js'
import { createEventEmitter } from '../events/emitter.js'
import type { NodeContext, AgentConfig } from '../graph/node.js'
import type { RAGProvider } from '../providers.js'
import type { AgentEvent } from '../events/types.js'
import type { Chunk } from '../types.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTestState(messages?: AgentState['messages']): AgentState {
  const base = createInitialState({
    runId: 'test-run',
    modelId: 'test-model',
    downloadPolicy: 'auto',
  })
  if (messages) {
    return updateState(base, { messages })
  }
  return base
}

function createMockRAG(chunks?: readonly Chunk[]): RAGProvider {
  const defaultChunks: readonly Chunk[] = [
    { id: '1', content: 'Test content', metadata: { source: 'test.md', title: 'Test' }, score: 0.95 },
    { id: '2', content: 'Another chunk', metadata: { source: 'other.md', title: 'Other' }, score: 0.85 },
  ]
  return {
    id: 'test-rag',
    init: vi.fn(async () => {}),
    retrieve: vi.fn(async (_query: string, _topK?: number) => chunks ?? defaultChunks),
    dispose: vi.fn(async () => {}),
  }
}

function createTestContext(rag?: RAGProvider): NodeContext {
  const config: AgentConfig = {
    maxIterations: 20,
    tracing: true,
    downloadPolicy: 'auto',
  }
  return {
    emitter: createEventEmitter(),
    signal: new AbortController().signal,
    tools: [],
    rag,
    config,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createRetrieveNode', () => {
  it('calls RAG provider and stores chunks in state', async () => {
    const mockRAG = createMockRAG()
    const context = createTestContext(mockRAG)
    const state = createTestState([
      { role: 'user', content: 'What is TypeScript?' },
    ])

    const node = createRetrieveNode()
    const result = await node.execute(state, context)

    expect(mockRAG.retrieve).toHaveBeenCalledWith('What is TypeScript?', 5)
    expect(result.retrievedChunks).toHaveLength(2)
    expect(result.retrievedChunks[0]!.content).toBe('Test content')
    expect(result.retrievedChunks[1]!.content).toBe('Another chunk')
  })

  it('emits retrieval:start and retrieval:complete events', async () => {
    const events: AgentEvent[] = []
    const mockRAG = createMockRAG()
    const context = createTestContext(mockRAG)
    context.emitter.on((evt) => events.push(evt))

    const state = createTestState([
      { role: 'user', content: 'hello' },
    ])

    const node = createRetrieveNode()
    await node.execute(state, context)

    const startEvent = events.find((e) => e.type === 'edgekit:retrieval:start')
    const completeEvent = events.find((e) => e.type === 'edgekit:retrieval:complete')

    expect(startEvent).toBeDefined()
    if (startEvent?.type === 'edgekit:retrieval:start') {
      expect(startEvent.query).toBe('hello')
      expect(startEvent.runId).toBe('test-run')
    }

    expect(completeEvent).toBeDefined()
    if (completeEvent?.type === 'edgekit:retrieval:complete') {
      expect(completeEvent.chunkCount).toBe(2)
    }
  })

  it('skips gracefully when no RAG provider', async () => {
    const context = createTestContext() // no RAG
    const state = createTestState([
      { role: 'user', content: 'hello' },
    ])

    const node = createRetrieveNode()
    const result = await node.execute(state, context)

    expect(result).toBe(state) // exact same reference returned
    expect(result.retrievedChunks).toEqual([])
  })

  it('skips when no user message in state', async () => {
    const mockRAG = createMockRAG()
    const context = createTestContext(mockRAG)
    const state = createTestState([
      { role: 'system', content: 'You are helpful.' },
    ])

    const node = createRetrieveNode()
    const result = await node.execute(state, context)

    expect(result).toBe(state)
    expect(mockRAG.retrieve).not.toHaveBeenCalled()
  })

  it('respects topK config', async () => {
    const mockRAG = createMockRAG()
    const context = createTestContext(mockRAG)
    const state = createTestState([
      { role: 'user', content: 'query' },
    ])

    const config: RetrieveNodeConfig = { topK: 10 }
    const node = createRetrieveNode(config)
    await node.execute(state, context)

    expect(mockRAG.retrieve).toHaveBeenCalledWith('query', 10)
  })

  it('filters chunks below scoreThreshold', async () => {
    const chunks: readonly Chunk[] = [
      { id: '1', content: 'High quality', metadata: { source: 'a.md' }, score: 0.95 },
      { id: '2', content: 'Medium quality', metadata: { source: 'b.md' }, score: 0.5 },
      { id: '3', content: 'Low quality', metadata: { source: 'c.md' }, score: 0.1 },
    ]
    const mockRAG = createMockRAG(chunks)
    const context = createTestContext(mockRAG)
    const state = createTestState([
      { role: 'user', content: 'query' },
    ])

    const config: RetrieveNodeConfig = { scoreThreshold: 0.6 }
    const node = createRetrieveNode(config)
    const result = await node.execute(state, context)

    expect(result.retrievedChunks).toHaveLength(1)
    expect(result.retrievedChunks[0]!.content).toBe('High quality')
  })

  it('does not mutate the original state', async () => {
    const mockRAG = createMockRAG()
    const context = createTestContext(mockRAG)
    const state = createTestState([
      { role: 'user', content: 'query' },
    ])
    const originalChunks = state.retrievedChunks

    const node = createRetrieveNode()
    await node.execute(state, context)

    expect(state.retrievedChunks).toBe(originalChunks)
    expect(state.retrievedChunks).toEqual([])
  })

  it('uses last user message when multiple messages present', async () => {
    const mockRAG = createMockRAG()
    const context = createTestContext(mockRAG)
    const state = createTestState([
      { role: 'system', content: 'System prompt' },
      { role: 'user', content: 'First question' },
      { role: 'assistant', content: 'First answer' },
      { role: 'user', content: 'Second question' },
    ])

    const node = createRetrieveNode()
    await node.execute(state, context)

    expect(mockRAG.retrieve).toHaveBeenCalledWith('Second question', 5)
  })

  it('has error policy set to skip', () => {
    const node = createRetrieveNode()
    expect(node.errorPolicy).toEqual({ onError: 'skip' })
  })
})
