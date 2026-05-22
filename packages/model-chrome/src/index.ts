import type { ModelProvider, ModelCapabilities, GenerateOptions, Message } from '@browser-chat-runtime/core'

export function chromeAI(): ModelProvider {
  return {
    id: 'chrome:gemini-nano',

    async init() {
      if (typeof window === 'undefined' || !('ai' in window)) {
        throw new Error('Chrome Prompt API (window.ai) not available')
      }
      // TODO: Check availability via window.ai.languageModel.capabilities()
    },

    async *generate(
      _messages: readonly Message[],
      _options?: GenerateOptions,
    ): AsyncIterable<string> {
      throw new Error('Not implemented')
    },

    async generateStructured<T>(
      _messages: readonly Message[],
      _schema: Record<string, unknown>,
    ): Promise<T> {
      throw new Error('Chrome Prompt API does not support structured generation')
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
      // Chrome manages the model lifecycle
    },
  }
}
