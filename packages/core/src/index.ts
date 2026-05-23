// v2: graph-backed orchestrator (default)
export { createRuntimeV2 as createRuntime } from './orchestrator-v2.js'

// v2: declarative agent builder
export { defineAgent } from './agent.js'
export type { AgentDefinition, Agent } from './agent.js'

// v1: legacy linear orchestrator (available for migration)
export { createRuntime as createRuntimeV1 } from './orchestrator.js'

export { createEventBus } from './event-bus.js'
export { createContextManager } from './context-manager.js'
export { validateInput } from './guardrails.js'

// v2: graph engine exports
export { createGraphEngine } from './graph/engine.js'
export { createInitialState, updateState } from './graph/state.js'
export { createEventEmitter } from './events/emitter.js'
export {
  createRetrieveNode,
  createThinkNode,
  createRespondNode,
  createInputGuardrailNode,
  createActNode,
  createHitlNode,
  createRouteNode,
  createEscalateNode,
  type SkillRoute,
  type RouteNodeConfig,
  type HitlNodeConfig,
  type EscalateNodeConfig,
  type InputGuardrailNodeConfig,
  type ActNodeConfig,
  type ThinkNodeConfig,
  type RespondNodeConfig,
  type RetrieveNodeConfig,
} from './nodes/index.js'

// v1 types (unchanged)
export type {
  Message,
  ToolCall,
  Tool,
  Chunk,
  ChunkMetadata,
  ModelCapabilities,
  GenerateOptions,
  ContentIndex,
  IndexedChunk,
  IndexMetadata,
  DownloadPolicy,
  GenerateChunk,
  RuntimeEvent,
  ConversationState,
} from './types.js'

export type {
  ModelProvider,
  RAGProvider,
  EmbeddingProvider,
  Skill,
  SkillContext,
  UIProvider,
  Runtime,
  RuntimeConfig,
  GuardrailsConfig,
} from './providers.js'

// v2 types
export type { AgentState, ToolResult, ApprovalRequest, ApprovalResult, ValidationResult, StepTrace } from './graph/state.js'
export type { GraphNode, NodeContext, NodeErrorPolicy, AgentConfig, ContextWindowConfig } from './graph/node.js'
export type { GraphDefinition, GraphEdge, EdgeCondition, GraphErrorConfig, RunOptions, StateCheckpoint } from './graph/types.js'
export type { AgentEvent, AgUIEvent, EdgekitEvent, LegacyRuntimeEvent } from './events/types.js'
export type { EventEmitter } from './events/emitter.js'
export type { GraphRunner } from './graph/engine.js'

export type { EventBus } from './event-bus.js'
export type { ContextManager } from './context-manager.js'
