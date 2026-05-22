import type { ModelProvider, ModelCapabilities, GenerateOptions, Message } from '@browser-chat-runtime/core'

export interface WebLLMConfig {
  readonly model?: string
  readonly wasmUrl?: string
}

const DEFAULT_MODEL = 'Phi-4-mini-instruct-q4f16_1-MLC'

export function webllm(config: WebLLMConfig = {}): ModelProvider {
  const modelId = config.model ?? DEFAULT_MODEL

  return {
    id: `webllm:${modelId}`,

    async init() {
      // TODO: Initialize WebLLM engine, download model
      throw new Error('Not implemented — waiting for spike validation')
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
      throw new Error('Not implemented')
    },

    capabilities(): ModelCapabilities {
      return {
        maxTokens: 4096,
        supportsToolCalling: true,
        supportsStreaming: true,
        modelId,
      }
    },

    async dispose() {
      // TODO: Dispose WebLLM engine
    },
  }
}
