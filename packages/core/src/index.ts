import { streamText as aiStreamText, stepCountIs, tool } from 'ai'
import type { ModelMessage } from 'ai'
import type { LanguageModelV3 } from '@ai-sdk/provider'
import { z } from 'zod'

export { stepCountIs, tool }
export type { LanguageModelV3 }

export function modelOptional<T extends z.ZodType>(schema: T) {
  return z.preprocess(value => (value === null ? undefined : value), schema.optional())
}

export type EdgeFieldOption = {
  label: string
  value: string
}

export type EdgeField = {
  name: string
  label: string
  type: 'select' | 'text' | 'number'
  options?: EdgeFieldOption[]
  required?: boolean
  value?: string | number
}

export type EdgeAction = {
  id: string
  label: string
  toolName: string
  description?: string
  input?: Record<string, unknown>
  fields?: EdgeField[]
  successMessage?: string | ((output: unknown, input: Record<string, unknown>) => string)
}

export type EdgeActionContext = {
  toolName: string
  input: unknown
  output: unknown
}

export type EdgeViewNode =
  | { type: 'text'; id?: string; text: string }
  | { type: 'card'; id?: string; title: string; description?: string; children?: EdgeViewNode[] }
  | {
      type: 'form'
      id: string
      toolName: string
      submitLabel: string
      input?: Record<string, unknown>
      fields?: EdgeField[]
      successMessage?: string | ((output: unknown, input: Record<string, unknown>) => string)
    }
  | { type: 'table'; id?: string; columns: Array<{ key: string; label: string }>; rows: Array<Record<string, unknown>> }
  | {
      type: 'chart'
      id?: string
      chartType: 'bar'
      title?: string
      data: Array<{ label: string; value: number }>
    }

export function actionsToEdgeView(actions: EdgeAction[]): EdgeViewNode[] {
  return actions.map(action => ({
    type: 'card',
    id: `${action.id}-card`,
    title: action.label,
    description: action.description,
    children: [
      {
        type: 'form',
        id: action.id,
        toolName: action.toolName,
        submitLabel: action.label,
        input: action.input,
        fields: action.fields,
        successMessage: action.successMessage,
      },
    ],
  }))
}

export type DownloadPolicy = 'auto' | 'prompt' | 'never'

export type ModelStatus =
  | 'checking'
  | 'downloading'
  | 'ready'
  | 'unavailable'
  | 'error'

export interface ModelStatusEvent {
  provider: string
  status: ModelStatus
  progress?: number
  message: string
}

export interface DownloadPromptEvent {
  provider: string
  modelSize?: string
  message: string
}

export interface NoModelEvent {
  availableTools: string[]
  input: string
  message: string
}

export interface EdgeIdentity {
  id: string
  tenantId?: string
  roles?: string[]
  permissions?: string[]
  claims?: Record<string, unknown>
}

export interface EdgeAuthContext {
  headers?: Record<string, string>
  credentials?: RequestCredentials
}

export interface EdgeStateSnapshot {
  route?: string
  view?: string
  summary: string
  data?: Record<string, unknown>
}

export interface EdgeSessionContext {
  identity?: EdgeIdentity
  auth?: EdgeAuthContext
  state?: EdgeStateSnapshot
}

export type EdgeSessionProvider = () => EdgeSessionContext | Promise<EdgeSessionContext>
export type EdgeIdentityProvider = () => EdgeIdentity | null | undefined | Promise<EdgeIdentity | null | undefined>
export type EdgeStateProvider = () => EdgeStateSnapshot | null | undefined | Promise<EdgeStateSnapshot | null | undefined>

export interface EdgeToolExecutionContext {
  session: EdgeSessionContext
  identity?: EdgeIdentity
  auth?: EdgeAuthContext
  state?: EdgeStateSnapshot
}

export type ContextualToolExecute = (input: Record<string, unknown>, context: EdgeToolExecutionContext) => unknown | Promise<unknown>

export interface EdgeToolManifest {
  name: string
  tool: unknown
  description?: string
  roles?: string[]
  permissions?: string[]
}

export interface EdgeToolProviderContext {
  session: EdgeSessionContext
  input: string
  phase: 'send' | 'approval'
}

export type EdgeToolProvider = (
  context: EdgeToolProviderContext,
) => Record<string, unknown> | Promise<Record<string, unknown>>

