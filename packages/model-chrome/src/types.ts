export interface WindowAI {
  readonly languageModel: LanguageModelAPI
}

export interface LanguageModelAPI {
  capabilities(): Promise<LanguageModelCapabilities>
  create(options?: LanguageModelCreateOptions): Promise<LanguageModelSession>
}

export interface LanguageModelCapabilities {
  readonly available: 'readily' | 'after-download' | 'no'
  readonly defaultTemperature?: number
  readonly defaultTopK?: number
  readonly maxTopK?: number
}

export interface LanguageModelCreateOptions {
  readonly systemPrompt?: string
  readonly temperature?: number
  readonly topK?: number
}

export interface LanguageModelSession {
  prompt(input: string): Promise<string>
  promptStreaming(input: string): ReadableStream<string>
  destroy(): void
}

declare global {
  interface Window {
    readonly ai?: WindowAI
  }
}
