import type { AgentState } from './state.js'
import type { ApprovalResult } from './state.js'
import type { EventEmitter } from '../events/emitter.js'
import type { RAGProvider } from '../providers.js'
import type { Tool, DownloadPolicy } from '../types.js'

export interface NodeContext {
  readonly emitter: EventEmitter
  readonly signal: AbortSignal
  readonly tools: readonly Tool[]
  readonly rag?: RAGProvider
  readonly config: AgentConfig
  readonly waitForApproval?: (
    checkpointId: string,
  ) => Promise<ApprovalResult>
}

export interface NodeErrorPolicy {
  readonly onError: 'retry' | 'skip' | 'halt' | 'fallback'
  readonly maxRetries?: number
  readonly fallbackNode?: string
  readonly retryDelay?: number
}

export interface GraphNode {
  readonly id: string
  readonly execute: (
    state: AgentState,
    context: NodeContext,
  ) => Promise<AgentState>
  readonly errorPolicy?: NodeErrorPolicy
}

export interface AgentConfig {
  readonly systemPrompt?: string
  readonly maxIterations: number
  readonly tracing: boolean
  readonly downloadPolicy: DownloadPolicy
  readonly contextWindow?: ContextWindowConfig
}

export interface ContextWindowConfig {
  readonly targetUtilization: number // default 0.8
  readonly overflowStrategy: 'sliding-window' | 'summarize' | 'truncate'
  readonly minRecentMessages: number // default 4
}