export type EdgeTelemetryEventName =
  | 'run-start'
  | 'run-finish'
  | 'model-selected'
  | 'model-unavailable'
  | 'status'
  | 'text-delta'
  | 'tool-call'
  | 'tool-result'
  | 'approval-request'
  | 'approval-decision'
  | 'view'
  | 'error'
  | 'ui-action'

export interface EdgeTelemetryEvent {
  id: string
  sessionId: string
  runId?: string
  timestamp: string
  name: EdgeTelemetryEventName
  input?: string
  toolName?: string
  approved?: boolean
  provider?: string
  status?: string
  data?: unknown
}

export type EdgeTelemetrySink =
  | ((event: EdgeTelemetryEvent) => void | Promise<void>)
  | { record(event: EdgeTelemetryEvent): void | Promise<void> }

export type EdgeAuditAction =
  | 'tool-call'
  | 'tool-result'
  | 'approval-request'
  | 'approval-decision'
  | 'ui-action'
  | 'error'

export interface EdgeAuditEvent {
  action: EdgeAuditAction
  sessionId: string
  runId?: string
  prompt?: string
  toolName?: string
  approved?: boolean
  input?: unknown
  output?: unknown
  reason?: string
}

export interface EdgeAuditEntry {
  id: string
  sequence: number
  timestamp: string
  previousHash: string
  hash: string
  event: EdgeAuditEvent
}

export interface EdgeAuditTrail {
  record(event: EdgeAuditEvent): EdgeAuditEntry | Promise<EdgeAuditEntry>
  entries?(): EdgeAuditEntry[]
}

export interface ModelRouterContext {
  input: string
  messages: ModelMessage[]
  tools: string[]
  session: EdgeSessionContext
  defaultModel: Array<ModelProvider | LanguageModelV3>
  phase: 'send' | 'approval'
}

export type EdgeModelRouter = (
  context: ModelRouterContext,
) => Array<ModelProvider | LanguageModelV3> | Promise<Array<ModelProvider | LanguageModelV3>>

export interface HybridModelRoute {
  id: string
  description?: string
  model: Array<ModelProvider | LanguageModelV3>
  when?: (context: ModelRouterContext) => boolean | Promise<boolean>
}

export interface MissionControlSnapshot {
  runs: number
  toolCalls: Record<string, number>
  approvals: { requested: number; approved: number; rejected: number }
  errors: number
  localModelUnavailable: number
  lastEvent?: EdgeTelemetryEvent
}

export interface ResolveModelContext {
  downloadPolicy: DownloadPolicy
  emitStatus(event: ModelStatusEvent): void
  requestDownload(event: DownloadPromptEvent): Promise<boolean>
  timeoutMs?: number
}

export interface ModelProvider {
  id: string
  label: string
  resolve(context: ResolveModelContext): Promise<LanguageModelV3 | null>
}

export interface ResolvedModel {
  provider: ModelProvider
  model: LanguageModelV3
}

export type AgentEvent =
  | { type: 'status'; event: ModelStatusEvent }
  | { type: 'text-delta'; text: string }
  | { type: 'tool-call'; toolName: string; toolCallId: string; input: unknown }
  | { type: 'tool-result'; toolName: string; toolCallId: string; output: unknown }
  | { type: 'view'; view: EdgeViewNode | EdgeViewNode[] }
  | { type: 'approval-request'; approvalId: string; toolCall: unknown }
  | { type: 'no-model'; message: string }
  | { type: 'error'; error: unknown }
  | { type: 'done'; text: string }

type StreamTextFn = typeof aiStreamText

export interface CreateAgentOptions {
  systemPrompt: string
  tools?: Record<string, unknown>
  toolProvider?: EdgeToolProvider
  toolManifests?: EdgeToolManifest[]
  sessionProvider?: EdgeSessionProvider
  identityProvider?: EdgeIdentityProvider
  stateProvider?: EdgeStateProvider
  model?: Array<ModelProvider | LanguageModelV3>
  modelRouter?: EdgeModelRouter
  downloadPolicy?: DownloadPolicy
  maxSteps?: number
  modelResolveTimeoutMs?: number
  sessionId?: string
  telemetry?: EdgeTelemetrySink | EdgeTelemetrySink[]
  auditTrail?: EdgeAuditTrail
  onModelStatus?: (event: ModelStatusEvent) => string | null | void
  onDownloadPrompt?: (event: DownloadPromptEvent) => boolean | Promise<boolean>
  onNoModel?: (event: NoModelEvent) => string | null | void
  streamText?: StreamTextFn
}

