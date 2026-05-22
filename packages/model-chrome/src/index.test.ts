import { describe, it, expect } from 'vitest'
import { chromeAI } from './index.js'

describe('chromeAI', () => {
  it('creates a provider with correct id', () => {
    const provider = chromeAI()
    expect(provider.id).toBe('chrome:gemini-nano')
  })

  it('reports correct capabilities', () => {
    const provider = chromeAI()
    const caps = provider.capabilities()

    expect(caps.supportsToolCalling).toBe(false)
    expect(caps.supportsStreaming).toBe(true)
    expect(caps.modelId).toBe('gemini-nano')
  })

  it('throws when init called without window.ai', async () => {
    const provider = chromeAI()
    await expect(provider.init()).rejects.toThrow('window.ai')
  })

  it('throws when generate called before init', async () => {
    const provider = chromeAI()
    const gen = provider.generate([{ role: 'user', content: 'hi' }])
    const iter = gen[Symbol.asyncIterator]()
    await expect(iter.next()).rejects.toThrow('not initialized')
  })

  it('throws on generateStructured', async () => {
    const provider = chromeAI()
    await expect(
      provider.generateStructured([], {}),
    ).rejects.toThrow('does not support structured generation')
  })

  it('dispose is safe without init', async () => {
    const provider = chromeAI()
    await expect(provider.dispose()).resolves.toBeUndefined()
  })
})
