import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LanguageModelV3 } from '@ai-sdk/provider'
import { createAgent, chromeAI } from '../src/index'

const browserAIMock = vi.hoisted(() => vi.fn())
const doesBrowserSupportBrowserAIMock = vi.hoisted(() => vi.fn())

vi.mock('@browser-ai/core', () => ({
  browserAI: browserAIMock,
  doesBrowserSupportBrowserAI: doesBrowserSupportBrowserAIMock,
}))

function createBrowserModel(availability = 'available') {
  const model = {
    provider: 'browser-ai',
    modelId: 'text',
    specificationVersion: 'v3',
    availability: vi.fn(async () => availability),
    createSessionWithProgress: vi.fn(async () => model),
  } as LanguageModelV3 & {
    availability: ReturnType<typeof vi.fn>
    createSessionWithProgress: ReturnType<typeof vi.fn>
  }
  return model
}

function resolveContext() {
  return {
    downloadPolicy: 'never' as const,
    emitStatus: vi.fn(),
    requestDownload: vi.fn(async () => false),
  }
}

describe('chromeAI', () => {
  beforeEach(() => {
    browserAIMock.mockReset()
    doesBrowserSupportBrowserAIMock.mockReset()
    doesBrowserSupportBrowserAIMock.mockReturnValue(true)
    browserAIMock.mockImplementation(() => createBrowserModel())
  })

  it('sets an English Prompt API output language by default', async () => {
    const provider = chromeAI()

    await provider.resolve(resolveContext())

    expect(browserAIMock).toHaveBeenCalledWith('text', {
      expectedOutputs: [{ type: 'text', languages: ['en'] }],
    })
  })

  it('preserves a host-provided Prompt API output language override', async () => {
    const provider = chromeAI({ outputLanguage: 'fr' })

    await provider.resolve(resolveContext())

    expect(browserAIMock).toHaveBeenCalledWith('text', {
      expectedOutputs: [{ type: 'text', languages: ['fr'] }],
    })
  })

  it('threads createAgent outputLanguage defaults into the default Chrome AI provider', async () => {
    const streamText = vi.fn(() => ({
      fullStream: (async function* () {
        yield { type: 'text-delta', delta: 'bonjour' }
      })(),
      response: Promise.resolve({
        messages: [{ role: 'assistant', content: [{ type: 'text', text: 'bonjour' }] }],
      }),
    }))
    const agent = createAgent({
      systemPrompt: 'You are helpful.',
      outputLanguage: 'fr',
      downloadPolicy: 'never',
      streamText: streamText as never,
    })

    for await (const _ of agent.send('bonjour')) {
      // drain
    }

    expect(browserAIMock).toHaveBeenCalledWith('text', {
      expectedOutputs: [{ type: 'text', languages: ['fr'] }],
    })
    expect(streamText).toHaveBeenCalled()
  })

  it('allows hosts to intentionally omit the Prompt API output language contract', async () => {
    const provider = chromeAI({ outputLanguage: null })

    await provider.resolve(resolveContext())

    expect(browserAIMock).toHaveBeenCalledWith('text', undefined)
  })
})