export interface EdgeAgent {
  send(input: string): AsyncGenerator<AgentEvent>
  respondToApproval(approvalId: string, approved: boolean, reason?: string): AsyncGenerator<AgentEvent>
  reset(): void
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

interface ProviderOptions {
  id: string
  label: string
  resolve(context: ResolveModelContext): Promise<LanguageModelV3 | null>
}

export function createModelProvider(options: ProviderOptions): ModelProvider {
  return {
    id: options.id,
    label: options.label,
    resolve: options.resolve,
  }
}

export function createHybridModelRouter(routes: HybridModelRoute[], fallback?: Array<ModelProvider | LanguageModelV3>): EdgeModelRouter {
  return async context => {
    for (const route of routes) {
      if (!route.when || await route.when(context)) return route.model
    }
    return fallback ?? context.defaultModel
  }
}

export interface CreateAuditTrailOptions {
  sessionId?: string
  now?: () => string
  hash?: (payload: string) => string
}

export function createAuditTrail(options: CreateAuditTrailOptions = {}): EdgeAuditTrail {
  const entries: EdgeAuditEntry[] = []
  const now = options.now ?? (() => new Date().toISOString())
  const hash = options.hash ?? stableHash

  return {
    record(event: EdgeAuditEvent) {
      const sequence = entries.length + 1
      const previousHash = entries.at(-1)?.hash ?? 'genesis'
      const timestamp = now()
      const normalizedEvent = { ...event, sessionId: event.sessionId || options.sessionId || createId('session') }
      const payload = stableStringify({ sequence, timestamp, previousHash, event: normalizedEvent })
      const entry: EdgeAuditEntry = {
        id: createId('audit'),
        sequence,
        timestamp,
        previousHash,
        hash: hash(payload),
        event: normalizedEvent,
      }
      entries.push(entry)
      return entry
    },
    entries() {
      return [...entries]
    },
  }
}

export function createMissionControl() {
  const events: EdgeTelemetryEvent[] = []
  const subscribers = new Set<(event: EdgeTelemetryEvent, snapshot: MissionControlSnapshot) => void>()

  const snapshot = (): MissionControlSnapshot => {
    const toolCalls: Record<string, number> = {}
    let runs = 0
    let requested = 0
    let approved = 0
    let rejected = 0
    let errors = 0
    let localModelUnavailable = 0

    for (const event of events) {
      if (event.name === 'run-start') runs += 1
      if (event.name === 'tool-call' && event.toolName) toolCalls[event.toolName] = (toolCalls[event.toolName] ?? 0) + 1
      if (event.name === 'approval-request') requested += 1
      if (event.name === 'approval-decision') event.approved ? approved += 1 : rejected += 1
      if (event.name === 'error') errors += 1
      if (event.name === 'model-unavailable') localModelUnavailable += 1
    }

    return {
      runs,
      toolCalls,
      approvals: { requested, approved, rejected },
      errors,
      localModelUnavailable,
      lastEvent: events.at(-1),
    }
  }

  return {
    record(event: EdgeTelemetryEvent) {
      events.push(event)
      const current = snapshot()
      subscribers.forEach(subscriber => subscriber(event, current))
    },
    events() {
      return [...events]
    },
    snapshot,
    subscribe(subscriber: (event: EdgeTelemetryEvent, snapshot: MissionControlSnapshot) => void) {
      subscribers.add(subscriber)
      return () => subscribers.delete(subscriber)
    },
  }
}

export function filterToolManifestsForSession(manifests: EdgeToolManifest[], session: EdgeSessionContext): EdgeToolManifest[] {
  return manifests.filter(manifest => canUseTool(manifest, session.identity))
}

export function toolsFromManifests(manifests: EdgeToolManifest[]): Record<string, unknown> {
  return Object.fromEntries(manifests.map(manifest => [manifest.name, manifest.tool]))
}

export async function resolveSessionContext(options: {
  sessionProvider?: EdgeSessionProvider
  identityProvider?: EdgeIdentityProvider
  stateProvider?: EdgeStateProvider
}): Promise<EdgeSessionContext> {
  const provided = await options.sessionProvider?.()
  const identity = await options.identityProvider?.()
  const state = await options.stateProvider?.()
  return {
    ...(provided ?? {}),
    identity: identity ?? provided?.identity,
    state: state ?? provided?.state,
  }
}

export function withToolContext(tools: Record<string, unknown>, context: EdgeToolExecutionContext): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(tools).map(([name, candidate]) => {
      if (!isRecord(candidate) || typeof candidate.execute !== 'function') return [name, candidate]
      return [
        name,
        {
          ...candidate,
          execute: (input: Record<string, unknown>) =>
            (candidate.execute as ContextualToolExecute)(input, context),
        },
      ]
    }),
  )
}

