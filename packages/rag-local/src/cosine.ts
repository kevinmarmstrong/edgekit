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

export function cosineSimilarityFloat32(a: Float32Array, b: Float32Array): number {
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

export interface ScoredItem<T> {
  readonly item: T
  readonly score: number
}

export function topKByCosine<T>(
  query: readonly number[] | Float32Array,
  items: readonly T[],
  getEmbedding: (item: T) => readonly number[] | Float32Array,
  k: number,
): readonly ScoredItem<T>[] {
  const scored = items.map((item) => ({
    item,
    score: Array.isArray(query)
      ? cosineSimilarity(query, getEmbedding(item) as readonly number[])
      : cosineSimilarityFloat32(query as Float32Array, getEmbedding(item) as Float32Array),
  }))

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, k)
}
