import type { RAGProvider, Chunk, ContentIndex, IndexedChunk } from '@browser-chat-runtime/core'

export interface LocalRAGConfig {
  readonly indexUrl?: string
  readonly topK?: number
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
      void query
      void topK
      // TODO: Encode query → cosine similarity against chunks → return top K
      // This will run in a Web Worker for non-blocking search
      return chunks.slice(0, topK ?? defaultTopK).map((c) => ({
        id: c.id,
        content: c.content,
        metadata: c.metadata,
        score: 0,
      }))
    },

    async dispose() {
      chunks = []
    },
  }
}

export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    const ai = a[i]!
    const bi = b[i]!
    dot += ai * bi
    normA += ai * ai
    normB += bi * bi
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}
