import { readableError } from '../shared'
import { createModelProvider, type ModelProvider } from '../cascade'

export interface WebLLMOptions {
  model?: string
  modelSize?: string
}

export function webLLM(options: WebLLMOptions = {}): ModelProvider {
  const modelId = options.model ?? 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC'
  return createModelProvider({
    id: 'webllm',
    label: 'WebLLM',
    resolve: async context => {
      try {
        const { createWebLLM, doesBrowserSupportWebLLM } = await import('@browser-ai/web-llm')
        if (!doesBrowserSupportWebLLM()) return null

        const approved = await context.requestDownload({
          provider: 'webllm',
          modelSize: options.modelSize,
          message: `Download ${options.modelSize ?? 'a local'} AI model for smarter answers?`,
        })
        if (!approved) return null

        const provider = createWebLLM()
        const model = provider(modelId, {
          initProgressCallback: progress => {
            context.emitStatus({
              provider: 'webllm',
              status: 'downloading',
              progress: progress.progress,
              message: progress.text ?? `Downloading WebLLM... ${Math.round(progress.progress * 100)}%`,
            })
          },
        })
        return model
      } catch (error) {
        context.emitStatus({
          provider: 'webllm',
          status: 'error',
          message: readableError(error),
        })
        return null
      }
    },
  })
}