export type McpToolDefinition = {
  name: string
  description?: string
  inputSchema?: unknown
}

export interface McpToolClient {
  listTools?: () => Promise<McpToolDefinition[] | { tools: McpToolDefinition[] }>
  callTool: (name: string, input: Record<string, unknown>, context?: EdgeToolExecutionContext) => Promise<unknown> | unknown
}

export function mcpToolsFromDefinitions(definitions: McpToolDefinition[], client: McpToolClient): Record<string, unknown> {
  const createTool = tool as never as (options: {
    description: string
    inputSchema: z.ZodType
    execute: ContextualToolExecute
  }) => unknown
  return Object.fromEntries(
    definitions.map(definition => [
      definition.name,
      createTool({
        description: definition.description ?? `Call MCP tool ${definition.name}.`,
        inputSchema: jsonSchemaToZod(definition.inputSchema),
        execute: async (input: Record<string, unknown>, context: EdgeToolExecutionContext) =>
          client.callTool(definition.name, input, context),
      }),
    ]),
  )
}

export async function loadMcpTools(client: McpToolClient): Promise<Record<string, unknown>> {
  if (!client.listTools) throw new Error('loadMcpTools requires an MCP client with listTools().')
  const listed = await client.listTools()
  const definitions = Array.isArray(listed) ? listed : listed.tools
  return mcpToolsFromDefinitions(definitions, client)
}

export async function resolveModel(
  model: Array<ModelProvider | LanguageModelV3>,
  context: ResolveModelContext,
): Promise<ResolvedModel | null> {
  for (const entry of model) {
    if (isModelProvider(entry)) {
      context.emitStatus({
        provider: entry.id,
        status: 'checking',
        message: `Checking ${entry.label}...`,
      })
      const resolved = await withTimeout(entry.resolve(context), context.timeoutMs)
      if (resolved) {
        context.emitStatus({
          provider: entry.id,
          status: 'ready',
          message: `${entry.label} is ready.`,
        })
        return { provider: entry, model: resolved }
      }
      context.emitStatus({
        provider: entry.id,
        status: 'unavailable',
        message: `${entry.label} is not available.`,
      })
      continue
    }

    return {
      provider: createModelProvider({
        id: entry.provider,
        label: entry.provider,
        resolve: async () => entry,
      }),
      model: entry,
    }
  }

  return null
}

