export interface Message {
  readonly role: 'system' | 'user' | 'assistant' | 'tool'
  readonly content: string
  readonly toolCallId?: string
  readonly toolCalls?: readonly ToolCall[]
}

export interface ToolCall {
  readonly id: string
  readonly name: string
  readonly arguments: string
}

export interface Tool {
  readonly name: string
  readonly description: string
  readonly parameters: Record<string, unknown>
}

export interface Chunk {
  readonly id: string
  readonly content: string
  readonly metadata: ChunkMetadata
  readonly score?: number
}

export interface ChunkMetadata {
  readonly source: string
  readonly title?: string
  readonly url?: string
  readonly [key: string]: unknown
}

export interface ModelCapabilities {
  readonly maxTokens: number
  readonly supportsToolCalling: boolean
  readonly supportsStreaming: boolean
  readonly modelId: string
}

export interface GenerateOptions {
  readonly temperature?: number
  readonly maxTokens?: number
  readonly tools?: readonly Tool[]
  readonly stopSequences?: readonly string[]
}

export interface ContentIndex {
  readonly version: string
  readonly contentHash: string
  readonly chunks: readonly IndexedChunk[]
  readonly metadata: IndexMetadata
}

export interface IndexedChunk {
  readonly id: string
  readonly content: string
  readonly embedding: readonly number[]
  readonly metadata: ChunkMetadata
}

export interface IndexMetadata {
  readonly createdAt: string
  readonly embeddingModel: string
  readonly dimensions: number
  readonly totalChunks: number
}

export type DownloadPolicy = 'auto' | 'prompt' | 'never'

export type RuntimeEvent =
  | { readonly type: 'model:download:start'; readonly modelId: string }
  | { readonly type: 'model:download:progress'; readonly modelId: string; readonly progress: number }
  | { readonly type: 'model:download:complete'; readonly modelId: string }
  | { readonly type: 'model:ready' }
  | { readonly type: 'generation:start' }
  | { readonly type: 'generation:token'; readonly token: string }
  | { readonly type: 'generation:complete'; readonly text: string }
  | { readonly type: 'generation:error'; readonly error: Error }
  | { readonly type: 'retrieval:start'; readonly query: string }
  | { readonly type: 'retrieval:complete'; readonly chunks: readonly Chunk[] }
  | { readonly type: 'tool:call'; readonly toolCall: ToolCall }
  | { readonly type: 'tool:result'; readonly toolCallId: string; readonly result: string }
  | { readonly type: 'error'; readonly error: Error; readonly recoverable: boolean }

export interface ConversationState {
  readonly messages: readonly Message[]
  readonly turn: number
}
