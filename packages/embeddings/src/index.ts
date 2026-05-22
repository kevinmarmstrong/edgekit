import type { EmbeddingProvider } from '@browser-chat-runtime/core'

export interface TransformersEmbeddingConfig {
  readonly model?: string
}

const DEFAULT_MODEL = 'Xenova/all-MiniLM-L6-v2'

export function transformersEmbedding(
  config: TransformersEmbeddingConfig = {},
): EmbeddingProvider {
  const modelId = config.model ?? DEFAULT_MODEL

  return {
    id: `transformers:${modelId}`,
    dimensions: 384,

    async init() {
      // TODO: Load Transformers.js v4 pipeline
      throw new Error('Not implemented — waiting for spike validation')
    },

    async encode(_text: string): Promise<Float32Array> {
      throw new Error('Not implemented')
    },

    async encodeBatch(_texts: readonly string[]): Promise<readonly Float32Array[]> {
      throw new Error('Not implemented')
    },

    async dispose() {
      // TODO: Dispose pipeline
    },
  }
}
