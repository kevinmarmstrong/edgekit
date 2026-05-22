import { describe, it, expect } from 'vitest'
import { cosineSimilarity } from './index.js'

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
