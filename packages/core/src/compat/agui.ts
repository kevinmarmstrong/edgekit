// FROZEN per Phase C compatibility convention: bug fixes only, no behavior changes. Source of truth lives in the matching sibling package when one exists; otherwise this is deprecated DEFER surface.
import type { ModelMessage } from 'ai'
import type { AgentEvent, EdgeAgent } from '../agent'
import type { EdgePublicIdentity, EdgeSessionContext, EdgeStateSnapshot } from '../context'
import { publicIdentity } from '../context'
import type { EdgeMemoryRecord } from './knowledge'
import type { EdgeTelemetryEvent, EdgeTelemetryEventName, EdgeTelemetrySink } from '../telemetry'
import { createTelemetryDispatcher } from '../telemetry'
import type { EdgeViewNode } from '../view'
import { createId, estimateTokens } from '../shared'

export interface EdgeHandoffEnvelope {
  version: 'edgekit.handoff.v1'
  id: string
  createdAt: string
  input: string
  intent?: string
  messages: ModelMessage[]
  session: {
    identity?: EdgePublicIdentity
    state?: EdgeStateSnapshot
  }
  memory: EdgeMemoryRecord[]
  tools: Array<{ name: string; description?: string }>
  trace: {
    sessionId: string
    runId: string
    phase: 'send' | 'approval'
  }
  redaction: {
    applied: boolean
  }
  approximateTokens: number
}

export interface CreateHandoffEnvelopeOptions {
  input: string
  intent?: string
  messages: ModelMessage[]
  session: EdgeSessionContext
  memory?: EdgeMemoryRecord[]
  tools?: Array<string | { name: string; description?: string }>
  trace: EdgeHandoffEnvelope['trace']
  redactionApplied?: boolean
  now?: () => string
}

export type AgUiEvent = Record<string, unknown> & { type: string }

export interface AgUiRunInput {
  input: string
  messages: ModelMessage[]
  resume?: Array<{ approvalId: string; approved: boolean; reason?: string }>
}

export interface CreateAgUiAgentOptions {
  endpoint?: string
  run?: (input: AgUiRunInput) => AsyncIterable<AgUiEvent> | Promise<AsyncIterable<AgUiEvent>>
  fetch?: typeof fetch
  sessionId?: string
  telemetry?: EdgeTelemetrySink | EdgeTelemetrySink[]
}

export function agUiEventToAgentEvents(event: AgUiEvent): AgentEvent[] {
  const type = normalizeAgUiType(event.type)

  if (type === 'TEXT_MESSAGE_CONTENT' || type === 'TEXT_MESSAGE_CHUNK') {
    const text = String(event.delta ?? event.text ?? event.content ?? '')
    return text ? [{ type: 'text-delta', text }] : []
  }

  if (type === 'TOOL_CALL_RESULT') {
    return [
      {
        type: 'tool-result',
        toolCallId: String(event.toolCallId ?? event.id ?? 'tool-result'),
        toolName: String(event.toolCallName ?? event.toolName ?? event.name ?? 'tool'),
        output: event.content ?? event.result ?? event.output,
      },
    ]
  }

  if (type === 'CUSTOM') {
    const name = String(event.name ?? event.eventName ?? '')
    if (['edgekit.view', 'a2ui', 'a2ui.view'].includes(name)) {
      return [{ type: 'view', view: (event.value ?? event.payload ?? event.data) as EdgeViewNode | EdgeViewNode[] }]
    }
  }

  if (type === 'RUN_ERROR') {
    return [{ type: 'error', error: event.message ?? event.error ?? 'AG-UI run failed' }]
  }

  return []
}

export function createAgUiAgent(options: CreateAgUiAgentOptions): EdgeAgent {
  let messages: ModelMessage[] = []
  const sessionId = options.sessionId ?? createId('session')
  const telemetry = createTelemetryDispatcher(options.telemetry, sessionId)

  const appendMessages = (nextMessages: ModelMessage | ModelMessage[]) => {
    messages = [...messages, ...(Array.isArray(nextMessages) ? nextMessages : [nextMessages])]
  }

  const runAgUi = async function* (input: AgUiRunInput): AsyncGenerator<AgentEvent> {
    if (!options.run) {
      throw new Error(
        [
          'BREAKING in v0.3.0: endpoint transport was removed from the deprecated root createAgUiAgent export.',
          'Use @kevinmarmstrong/edgekit-agui for endpoint-based AG-UI agents, or pass a custom run handler.',
          'Root export removal is scheduled for v0.4.',
        ].join(' '),
      )
    }

    let text = ''
    const runId = createId('run')
    await telemetry.emit('run-start', { runId, input: input.input, data: { provider: 'ag-ui' } })
    const events = await options.run(input)

    for await (const event of events) {
      for (const agentEvent of agUiEventToAgentEvents(event)) {
        if (agentEvent.type === 'text-delta') text += agentEvent.text
        const telemetryName = agentEventToTelemetryName(agentEvent)
        if (telemetryName) {
          await telemetry.emit(telemetryName, {
            runId,
            input: input.input,
            toolName: agentEvent.type === 'tool-result' ? agentEvent.toolName : undefined,
            data: agentEvent,
          })
        }
        yield agentEvent
      }
    }

    if (text) appendMessages({ role: 'assistant', content: [{ type: 'text', text }] })
    await telemetry.emit('run-finish', { runId, input: input.input, data: { text } })
    yield { type: 'done', text }
  }

  return {
    async *send(input: string): AsyncGenerator<AgentEvent> {
      appendMessages({ role: 'user', content: input })
      yield* runAgUi({ input, messages: [...messages] })
    },
    async *respondToApproval(approvalId: string, approved: boolean, reason?: string): AsyncGenerator<AgentEvent> {
      yield* runAgUi({
        input: '',
        messages: [...messages],
        resume: [{ approvalId, approved, reason }],
      })
    },
    reset() {
      messages = []
    },
  }
}

export function createHandoffEnvelope(options: CreateHandoffEnvelopeOptions): EdgeHandoffEnvelope {
  const envelope = {
    version: 'edgekit.handoff.v1' as const,
    id: createId('handoff'),
    createdAt: options.now?.() ?? new Date().toISOString(),
    input: options.input,
    intent: options.intent,
    messages: options.messages,
    session: {
      identity: publicIdentity(options.session.identity),
      state: options.session.state,
    },
    memory: options.memory ?? [],
    tools: (options.tools ?? []).map(toolEntry =>
      typeof toolEntry === 'string' ? { name: toolEntry } : { name: toolEntry.name, description: toolEntry.description },
    ),
    trace: options.trace,
    redaction: {
      applied: Boolean(options.redactionApplied),
    },
    approximateTokens: 0,
  }
  return { ...envelope, approximateTokens: estimateTokens(envelope) }
}

function normalizeAgUiType(type: string) {
  return type
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/-/g, '_')
    .toUpperCase()
}

function agentEventToTelemetryName(event: AgentEvent): EdgeTelemetryEventName | null {
  switch (event.type) {
    case 'activity':
    case 'text-delta':
    case 'tool-call':
    case 'tool-result':
    case 'approval-request':
    case 'view':
    case 'error':
      return event.type
    case 'no-model':
      return 'model-unavailable'
    default:
      return null
  }
}
