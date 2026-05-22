import type {
  Message,
  GenerateOptions,
  GenerateChunk,
  ModelCapabilities,
  Chunk,
  ContentIndex,
  Tool,
  ConversationState,
  RuntimeEvent,
  DownloadPolicy,
} from './types.js'

export interface ModelProvider {
  readonly id: string
  init(): Promise<void>
  generate(messages: readonly Message[], options?: GenerateOptions): AsyncIterable<GenerateChunk>
  generateStructured<T>(
    messages: readonly Message[],
    schema: Record<string, unknown>,
  ): Promise<T>
  capabilities(): ModelCapabilities
  dispose(): Promise<void>
}

export interface RAGProvider {
  readonly id: string
  init(index?: ContentIndex): Promise<void>
  retrieve(query: string, topK?: number): Promise<readonly Chunk[]>
  dispose(): Promise<void>
}

export interface EmbeddingProvider {
  readonly id: string
  init(): Promise<void>
  encode(text: string): Promise<Float32Array>
  encodeBatch(texts: readonly string[]): Promise<readonly Float32Array[]>
  readonly dimensions: number
  dispose(): Promise<void>
}

export interface SkillContext {
  readonly model: ModelProvider
  readonly rag?: RAGProvider
  readonly conversation: ConversationState
  emit(event: string, data: unknown): void
}

export interface Skill {
  readonly name: string
  readonly description: string
  readonly tools: readonly Tool[]
  activate(context: SkillContext): void
  deactivate?(): void
  handleToolCall?(name: string, args: Record<string, unknown>): Promise<string>
}

export interface UIProvider {
  mount(container: HTMLElement, runtime: Runtime): void
  unmount(): void
}

export interface Runtime {
  readonly config: RuntimeConfig
  query(input: string): AsyncIterable<string>
  getConversation(): ConversationState
  clearConversation(): void
  initModel(): Promise<void>
  on(handler: (event: RuntimeEvent) => void): () => void
  dispose(): Promise<void>
}

export interface RuntimeConfig {
  readonly model: ModelProvider
  readonly rag?: RAGProvider
  readonly embeddings?: EmbeddingProvider
  readonly skills?: readonly Skill[]
  readonly ui?: UIProvider
  readonly downloadPolicy?: DownloadPolicy
  readonly maxToolRounds?: number
  readonly systemPrompt?: string
  readonly guardrails?: GuardrailsConfig
}

export interface GuardrailsConfig {
  readonly maxInputTokens?: number
  readonly maxOutputTokens?: number
  readonly maxConversationTurns?: number
  readonly blockedPatterns?: readonly RegExp[]
}
