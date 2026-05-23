import type { RuntimeEvent } from '../types.js'

// ---------------------------------------------------------------------------
// Base event interface
// ---------------------------------------------------------------------------

export interface BaseEvent {
  readonly type: string
  readonly timestamp: number
}

// ---------------------------------------------------------------------------
// AG-UI events (12 vendored types)
// ---------------------------------------------------------------------------

export interface RunStartedEvent extends BaseEvent {
  readonly type: 'run:started'
  readonly runId: string
}

export interface RunFinishedEvent extends BaseEvent {
  readonly type: 'run:finished'
  readonly runId: string
  readonly status: 'completed' | 'failed' | 'cancelled'
  readonly error?: string
}

export interface StepStartedEvent extends BaseEvent {
  readonly type: 'step:started'
  readonly runId: string
  readonly stepId: string
  readonly nodeId: string
}

export interface StepFinishedEvent extends BaseEvent {
  readonly type: 'step:finished'
  readonly runId: string
  readonly stepId: string
  readonly nodeId: string
  readonly status: 'completed' | 'failed' | 'skipped'
  readonly error?: string
}

export interface TextMessageStartEvent extends BaseEvent {
  readonly type: 'text:start'
  readonly runId: string
}

export interface TextMessageContentEvent extends BaseEvent {
  readonly type: 'text:content'
  readonly runId: string
  readonly content: string
}

export interface TextMessageEndEvent extends BaseEvent {
  readonly type: 'text:end'
  readonly runId: string
  readonly cancelled?: boolean
}

export interface ToolCallStartEvent extends BaseEvent {
  readonly type: 'tool:start'
  readonly runId: string
  readonly toolCallId: string
  readonly name: string
}

export interface ToolCallArgsEvent extends BaseEvent {
  readonly type: 'tool:args'
  readonly runId: string
  readonly toolCallId: string
  readonly args: string
}

export interface ToolCallEndEvent extends BaseEvent {
  readonly type: 'tool:end'
  readonly runId: string
  readonly toolCallId: string
  readonly result: string
  readonly error?: string
}

export interface StateSnapshotEvent extends BaseEvent {
  readonly type: 'state:snapshot'
  readonly runId: string
  readonly state: Readonly<Record<string, unknown>>
}

export interface StateDeltaEvent extends BaseEvent {
  readonly type: 'state:delta'
  readonly runId: string
  readonly delta: Readonly<Record<string, unknown>>
}

/** Combined AG-UI event type. */
export type AgUIEvent =
  | RunStartedEvent
  | RunFinishedEvent
  | StepStartedEvent
  | StepFinishedEvent
  | TextMessageStartEvent
  | TextMessageContentEvent
  | TextMessageEndEvent
  | ToolCallStartEvent
  | ToolCallArgsEvent
  | ToolCallEndEvent
  | StateSnapshotEvent
  | StateDeltaEvent

// ---------------------------------------------------------------------------
// edgekit extension events (8 custom types)
// ---------------------------------------------------------------------------

export interface ModelDownloadStartEvent extends BaseEvent {
  readonly type: 'edgekit:model:download:start'
  readonly modelId: string
}

export interface ModelDownloadProgressEvent extends BaseEvent {
  readonly type: 'edgekit:model:download:progress'
  readonly modelId: string
  readonly progress: number
}

export interface ModelDownloadCompleteEvent extends BaseEvent {
  readonly type: 'edgekit:model:download:complete'
  readonly modelId: string
}

export interface RetrievalStartEvent extends BaseEvent {
  readonly type: 'edgekit:retrieval:start'
  readonly runId: string
  readonly query: string
}

export interface RetrievalCompleteEvent extends BaseEvent {
  readonly type: 'edgekit:retrieval:complete'
  readonly runId: string
  readonly chunkCount: number
}

export interface HITLRequestEvent extends BaseEvent {
  readonly type: 'edgekit:hitl:request'
  readonly runId: string
  readonly checkpointId: string
  readonly description: string
}

export interface HITLResponseEvent extends BaseEvent {
  readonly type: 'edgekit:hitl:response'
  readonly runId: string
  readonly checkpointId: string
  readonly approved: boolean
}

export interface EscalationEvent extends BaseEvent {
  readonly type: 'edgekit:escalation'
  readonly runId: string
  readonly reason: string
  readonly from: 'local' | 'cloud'
  readonly to: 'local' | 'cloud'
}

/** Combined edgekit extension event type. */
export type EdgekitEvent =
  | ModelDownloadStartEvent
  | ModelDownloadProgressEvent
  | ModelDownloadCompleteEvent
  | RetrievalStartEvent
  | RetrievalCompleteEvent
  | HITLRequestEvent
  | HITLResponseEvent
  | EscalationEvent

// ---------------------------------------------------------------------------
// Combined v2 event type
// ---------------------------------------------------------------------------

/** All v2 events: AG-UI standard events + edgekit extensions. */
export type AgentEvent = AgUIEvent | EdgekitEvent

// ---------------------------------------------------------------------------
// Legacy compatibility alias
// ---------------------------------------------------------------------------

/** Alias to the v1 RuntimeEvent for migration purposes. */
export type LegacyRuntimeEvent = RuntimeEvent
