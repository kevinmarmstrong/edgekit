import type { EmbeddingProvider } from '@edgekit/core'

export interface TransformersEmbeddingConfig {
  readonly model?: string
  readonly quantized?: boolean
}

interface EmbeddingPipeline {
  (text: string, options: { pooling: string; normalize: boolean }): Promise<{
    data: ArrayLike<number>
  }>
}

const DEFAULT_MODEL = 'Xenova/all-MiniLM-L6-v2'
const DEFAULT_DIMENSIONS = 384

export function transformersEmbedding(
  config: TransformersEmbeddingConfig = {},
): EmbeddingProvider {
  const modelId = config.model ?? DEFAULT_MODEL
  let pipeline: EmbeddingPipeline | null = null

  return {
    id: `transformers:${modelId}`,
    dimensions: DEFAULT_DIMENSIONS,

    async init() {
      // Dynamic import — @xenova/transformers is loaded at runtime in the browser
      const mod = (await import(
        /* @vite-ignore */ '@xenova/transformers'
      )) as { pipeline: (task: string, model: string, options?: Record<string, unknown>) => Promise<EmbeddingPipeline> }

      pipeline = await mod.pipeline('feature-extraction', modelId, {
        quantized: config.quantized ?? true,
      })
    },

    async encode(text: string): Promise<Float32Array> {
      if (!pipeline) throw new Error('Embedding model not initialized. Call init() first.')
      const output = await pipeline(text, { pooling: 'mean', normalize: true })
      return new Float32Array(output.data as ArrayLike<number>)
    },

    async encodeBatch(texts: readonly string[]): Promise<readonly Float32Array[]> {
      if (!pipeline) throw new Error('Embedding model not initialized. Call init() first.')
      const results: Float32Array[] = []
      for (const text of texts) {
        const output = await pipeline(text, { pooling: 'mean', normalize: true })
        results.push(new Float32Array(output.data as ArrayLike<number>))
      }
      return results
    },

    async dispose() {
      pipeline = null
    },
  }
}
