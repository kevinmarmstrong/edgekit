import { describe, it, expect } from 'vitest'
import { needsReload } from './index-loader.js'

describe('needsReload', () => {
  it('returns true when stored hash is null', () => {
    expect(needsReload(null, 'abc123')).toBe(true)
  })

  it('returns true when hashes differ', () => {
    expect(needsReload('old-hash', 'new-hash')).toBe(true)
  })

  it('returns false when hashes match', () => {
    expect(needsReload('same-hash', 'same-hash')).toBe(false)
  })
})
