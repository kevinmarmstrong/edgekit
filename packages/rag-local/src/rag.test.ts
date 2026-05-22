import { describe, it, expect } from 'vitest'
import { localRAG } from './index.js'
import type { ContentIndex } from '@browser-chat-runtime/core'

const testIndex: ContentIndex = {
  version: '0.1.0',
  contentHash: 'test-hash',
  metadata: {
    createdAt: '2026-01-01T00:00:00Z',
    embeddingModel: 'test',
    dimensions: 3,
    totalChunks: 3,
  },
  chunks: [
    {
      id: 'c1',
      content: 'WebGPU enables GPU computation in the browser',
      embedding: [1, 0, 0],
      metadata: { source: 'webgpu.md', title: 'WebGPU Guide' },
    },
    {
      id: 'c2',
      content: 'RAG combines retrieval with generation for better answers',
      embedding: [0, 1, 0],
      metadata: { source: 'rag.md', title: 'RAG Overview' },
    },
    {
      id: 'c3',
      content: 'Browser AI runs models locally without cloud costs',
      embedding: [0, 0, 1],
      metadata: { source: 'browser-ai.md', title: 'Browser AI' },
    },
  ],
}

describe('localRAG', () => {
  it('creates provider with correct id', () => {
    const rag = localRAG()
    expect(rag.id).toBe('rag-local')
  })

  it('returns empty results before init', async () => {
    const rag = localRAG()
    const results = await rag.retrieve('test')
    expect(results).toEqual([])
  })

  it('retrieves by keyword after init', async () => {
    const rag = localRAG()
    await rag.init(testIndex)

    const results = await rag.retrieve('WebGPU browser')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]!.content).toContain('WebGPU')
  })

  it('respects topK parameter', async () => {
    const rag = localRAG()
    await rag.init(testIndex)

    const results = await rag.retrieve('browser', 1)
    expect(results).toHaveLength(1)
  })

  it('respects default topK from config', async () => {
    const rag = localRAG({ topK: 2 })
    await rag.init(testIndex)

    const results = await rag.retrieve('browser')
    expect(results.length).toBeLessThanOrEqual(2)
  })

  it('returns chunks with scores', async () => {
    const rag = localRAG()
    await rag.init(testIndex)

    const results = await rag.retrieve('WebGPU')
    for (const r of results) {
      expect(r.score).toBeDefined()
      expect(typeof r.score).toBe('number')
    }
  })

  it('clears chunks on dispose', async () => {
    const rag = localRAG()
    await rag.init(testIndex)

    await rag.dispose()
    const results = await rag.retrieve('anything')
    expect(results).toEqual([])
  })
})