export function createAgent(options: CreateAgentOptions): EdgeAgent {
  const downloadPolicy = options.downloadPolicy ?? 'prompt'
  const maxSteps = options.maxSteps ?? 5
  const streamText = options.streamText ?? aiStreamText
  const providers = options.model ?? [chromeAI(), webLLM()]
  const sessionId = options.sessionId ?? createId('session')
  const telemetry = createTelemetryDispatcher(options.telemetry, sessionId)
  const messages: ModelMessage[] = []
  let lastUserInput = ''

  const emitStatus = (event: ModelStatusEvent): ModelStatusEvent => {
    const custom = options.onModelStatus?.(event)
    return custom === null ? event : { ...event, message: custom ?? event.message }
  }

  const recordAudit = async (event: EdgeAuditEvent) => {
    if (!options.auditTrail) return
    await options.auditTrail.record({ ...event, sessionId })
  }

  const requestDownload = async (event: DownloadPromptEvent): Promise<boolean> => {
    if (downloadPolicy === 'auto') return true
    if (downloadPolicy === 'never') return false
    if (options.onDownloadPrompt) return Boolean(await options.onDownloadPrompt(event))
    return false
  }

  const run = async function* (phase: 'send' | 'approval'): AsyncGenerator<AgentEvent> {
    const runId = createId('run')
    const session = await resolveSessionContext(options)
    const activeTools = await resolveActiveTools(options, session, lastUserInput, phase)
    const toolContext: EdgeToolExecutionContext = {
      session,
      identity: session.identity,
      auth: session.auth,
      state: session.state,
    }
    const contextualTools = withToolContext(activeTools, toolContext)
    const system = withSessionSystemContext(options.systemPrompt, session)
    await telemetry.emit('run-start', {
      runId,
      input: lastUserInput,
      data: {
        phase,
        identity: publicIdentity(session.identity),
        state: session.state,
        tools: Object.keys(contextualTools),
      },
    })
    const statusEvents: ModelStatusEvent[] = []
    const drainStatus = function* () {
      while (statusEvents.length > 0) {
        yield { type: 'status', event: statusEvents.shift()! } satisfies AgentEvent
      }
    }

    const selectedProviders = options.modelRouter
      ? await options.modelRouter({
          input: lastUserInput,
          messages: [...messages],
          tools: Object.keys(contextualTools),
          session,
          defaultModel: providers,
          phase,
        })
      : providers

    const resolved = await resolveModel(selectedProviders, {
      downloadPolicy,
      timeoutMs: options.modelResolveTimeoutMs ?? 3_000,
      emitStatus: event => {
        const displayEvent = emitStatus(event)
        statusEvents.push(displayEvent)
        void telemetry.emit('status', {
          runId,
          input: lastUserInput,
          provider: displayEvent.provider,
          status: displayEvent.status,
          data: displayEvent,
        })
      },
      requestDownload,
    })
    yield* drainStatus()

    if (!resolved) {
      const defaultMessage = 'AI is not available in this browser.'
      const message = options.onNoModel?.({
        availableTools: Object.keys(contextualTools),
        input: lastUserInput,
        message: defaultMessage,
      }) ?? defaultMessage
      await telemetry.emit('model-unavailable', { runId, input: lastUserInput, data: { availableTools: Object.keys(contextualTools) } })
      yield { type: 'no-model', message }
      await telemetry.emit('run-finish', { runId, input: lastUserInput, data: { noModel: true } })
      return
    }

    await telemetry.emit('model-selected', {
      runId,
      input: lastUserInput,
      provider: resolved.provider.id,
      data: { provider: resolved.provider.label },
    })

    let text = ''
    const result = (streamText as never as (options: Record<string, unknown>) => ReturnType<StreamTextFn>)({
      model: resolved.model,
      system,
      messages: [...messages],
      tools: contextualTools,
      stopWhen: stepCountIs(maxSteps),
    })

    for await (const part of result.fullStream as AsyncIterable<Record<string, unknown>>) {
      yield* drainStatus()
      switch (part.type) {
        case 'text-delta': {
          const delta = String(part.text ?? part.delta ?? '')
          text += delta
          await telemetry.emit('text-delta', { runId, input: lastUserInput, data: { length: delta.length } })
          yield { type: 'text-delta', text: delta }
          break
        }
        case 'tool-call': {
          const toolName = String(part.toolName)
          await telemetry.emit('tool-call', { runId, input: lastUserInput, toolName, data: part.input })
          await recordAudit({
            action: 'tool-call',
            sessionId,
            runId,
            prompt: lastUserInput,
            toolName,
            input: part.input,
          })
          yield {
            type: 'tool-call',
            toolName,
            toolCallId: String(part.toolCallId),
            input: part.input,
          }
          break
        }
        case 'tool-result': {
          const toolName = String(part.toolName)
          await telemetry.emit('tool-result', { runId, input: lastUserInput, toolName, data: part.output })
          await recordAudit({
            action: 'tool-result',
            sessionId,
            runId,
            prompt: lastUserInput,
            toolName,
            output: part.output,
          })
          yield {
            type: 'tool-result',
            toolName,
            toolCallId: String(part.toolCallId),
            output: part.output,
          }
          break
        }
        case 'tool-approval-request': {
          const toolCall = part.toolCall as { toolName?: string; input?: unknown } | undefined
          await telemetry.emit('approval-request', {
            runId,
            input: lastUserInput,
            toolName: toolCall?.toolName,
            data: part.toolCall,
          })
          await recordAudit({
            action: 'approval-request',
            sessionId,
            runId,
            prompt: lastUserInput,
            toolName: toolCall?.toolName,
            input: toolCall?.input,
          })
          yield {
            type: 'approval-request',
            approvalId: String(part.approvalId),
            toolCall: part.toolCall,
          }
          break
        }
        case 'error':
          await telemetry.emit('error', { runId, input: lastUserInput, data: part.error })
          await recordAudit({ action: 'error', sessionId, runId, prompt: lastUserInput, output: part.error })
          yield { type: 'error', error: part.error }
          break
      }
    }
    yield* drainStatus()

    const response = await result.response
    messages.push(...response.messages)
    await telemetry.emit('run-finish', { runId, input: lastUserInput, data: { text } })
    yield { type: 'done', text }
  }

  return {
    async *send(input: string): AsyncGenerator<AgentEvent> {
      lastUserInput = input
      messages.push({ role: 'user', content: input })
      yield* run('send')
    },
    async *respondToApproval(approvalId: string, approved: boolean, reason?: string): AsyncGenerator<AgentEvent> {
      await telemetry.emit('approval-decision', {
        input: lastUserInput,
        approved,
        data: { approvalId, reason },
      })
      await recordAudit({
        action: 'approval-decision',
        sessionId,
        prompt: lastUserInput,
        approved,
        reason,
      })
      messages.push({
        role: 'tool',
        content: [
          {
            type: 'tool-approval-response',
            approvalId,
            approved,
            reason,
          },
        ],
      })
      yield* run('approval')
    },
    reset() {
      messages.length = 0
    },
  }
}

