import { describe, it, expect } from 'vitest'
import { cosineSimilarity, cosineSimilarityFloat32, topKByCosine } from './cosine.js'

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1.0)
  })

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0.0)
  })

  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1.0)
  })

  it('returns 0 when either vector is zero', () => {
    expect(cosineSimilarity([0, 0], [1, 2])).toBe(0)
    expect(cosineSimilarity([1, 2], [0, 0])).toBe(0)
  })

  it('handles high-dimensional vectors', () => {
    const a = Array.from({ length: 384 }, (_, i) => Math.sin(i))
    const b = Array.from({ length: 384 }, (_, i) => Math.cos(i))
    const sim = cosineSimilarity(a, b)
    expect(sim).toBeGreaterThan(-1)
    expect(sim).toBeLessThan(1)
  })
})

describe('cosineSimilarityFloat32', () => {
  it('matches regular cosine for same input', () => {
    const a = [0.5, 0.3, 0.8]
    const b = [0.2, 0.9, 0.1]
    const regular = cosineSimilarity(a, b)
    const float32 = cosineSimilarityFloat32(
      new Float32Array(a),
      new Float32Array(b),
    )
    expect(float32).toBeCloseTo(regular, 5)
  })
})

describe('topKByCosine', () => {
  const items = [
    { id: 'a', vec: [1, 0, 0] },
    { id: 'b', vec: [0, 1, 0] },
    { id: 'c', vec: [0.9, 0.1, 0] },
    { id: 'd', vec: [0, 0, 1] },
  ]

  it('returns top K items by similarity', () => {
    const results = topKByCosine([1, 0, 0], items, (i) => i.vec, 2)
    expect(results).toHaveLength(2)
    expect(results[0]!.item.id).toBe('a')
    expect(results[1]!.item.id).toBe('c')
  })

  it('returns all items when K > items.length', () => {
    const results = topKByCosine([1, 0, 0], items, (i) => i.vec, 10)
    expect(results).toHaveLength(4)
  })

  it('scores are in descending order', () => {
    const results = topKByCosine([1, 0, 0], items, (i) => i.vec, 4)
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1]!.score).toBeGreaterThanOrEqual(results[i]!.score)
    }
  })
})
