import { describe, it, expect, vi } from 'vitest'

vi.mock('@mlc-ai/web-llm', () => ({
  CreateMLCEngine: vi.fn(),
}))

import { webllm, MODEL_LADDER } from './index.js'

describe('webllm', () => {
  it('creates a provider with default model', () => {
    const provider = webllm()
    expect(provider.id).toBe(`webllm:${MODEL_LADDER.standard}`)
  })

  it('creates a provider with custom model', () => {
    const provider = webllm({ model: 'custom-model-MLC' })
    expect(provider.id).toBe('webllm:custom-model-MLC')
  })

  it('creates a provider from tier', () => {
    const provider = webllm({ tier: 'tiny' })
    expect(provider.id).toBe(`webllm:${MODEL_LADDER.tiny}`)
  })

  it('model overrides tier', () => {
    const provider = webllm({ model: 'custom-MLC', tier: 'high' })
    expect(provider.id).toBe('webllm:custom-MLC')
  })

  it('reports correct capabilities', () => {
    const provider = webllm()
    const caps = provider.capabilities()

    expect(caps.supportsToolCalling).toBe(true)
    expect(caps.supportsStreaming).toBe(true)
    expect(caps.maxTokens).toBe(4096)
    expect(caps.modelId).toBe(MODEL_LADDER.standard)
  })

  it('throws when generate called before init', async () => {
    const provider = webllm()
    const gen = provider.generate([{ role: 'user', content: 'hi' }])
    const iter = gen[Symbol.asyncIterator]()

    await expect(iter.next()).rejects.toThrow('not initialized')
  })

  it('throws when generateStructured called before init', async () => {
    const provider = webllm()

    await expect(
      provider.generateStructured([{ role: 'user', content: 'hi' }], {}),
    ).rejects.toThrow('not initialized')
  })

  it('dispose is safe to call without init', async () => {
    const provider = webllm()
    await expect(provider.dispose()).resolves.toBeUndefined()
  })
})

describe('MODEL_LADDER', () => {
  it('has all expected tiers', () => {
    expect(MODEL_LADDER.tiny).toBeDefined()
    expect(MODEL_LADDER.standard).toBeDefined()
    expect(MODEL_LADDER.high).toBeDefined()
  })

  it('all tiers end with -MLC', () => {
    for (const [, value] of Object.entries(MODEL_LADDER)) {
      expect(value).toMatch(/-MLC$/)
    }
  })
})