export function chromeAI(): ModelProvider {
  return createModelProvider({
    id: 'chrome-ai',
    label: 'Chrome AI',
    resolve: async context => {
      try {
        const { browserAI, doesBrowserSupportBrowserAI } = await import('@browser-ai/core')
        if (!doesBrowserSupportBrowserAI()) return null

        const model = browserAI('text')
        const availability = await maybeAvailability(model)
        if (availability === 'unavailable') return null

        if (availability === 'available' || availability === 'readily') {
          return model
        }

        const approved = await context.requestDownload({
          provider: 'chrome-ai',
          message: 'Enable built-in browser AI for smarter answers?',
        })
        if (!approved) return null

        context.emitStatus({
          provider: 'chrome-ai',
          status: 'downloading',
          progress: 0,
          message: 'Preparing Chrome AI...',
        })
        await maybeCreateSessionWithProgress(model, progress => {
          context.emitStatus({
            provider: 'chrome-ai',
            status: 'downloading',
            progress,
            message: `Preparing Chrome AI... ${Math.round(progress * 100)}%`,
          })
        })
        return model
      } catch (error) {
        context.emitStatus({
          provider: 'chrome-ai',
          status: 'error',
          message: readableError(error),
        })
        return null
      }
    },
  })
}

export interface WebLLMOptions {
  model?: string
  modelSize?: string
}

export function webLLM(options: WebLLMOptions = {}): ModelProvider {
  const modelId = options.model ?? 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC'
  return createModelProvider({
    id: 'webllm',
    label: 'WebLLM',
    resolve: async context => {
      try {
        const { createWebLLM, doesBrowserSupportWebLLM } = await import('@browser-ai/web-llm')
        if (!doesBrowserSupportWebLLM()) return null

        const approved = await context.requestDownload({
          provider: 'webllm',
          modelSize: options.modelSize,
          message: `Download ${options.modelSize ?? 'a local'} AI model for smarter answers?`,
        })
        if (!approved) return null

        const provider = createWebLLM()
        const model = provider(modelId, {
          initProgressCallback: progress => {
            context.emitStatus({
              provider: 'webllm',
              status: 'downloading',
              progress: progress.progress,
              message: progress.text ?? `Downloading WebLLM... ${Math.round(progress.progress * 100)}%`,
            })
          },
        })
        return model
      } catch (error) {
        context.emitStatus({
          provider: 'webllm',
          status: 'error',
          message: readableError(error),
        })
        return null
      }
    },
  })
}

function isModelProvider(value: ModelProvider | LanguageModelV3): value is ModelProvider {
  return 'resolve' in value && typeof value.resolve === 'function'
}

function normalizeAgUiType(type: string) {
  return type
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/-/g, '_')
    .toUpperCase()
}

