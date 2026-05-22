import type {
  ModelProvider,
  ModelCapabilities,
  GenerateOptions,
  Message,
} from '@browser-chat-runtime/core'
import type { LanguageModelSession } from './types.js'

export interface ChromeAIConfig {
  readonly temperature?: number
  readonly topK?: number
}

export function chromeAI(config: ChromeAIConfig = {}): ModelProvider {
  let session: LanguageModelSession | null = null

  return {
    id: 'chrome:gemini-nano',

    async init() {
      if (typeof window === 'undefined' || !window.ai) {
        throw new Error('Chrome Prompt API (window.ai) is not available in this browser')
      }

      const capabilities = await window.ai.languageModel.capabilities()

      if (capabilities.available === 'no') {
        throw new Error('Chrome AI model is not available on this device')
      }

      session = await window.ai.languageModel.create({
        temperature: config.temperature,
        topK: config.topK,
      })
    },

    async *generate(
      messages: readonly Message[],
      options?: GenerateOptions,
    ): AsyncIterable<string> {
      if (!session) throw new Error('Model not initialized. Call init() first.')

      const prompt = messagesToPrompt(messages)

      if (options?.temperature !== undefined || options?.maxTokens !== undefined) {
        // Chrome API doesn't support per-request temperature/maxTokens,
        // would need to create a new session. For now, use existing session.
      }

      const stream = session.promptStreaming(prompt)
      const reader = stream.getReader()

      let previousText = ''
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          if (value) {
            // Chrome API returns cumulative text, extract delta
            const delta = value.slice(previousText.length)
            previousText = value
            if (delta) yield delta
          }
        }
      } finally {
        reader.releaseLock()
      }
    },

    async generateStructured<T>(
      _messages: readonly Message[],
      _schema: Record<string, unknown>,
    ): Promise<T> {
      throw new Error(
        'Chrome Prompt API does not support structured generation. Use model-webllm for structured output.',
      )
    },

    capabilities(): ModelCapabilities {
      return {
        maxTokens: 4096,
        supportsToolCalling: false,
        supportsStreaming: true,
        modelId: 'gemini-nano',
      }
    },

    async dispose() {
      if (session) {
        session.destroy()
        session = null
      }
    },
  }
}

function messagesToPrompt(messages: readonly Message[]): string {
  return messages
    .filter((m) => m.role !== 'tool')
    .map((m) => {
      switch (m.role) {
        case 'system':
          return `Instructions: ${m.content}`
        case 'user':
          return `User: ${m.content}`
        case 'assistant':
          return `Assistant: ${m.content}`
        default:
          return m.content
      }
    })
    .join('\n\n')
}

