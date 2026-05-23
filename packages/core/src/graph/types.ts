import type { GraphNode, NodeErrorPolicy } from './node.js'
import type { AgentState } from './state.js'

export interface EdgeCondition {
  readonly condition: (state: AgentState) => boolean
}

export type GraphEdge = readonly [
  from: string,
  to: string,
  options?: EdgeCondition,
]

export interface GraphDefinition {
  readonly nodes: Readonly<Record<string, GraphNode>>
  readonly edges: readonly GraphEdge[]
  readonly entryNode: string
}

export interface GraphErrorConfig {
  readonly defaultPolicy: NodeErrorPolicy
  readonly onUnhandled: 'halt' | 'respond-with-error'
  readonly errorNode?: string
}

export interface RunOptions {
  readonly signal?: AbortSignal
  readonly metadata?: Readonly<Record<string, unknown>>
}

export interface StateCheckpoint {
  readonly id: string
  readonly agentName: string
  readonly runId: string
  readonly state: AgentState
  readonly timestamp: number
  readonly nodeId: string
}