async function* streamAgUiEndpoint(options: CreateAgUiAgentOptions, input: AgUiRunInput): AsyncGenerator<AgUiEvent> {
  if (!options.endpoint) throw new Error('createAgUiAgent requires either endpoint or run.')
  const fetchImpl = options.fetch ?? fetch
  const response = await fetchImpl(options.endpoint, {
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

async function resolveActiveTools(
  options: CreateAgentOptions,
  session: EdgeSessionContext,
  input: string,
  phase: 'send' | 'approval',
): Promise<Record<string, unknown>> {
  if (options.toolProvider) return options.toolProvider({ session, input, phase })
  if (options.toolManifests) return toolsFromManifests(filterToolManifestsForSession(options.toolManifests, session))
  return options.tools ?? {}
}

function canUseTool(manifest: EdgeToolManifest, identity: EdgeIdentity | undefined) {
  const roles = identity?.roles ?? []
  const permissions = identity?.permissions ?? []
  const roleAllowed = !manifest.roles?.length || manifest.roles.some(role => roles.includes(role))
  const permissionAllowed =
    !manifest.permissions?.length || manifest.permissions.every(permission => permissions.includes(permission))
  return roleAllowed && permissionAllowed
}

function withSessionSystemContext(systemPrompt: string, session: EdgeSessionContext) {
  const context: string[] = []
  const identity = publicIdentity(session.identity)

  if (identity) {
    context.push(`Current user: ${stableStringify(identity)}.`)
  }

  if (session.state) {
    context.push(`Current application state: ${stableStringify(session.state)}.`)
  }

  if (context.length === 0) return systemPrompt
  return `${systemPrompt}\n\nUse this host-provided context when helpful, but do not reveal hidden auth material:\n${context.join('\n')}`
}

function publicIdentity(identity: EdgeIdentity | undefined) {
  if (!identity) return undefined
  return {
    id: identity.id,
    tenantId: identity.tenantId,
    roles: identity.roles ?? [],
    permissions: identity.permissions ?? [],
  }
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

function jsonSchemaToZod(schema: unknown): z.ZodType {
  if (!isRecord(schema)) return z.record(z.string(), z.unknown())
  if (Array.isArray(schema.enum) && schema.enum.length > 0) return z.enum(schema.enum.map(String) as [string, ...string[]])

  switch (schema.type) {
    case 'object': {
      const properties = isRecord(schema.properties) ? schema.properties : {}
      const required = Array.isArray(schema.required) ? new Set(schema.required.map(String)) : new Set<string>()
      const shape = Object.fromEntries(
        Object.entries(properties).map(([key, value]) => {
          const field = jsonSchemaToZod(value)
          return [key, required.has(key) ? field : field.optional()]
        }),
      )
      return z.object(shape)
    }
    case 'string':
      return z.string()
    case 'number':
      return z.number()
    case 'integer':
      return z.number().int()
    case 'boolean':
      return z.boolean()
    case 'array':
      return z.array(jsonSchemaToZod(schema.items))
    default:
      return z.record(z.string(), z.unknown())
  }
}

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

function stableStringify(value: unknown): string {
  if (value == null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
  return `{${entries.join(',')}}`
}

function stableHash(payload: string): string {
  let hash = 2166136261
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `fnv1a:${(hash >>> 0).toString(16).padStart(8, '0')}`
}

async function maybeAvailability(model: unknown): Promise<string | undefined> {
  if (typeof model === 'object' && model && 'availability' in model) {
    const availability = (model as { availability: () => Promise<string> }).availability
    if (typeof availability === 'function') return availability.call(model)
  }
  return undefined
}

async function maybeCreateSessionWithProgress(
  model: unknown,
  onProgress: (progress: number) => void,
): Promise<void> {
  if (typeof model === 'object' && model && 'createSessionWithProgress' in model) {
    const createSessionWithProgress = (
      model as { createSessionWithProgress: (onProgress: (progress: number) => void) => Promise<unknown> }
    ).createSessionWithProgress
    if (typeof createSessionWithProgress === 'function') {
      await createSessionWithProgress.call(model, onProgress)
    }
  }
}

function readableError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number | undefined): Promise<T | null> {
  if (!timeoutMs) return promise

  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<null>(resolve => {
        timer = setTimeout(() => resolve(null), timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}
