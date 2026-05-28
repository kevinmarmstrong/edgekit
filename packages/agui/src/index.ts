import { HttpAgent } from '@ag-ui/client'
import type { BaseEvent } from '@ag-ui/client'
import type {
  AgentEvent,
  EdgeAgent,
  EdgeSessionContext,
  EdgeTelemetryEvent,
  EdgeTelemetrySink,
} from '@kevinmarmstrong/edgekit'
type ModelMessage = unknown
type EdgeTelemetryEventName = EdgeTelemetryEvent['name']
type EdgeViewPayload = Extract<AgentEvent, { type: 'view' }>['view']
type EdgeHandoffMemoryRecord = {
  id: string
  title?: string
  body: string
  tags?: string[]
  source?: string
  updatedAt?: string
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

export interface EdgeHandoffEnvelope {
  version: 'edgekit.handoff.v1'
  id: string
  createdAt: string
  input: string
  intent?: string
  messages: ModelMessage[]
  session: {
    identity?: EdgeSessionContext['identity']
    state?: EdgeSessionContext['state']
  }
  memory: EdgeHandoffMemoryRecord[]
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
  memory?: EdgeHandoffMemoryRecord[]
  tools?: Array<string | { name: string; description?: string }>
  trace: EdgeHandoffEnvelope['trace']
  redactionApplied?: boolean
  now?: () => string
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
      return [{ type: 'view', view: (event.value ?? event.payload ?? event.data) as EdgeViewPayload }]
    }
  }

  if (type === 'RUN_ERROR') {
    return [{ type: 'error', error: event.message ?? event.error ?? 'AG-UI run failed' }]
  }

  return []
}

export function createAgUiAgent(options: CreateAgUiAgentOptions): EdgeAgent {
  const messages: ModelMessage[] = []
  const sessionId = options.sessionId ?? createId('session')
  const telemetry = createTelemetryDispatcher(options.telemetry, sessionId)

  const runAgUi = async function* (input: AgUiRunInput): AsyncGenerator<AgentEvent> {
    let text = ''
    const runId = createId('run')
    await telemetry.emit('run-start', { runId, input: input.input, data: { provider: 'ag-ui' } })
    const events = options.run ? await options.run(input) : streamAgUiEndpoint(options, input)

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

    if (text) messages.push({ role: 'assistant', content: [{ type: 'text', text }] })
    await telemetry.emit('run-finish', { runId, input: input.input, data: { text } })
    yield { type: 'done', text }
  }

  return {
    async *send(input: string): AsyncGenerator<AgentEvent> {
      messages.push({ role: 'user', content: input })
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
      messages.length = 0
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

async function* streamAgUiEndpoint(options: CreateAgUiAgentOptions, input: AgUiRunInput): AsyncGenerator<AgUiEvent> {
  if (!options.endpoint) throw new Error('createAgUiAgent requires either endpoint or run.')
  if (options.fetch) {
    yield* streamAgUiEndpointWithFetch(options, input)
    return
  }

  const agent = new HttpAgent({
    url: options.endpoint,
    threadId: options.sessionId,
  })
  const observable = agent.run({
    messages: input.messages as never,
    context: {
      input: input.input,
      resume: input.resume,
    },
  } as never)

  for await (const event of observableToAsyncIterable<BaseEvent>(observable)) {
    yield event as unknown as AgUiEvent
  }
}

async function* streamAgUiEndpointWithFetch(options: CreateAgUiAgentOptions, input: AgUiRunInput): AsyncGenerator<AgUiEvent> {
  if (!options.endpoint) throw new Error('createAgUiAgent requires either endpoint or run.')
  const response = await options.fetch!(options.endpoint, {
    method: 'POST',
    headers: {
      accept: 'text/event-stream, application/x-ndjson, application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  })
  if (!response.ok) throw new Error(`AG-UI endpoint failed with ${response.status}`)
  if (!response.body) return

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const event = parseAgUiLine(line)
      if (event) yield event
    }
  }

  const lastEvent = parseAgUiLine(buffer)
  if (lastEvent) yield lastEvent
}

function observableToAsyncIterable<T>(observable: {
  subscribe(observer: { next(value: T): void; error(error: unknown): void; complete(): void }): { unsubscribe(): void }
}): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator]() {
      const queue: T[] = []
      const waiters: Array<(result: IteratorResult<T>) => void> = []
      let done = false
      let error: unknown
      const subscription = observable.subscribe({
        next(value) {
          const waiter = waiters.shift()
          if (waiter) waiter({ value, done: false })
          else queue.push(value)
        },
        error(nextError) {
          error = nextError
          done = true
          const waiter = waiters.shift()
          if (waiter) waiter(Promise.reject(nextError) as never)
        },
        complete() {
          done = true
          const waiter = waiters.shift()
          if (waiter) waiter({ value: undefined as never, done: true })
        },
      })

      return {
        next(): Promise<IteratorResult<T>> {
          if (queue.length > 0) return Promise.resolve({ value: queue.shift()!, done: false })
          if (error) return Promise.reject(error)
          if (done) return Promise.resolve({ value: undefined as never, done: true })
          return new Promise(resolve => waiters.push(resolve))
        },
        return(): Promise<IteratorResult<T>> {
          subscription.unsubscribe()
          done = true
          return Promise.resolve({ value: undefined as never, done: true })
        },
      }
    },
  }
}

function parseAgUiLine(line: string): AgUiEvent | null {
  const trimmed = line.trim()
  if (!trimmed || trimmed === 'data: [DONE]') return null
  const payload = trimmed.startsWith('data:') ? trimmed.slice(5).trim() : trimmed
  if (!payload) return null

  try {
    const event = JSON.parse(payload)
    return isRecord(event) && typeof event.type === 'string' ? event as AgUiEvent : null
  } catch {
    return null
  }
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

function normalizeAgUiType(type: string) {
  return type
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/-/g, '_')
    .toUpperCase()
}

function createTelemetryDispatcher(telemetry: EdgeTelemetrySink | EdgeTelemetrySink[] | undefined, sessionId: string) {
  const sinks = (Array.isArray(telemetry) ? telemetry : telemetry ? [telemetry] : []).filter(Boolean)

  return {
    async emit(name: EdgeTelemetryEventName, event: Partial<EdgeTelemetryEvent> = {}) {
      if (sinks.length === 0) return
      const payload: EdgeTelemetryEvent = {
        id: event.id ?? createId('evt'),
        sessionId: event.sessionId ?? sessionId,
        timestamp: event.timestamp ?? new Date().toISOString(),
        name,
        ...event,
      }
      await Promise.all(
        sinks.map(async sink => {
          try {
            if (typeof sink === 'function') await sink(payload)
            else await sink.record(payload)
          } catch {
            // Telemetry must never break the user workflow.
          }
        }),
      )
    },
  }
}

function publicIdentity(identity: EdgeSessionContext['identity']): EdgeSessionContext['identity'] {
  if (!identity) return undefined
  return {
    id: identity.id,
    tenantId: identity.tenantId,
    roles: identity.roles ?? [],
    permissions: identity.permissions ?? [],
  }
}

function estimateTokens(value: unknown): number {
  const text = typeof value === 'string' ? value : stableStringify(value)
  return Math.max(1, Math.ceil(text.length / 4))
}

function stableStringify(value: unknown): string {
  if (value == null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
  return `{${entries.join(',')}}`
}

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
