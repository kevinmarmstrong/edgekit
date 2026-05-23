import type { Message, Chunk, ToolCall, DownloadPolicy } from '../types.js'

export interface ToolResult {
  readonly toolCallId: string
  readonly name: string
  readonly result: string
  readonly error?: string
}

export interface ApprovalRequest {
  readonly type: string
  readonly description: string
  readonly data?: Readonly<Record<string, unknown>>
}

export interface ApprovalResult {
  readonly approved: boolean
  readonly reason?: string
}

export interface ValidationResult {
  readonly valid: boolean
  readonly reason?: string
  readonly blockedPattern?: string
}

export interface StepTrace {
  readonly stepId: string
  readonly nodeId: string
  readonly startedAt: number
  readonly finishedAt?: number
  readonly status: 'running' | 'completed' | 'failed' | 'skipped'
  readonly error?: string
}

export interface AgentState {
  readonly runId: string
  readonly turnId: string
  readonly messages: readonly Message[]
  readonly turn: number

  // Agentic state
  readonly currentNode: string
  readonly pendingToolCalls: readonly ToolCall[]
  readonly toolResults: readonly ToolResult[]
  readonly retrievedChunks: readonly Chunk[]

  // HITL state
  readonly awaitingApproval: boolean
  readonly approvalRequest?: ApprovalRequest

  // Routing state
  readonly selectedSkill?: string
  readonly routingConfidence: number

  // Trace state
  readonly steps: readonly StepTrace[]
  readonly startedAt: number
  readonly metadata: Readonly<Record<string, unknown>>

  // Guardrail state
  readonly inputValidation?: ValidationResult
  readonly outputValidation?: ValidationResult

  // Model state
  readonly modelId: string
  readonly inferenceMode: 'local' | 'cloud' | 'hybrid'
  readonly downloadPolicy: DownloadPolicy
}

export function createInitialState(options: {
  readonly runId: string
  readonly modelId: string
  readonly downloadPolicy: DownloadPolicy
  readonly systemPrompt?: string
}): AgentState {
  const messages: Message[] = options.systemPrompt
    ? [{ role: 'system', content: options.systemPrompt }]
    : []

  return {
    runId: options.runId,
    turnId: `${options.runId}-turn-0`,
    messages,
    turn: 0,
    currentNode: 'input_guardrail',
    pendingToolCalls: [],
    toolResults: [],
    retrievedChunks: [],
    awaitingApproval: false,
    selectedSkill: undefined,
    routingConfidence: 0,
    steps: [],
    startedAt: Date.now(),
    metadata: {},
    inputValidation: undefined,
    outputValidation: undefined,
    modelId: options.modelId,
    inferenceMode: 'local',
    downloadPolicy: options.downloadPolicy,
  }
}

/** Immutable state update helper using structural sharing. */
export function updateState(
  state: AgentState,
  updates: Partial<AgentState>,
): AgentState {
  return { ...state, ...updates }
}
