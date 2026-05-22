import type {
  RAGProvider,
  Chunk,
  ContentIndex,
  IndexedChunk,
  EmbeddingProvider,
} from '@edgekit/core'
import { topKByCosine } from './cosine.js'
import { fetchContentIndex, getStoredHash, storeIndex, needsReload } from './index-loader.js'

export interface LocalRAGConfig {
  readonly indexUrl?: string
  readonly topK?: number
  readonly embeddings?: EmbeddingProvider
}

export function localRAG(config: LocalRAGConfig = {}): RAGProvider {
  let chunks: readonly IndexedChunk[] = []
  const defaultTopK = config.topK ?? 5

  return {
    id: 'rag-local',

    async init(index: ContentIndex) {
      chunks = index.chunks
    },

    async retrieve(query: string, topK?: number): Promise<readonly Chunk[]> {
      if (chunks.length === 0) return []

      const k = topK ?? defaultTopK

      if (config.embeddings) {
        const queryEmbedding = await config.embeddings.encode(query)
        const results = topKByCosine(
          queryEmbedding,
          chunks,
          (c) => new Float32Array(c.embedding),
          k,
        )
        return results.map(({ item, score }) => ({
          id: item.id,
          content: item.content,
          metadata: item.metadata,
          score,
        }))
      }

      // Fallback: keyword matching when no embedding provider
      return keywordSearch(query, chunks, k)
    },

    async dispose() {
      chunks = []
    },
  }
}

export async function loadAndInitRAG(
  provider: RAGProvider,
  indexUrl: string,
): Promise<{ readonly reloaded: boolean }> {
  const storedHash = await getStoredHash()
  const index = await fetchContentIndex(indexUrl)
  const reloaded = needsReload(storedHash, index.contentHash)

  if (reloaded) {
    await storeIndex(index)
  }

  await provider.init(index)
  return { reloaded }
}

function keywordSearch(
  query: string,
  chunks: readonly IndexedChunk[],
  topK: number,
): readonly Chunk[] {
  const queryLower = query.toLowerCase()
  const words = queryLower.split(/\s+/).filter((w) => w.length >= 3)

  const scored = chunks.map((chunk) => {
    const contentLower = chunk.content.toLowerCase()
    const titleLower = (chunk.metadata.title ?? '').toLowerCase()
    let score = 0
    for (const word of words) {
      if (contentLower.includes(word)) score += 1
      if (titleLower.includes(word)) score += 2
    }
    return { chunk, score }
  })

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .filter((s) => s.score > 0)
    .map(({ chunk, score }) => ({
      id: chunk.id,
      content: chunk.content,
      metadata: chunk.metadata,
      score,
    }))
}

export { cosineSimilarity, cosineSimilarityFloat32, topKByCosine } from './cosine.js'
export { fetchContentIndex, getStoredHash, storeIndex, needsReload } from './index-loader.js'
