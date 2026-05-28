import { generateText as aiGenerateText, streamText as aiStreamText, stepCountIs } from 'ai'
import type { ModelMessage } from 'ai'
import type { LanguageModelV3 } from '@ai-sdk/provider'
import type { EdgeViewNode } from './view'
import type { ContextualToolExecute, EdgeIdentityProvider, EdgeSessionContext, EdgeSessionProvider, EdgeStateProvider, EdgeToolExecutionContext, EdgeToolManifest, EdgeToolProvider } from './context'
import { filterToolManifestsForSession, publicIdentity, resolveSessionContext, toolsFromManifests, withToolContext } from './context'
import type { EdgeActivityEvent, EdgeTelemetrySink } from './telemetry'
import { createTelemetryDispatcher } from './telemetry'
import type { DownloadPolicy, DownloadPromptEvent, ModelProvider, ModelStatusEvent, NoModelEvent } from './cascade'
import { resolveModel } from './cascade'
import { chromeAI } from './providers/chrome-ai'
import { webLLM } from './providers/web-llm'
import type { CascadeReadinessSnapshot, EdgeCascadeReadinessController } from './cascade/readiness'
import type { EdgeMemoryCompactionContext, EdgeMemoryRecord, EdgeMemorySearchContext, EdgeMemoryStore } from './compat/knowledge'
import type { EdgeAuditEvent, EdgeAuditTrail, EdgeRedactor, EdgeRedactorContext } from './compat/governance'
import { applyRedactors } from './compat/governance'
import type { EdgeResponseCache, EdgeResponseCacheContext, EdgeResponseCachePolicy } from './compat/cache'
import { resolveCachePolicy } from './compat/cache'
import { createHandoffEnvelope } from './compat/agui'
import type { EdgeModelRouter } from './compat/routing'
import { createId, isRecord, readableError, stableStringify } from './shared'

// Phase D leaves Edgekit-specific telemetry, redaction, cache, approval, and handoff wiring here.
// Model/tool orchestration itself stays in AI SDK streamText via stopWhen and experimental_repairToolCall.
export type AgentEvent =
  | { type: 'status'; event: ModelStatusEvent }
  | { type: 'activity'; activity: EdgeActivityEvent }
  | { type: 'text-delta'; text: string }
  | { type: 'tool-call'; toolName: string; toolCallId: string; input: unknown }
  | { type: 'tool-result'; toolName: string; toolCallId: string; output: unknown }
  | { type: 'view'; view: EdgeViewNode | EdgeViewNode[] }
  | { type: 'approval-request'; approvalId: string; toolCall: unknown }
  | { type: 'no-model'; message: string; readiness?: CascadeReadinessSnapshot }
  | { type: 'error'; error: unknown }
  | { type: 'done'; text: string }

type StreamTextFn = typeof aiStreamText
type GenerateTextFn = typeof aiGenerateText
type EdgeModelMessage =
  | ModelMessage
  | {
      role: 'tool'
      content: Array<{
        type: 'tool-approval-response'
        approvalId: string
        approved: boolean
        reason?: string
        toolCall?: unknown
      }>
    }

export interface EdgeToolRepairOptions {
  maxAttempts?: number
  shouldRepair?: (error: unknown, attempt: number) => boolean
  instruction?: (error: unknown, attempt: number) => string
}

export interface EdgeAgent {
  send(input: string): AsyncGenerator<AgentEvent>
  respondToApproval(approvalId: string, approved: boolean, reason?: string): AsyncGenerator<AgentEvent>
  reset(): void
}

export interface CreateAgentOptions {
  systemPrompt: string
  tools?: Record<string, unknown>
  toolProvider?: EdgeToolProvider
  toolManifests?: EdgeToolManifest[]
  memory?: EdgeMemoryStore | EdgeMemoryStore[]
  memoryLimit?: number
  redactors?: EdgeRedactor | EdgeRedactor[]
  sessionProvider?: EdgeSessionProvider
  identityProvider?: EdgeIdentityProvider
  stateProvider?: EdgeStateProvider
  model?: Array<ModelProvider | LanguageModelV3>
  modelRouter?: EdgeModelRouter
  memoryCompaction?: boolean | { thresholdTokens?: number; maxSnapshotTokens?: number }
  toolRepair?: boolean | EdgeToolRepairOptions
  responseCache?: EdgeResponseCache
  cachePolicy?: boolean | EdgeResponseCachePolicy
  downloadPolicy?: DownloadPolicy
  maxSteps?: number
  modelResolveTimeoutMs?: number
  cascadeReadiness?: EdgeCascadeReadinessController
  toolChoice?: 'auto' | 'required' | 'none' | Record<string, unknown>
  sessionId?: string
  telemetry?: EdgeTelemetrySink | EdgeTelemetrySink[]
  auditTrail?: EdgeAuditTrail
  onModelStatus?: (event: ModelStatusEvent) => string | null | void
  onDownloadPrompt?: (event: DownloadPromptEvent) => boolean | Promise<boolean>
  onNoModel?: (event: NoModelEvent) => string | null | void
  streamText?: StreamTextFn
  generateText?: GenerateTextFn
}

export function createAgent(options: CreateAgentOptions): EdgeAgent {
  const downloadPolicy = options.downloadPolicy ?? 'prompt'
  const maxSteps = options.maxSteps ?? 5
  const streamText = options.streamText ?? aiStreamText
  const providers = options.model ?? [chromeAI(), webLLM()]
  const sessionId = options.sessionId ?? createId('session')
  const telemetry = createTelemetryDispatcher(options.telemetry, sessionId)
  let messages: EdgeModelMessage[] = []
  const pendingApprovalToolCalls = new Map<string, unknown>()
  let lastUserInput = ''

  const appendMessages = (nextMessages: EdgeModelMessage | EdgeModelMessage[]) => {
    messages = [...messages, ...(Array.isArray(nextMessages) ? nextMessages : [nextMessages])]
  }

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
    options.cascadeReadiness?.update({
      providers,
      downloadPolicy,
      tools: activeTools,
      fallback: Boolean(options.onNoModel),
    })
    const compactionResults = await compactMemoryStores(options, session, lastUserInput)
    const memoryRecords = await resolveMemoryRecords(options, session, lastUserInput)
    const toolContext: EdgeToolExecutionContext = {
      session,
      identity: session.identity,
      auth: session.auth,
      state: session.state,
    }
    const contextualTools = withToolContext(activeTools, toolContext)
    const system = withSessionSystemContext(options.systemPrompt, session, memoryRecords)
    const cacheContext: EdgeResponseCacheContext = {
      input: lastUserInput,
      session,
      state: session.state,
      memory: memoryRecords,
      tools: Object.keys(contextualTools),
      phase,
    }
    const cachePolicy = resolveCachePolicy(options.cachePolicy)
    const cacheKey = options.responseCache && phase === 'send' ? await cachePolicy.key(cacheContext) : null
    const handoff = createHandoffEnvelope({
      input: lastUserInput,
      messages: [...messages],
      session,
      memory: memoryRecords,
      tools: toolMetadata(options, contextualTools, session),
      trace: { sessionId, runId, phase },
      redactionApplied: Boolean(options.redactors),
    })
    await telemetry.emit('run-start', {
      runId,
      input: lastUserInput,
      data: {
        phase,
        identity: publicIdentity(session.identity),
        state: session.state,
        tools: Object.keys(contextualTools),
        memory: memoryRecords.map(record => ({ id: record.id, title: record.title, source: record.source })),
        handoff: { id: handoff.id, approximateTokens: handoff.approximateTokens },
      },
    })

    const makeActivity = async (label: string, status: EdgeActivityEvent['status'], data?: Partial<EdgeActivityEvent>) => {
      const activity: EdgeActivityEvent = {
        id: data?.id ?? createId('activity'),
        label,
        status,
        detail: data?.detail,
        toolName: data?.toolName,
        data: data?.data,
      }
      await telemetry.emit('activity', { runId, input: lastUserInput, toolName: activity.toolName, data: activity })
      return { type: 'activity', activity } satisfies AgentEvent
    }

    for (const result of compactionResults) {
      if (!result.compacted) continue
      yield await makeActivity('Compacting memory', 'completed', { data: result })
      await telemetry.emit('memory-compact', {
        runId,
        input: lastUserInput,
        data: {
          approximateTokens: result.approximateTokens,
          thresholdTokens: result.thresholdTokens,
          snapshot: result.snapshot,
        },
      })
    }

    if (options.responseCache && cacheKey && await cachePolicy.shouldRead(cacheContext)) {
      const cached = await options.responseCache.get(cacheKey)
      if (cached) {
        yield await makeActivity('Using cached response', 'completed', { data: { key: cacheKey } })
        appendMessages({ role: 'assistant', content: [{ type: 'text', text: cached.text }] })
        await telemetry.emit('run-finish', { runId, input: lastUserInput, data: { text: cached.text, cached: true } })
        yield { type: 'text-delta', text: cached.text }
        yield { type: 'done', text: cached.text }
        return
      }
    }

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
          handoff,
        })
      : providers

    const resolved = await resolveModel(selectedProviders, {
      downloadPolicy,
      timeoutMs: options.modelResolveTimeoutMs ?? 3_000,
      emitStatus: event => {
        const displayEvent = emitStatus(event)
        options.cascadeReadiness?.recordStatus(displayEvent)
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
      const readiness = options.cascadeReadiness?.getSnapshot()
      const message = options.onNoModel?.({
        availableTools: Object.keys(contextualTools),
        input: lastUserInput,
        message: defaultMessage,
        readiness,
      }) ?? defaultMessage
      await telemetry.emit('model-unavailable', { runId, input: lastUserInput, data: { availableTools: Object.keys(contextualTools) } })
      yield { type: 'no-model', message, readiness }
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
    let terminalError = false
    let usedTools = false
    const toolRepair = resolveToolRepairOptions(options.toolRepair)
    const repairEvents: AgentEvent[] = []

    const drainRepairEvents = function* () {
      while (repairEvents.length > 0) {
        yield repairEvents.shift()!
      }
    }

    const repairToolCall = toolRepair
      ? createToolCallRepair({
          toolRepair,
          generateText: options.generateText ?? aiGenerateText,
          model: resolved.model,
          enqueueActivity: async (attempt, error) => {
            repairEvents.push(await makeActivity('Repairing tool arguments', 'started', { data: { attempt } }))
            await telemetry.emit('tool-repair', {
              runId,
              input: lastUserInput,
              data: { attempt, error: readableError(error) },
            })
          },
        })
      : undefined

    const result = (streamText as never as (options: Record<string, unknown>) => ReturnType<StreamTextFn>)({
      model: resolved.model,
      system,
      messages: [...messages],
      tools: contextualTools,
      toolChoice: options.toolChoice,
      stopWhen: stepCountIs(maxSteps),
      experimental_repairToolCall: repairToolCall,
    })

    for await (const part of result.fullStream as AsyncIterable<Record<string, unknown>>) {
      yield* drainStatus()
      yield* drainRepairEvents()
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
          usedTools = true
          yield await makeActivity(`Running ${toolName}`, 'started', { toolName, data: part.input })
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
          usedTools = true
          const redactedOutput = await applyRedactors(part.output, options.redactors, {
            ...toolContext,
            toolName,
            phase: 'tool-result',
          })
          yield await makeActivity(`Completed ${toolName}`, 'completed', { toolName })
          await telemetry.emit('tool-result', { runId, input: lastUserInput, toolName, data: redactedOutput })
          await recordAudit({
            action: 'tool-result',
            sessionId,
            runId,
            prompt: lastUserInput,
            toolName,
            output: redactedOutput,
          })
          yield {
            type: 'tool-result',
            toolName,
            toolCallId: String(part.toolCallId),
            output: redactedOutput,
          }
          break
        }
        case 'tool-approval-request': {
          const toolCall = part.toolCall as { toolName?: string; input?: unknown } | undefined
          const approvalId = String(part.approvalId)
          pendingApprovalToolCalls.set(approvalId, part.toolCall)
          usedTools = true
          yield await makeActivity('Waiting for approval', 'started', { toolName: toolCall?.toolName })
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
            approvalId,
            toolCall: part.toolCall,
          }
          break
        }
        case 'error': {
          terminalError = true
          await telemetry.emit('error', { runId, input: lastUserInput, data: part.error })
          await recordAudit({ action: 'error', sessionId, runId, prompt: lastUserInput, output: part.error })
          yield { type: 'error', error: part.error }
          break
        }
      }
      if (terminalError) break
    }
    yield* drainStatus()
    yield* drainRepairEvents()

    if (!terminalError) {
      const response = await result.response
      const historyMessages = await redactModelMessagesForHistory(response.messages, options.redactors, toolContext)
      appendMessages(historyMessages)
    }

    if (
      options.responseCache &&
      cacheKey &&
      text &&
      await cachePolicy.shouldWrite({ ...cacheContext, text, usedTools })
    ) {
      const createdAt = new Date().toISOString()
      const expiresAt = cachePolicy.ttlMs ? new Date(Date.parse(createdAt) + cachePolicy.ttlMs).toISOString() : undefined
      await options.responseCache.set({
        key: cacheKey,
        text,
        createdAt,
        expiresAt,
        metadata: { state: session.state, tools: Object.keys(contextualTools) },
      })
      yield await makeActivity('Saved response cache', 'completed', { data: { key: cacheKey } })
    }

    await telemetry.emit('run-finish', { runId, input: lastUserInput, data: { text } })
    yield { type: 'done', text }
  }

  return {
    async *send(input: string): AsyncGenerator<AgentEvent> {
      lastUserInput = input
      appendMessages({ role: 'user', content: input })
      yield* run('send')
    },
    async *respondToApproval(approvalId: string, approved: boolean, reason?: string): AsyncGenerator<AgentEvent> {
      const toolCall = pendingApprovalToolCalls.get(approvalId)
      pendingApprovalToolCalls.delete(approvalId)
      await telemetry.emit('approval-decision', {
        input: lastUserInput,
        approved,
        data: { approvalId, reason, toolCall },
      })
      await recordAudit({
        action: 'approval-decision',
        sessionId,
        prompt: lastUserInput,
        approved,
        reason,
      })
      const approvalMessage: EdgeModelMessage = {
        role: 'tool',
        content: [
          {
            type: 'tool-approval-response',
            approvalId,
            approved,
            reason,
            toolCall,
          },
        ],
      }
      const session = await resolveSessionContext(options)
      const toolContext: EdgeToolExecutionContext = {
        session,
        identity: session.identity,
        auth: session.auth,
        state: session.state,
      }
      const [historyMessage] = await redactModelMessagesForHistory([approvalMessage], options.redactors, toolContext)
      appendMessages(historyMessage)
      yield* run('approval')
    },
    reset() {
      messages = []
    },
  }
}

async function redactModelMessagesForHistory(
  responseMessages: EdgeModelMessage[],
  redactors: EdgeRedactor | EdgeRedactor[] | undefined,
  context: EdgeToolExecutionContext,
): Promise<EdgeModelMessage[]> {
  if (!redactors) return responseMessages
  const redacted = await Promise.all(
    responseMessages.map(message => redactModelHistoryValue(message, redactors, context, undefined, 'message')),
  )
  return redacted as EdgeModelMessage[]
}

async function redactModelHistoryValue(
  value: unknown,
  redactors: EdgeRedactor | EdgeRedactor[],
  context: EdgeToolExecutionContext,
  inheritedToolName?: string,
  location: 'message' | 'content' | 'part' | 'payload' = 'payload',
): Promise<unknown> {
  if (typeof value === 'string') return redactModelHistoryText(value, redactors, context, inheritedToolName)
  if (Array.isArray(value)) {
    const childLocation = location === 'content' ? 'part' : 'payload'
    return Promise.all(value.map(item => redactModelHistoryValue(item, redactors, context, inheritedToolName, childLocation)))
  }
  if (!isRecord(value)) return value

  const toolName = typeof value.toolName === 'string' ? value.toolName : inheritedToolName
  const next = Object.fromEntries(
    await Promise.all(
      Object.entries(value).map(async ([key, item]) => {
        if (shouldPreserveModelHistoryKey(location, value, key)) return [key, item]
        const childLocation = location === 'message' && key === 'content' ? 'content' : 'payload'
        return [key, await redactModelHistoryValue(item, redactors, context, toolName, childLocation)]
      }),
    ),
  )
  if (value.type === 'tool-approval-response' && 'toolCall' in value) {
    const approvalToolName = extractModelHistoryToolName(value.toolCall) ?? toolName ?? 'approval'
    next.toolCall = await redactToolResultPayload(next.toolCall, redactors, context, approvalToolName)
    return next
  }
  if (value.type === 'tool-result' && typeof toolName === 'string') {
    if ('output' in value) {
      next.output = await redactToolResultPayload(next.output, redactors, context, toolName)
    }
    if ('result' in value) {
      next.result = await redactToolResultPayload(next.result, redactors, context, toolName)
    }
  }
  return next
}

async function redactToolResultPayload(
  payload: unknown,
  redactors: EdgeRedactor | EdgeRedactor[],
  context: EdgeToolExecutionContext,
  toolName: string,
): Promise<unknown> {
  const redactionContext: EdgeRedactorContext = {
    ...context,
    toolName,
    phase: 'tool-result',
  }
  if (isAiSdkOutputWrapper(payload)) {
    const redactedEntries = await Promise.all(
      Object.entries(payload).map(async ([key, item]) => {
        if (key === 'type') return [key, item]
        const redactedItem = await redactModelHistoryValue(item, redactors, context, toolName, 'payload')
        return [key, await applyRedactors(redactedItem, redactors, redactionContext)]
      }),
    )
    return Object.fromEntries(redactedEntries)
  }
  const redactedPayload = await redactModelHistoryValue(payload, redactors, context, toolName, 'payload')
  return applyRedactors(redactedPayload, redactors, redactionContext)
}

async function redactModelHistoryText(
  text: string,
  redactors: EdgeRedactor | EdgeRedactor[],
  context: EdgeToolExecutionContext,
  toolName?: string,
) {
  let current: unknown = await applyRedactors(text, redactors, { ...context, phase: 'tool-result' })
  if (toolName) {
    current = await applyRedactors(current, redactors, { ...context, toolName, phase: 'tool-result' })
  }
  return typeof current === 'string' ? current : String(current)
}

function extractModelHistoryToolName(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined
  return typeof value.toolName === 'string' ? value.toolName : undefined
}

function shouldPreserveModelHistoryKey(
  location: 'message' | 'content' | 'part' | 'payload',
  value: Record<string, unknown>,
  key: string,
) {
  if (location === 'message') return key === 'role'
  if (value.type === 'tool-call') return key === 'type' || key === 'toolName' || key === 'toolCallId'
  if (location !== 'part') return false
  if (value.type === 'tool-result') return key === 'type' || key === 'toolName' || key === 'toolCallId'
  if (value.type === 'tool-approval-request') return key === 'type' || key === 'approvalId' || key === 'toolCallId'
  if (value.type === 'tool-approval-response') return key === 'type' || key === 'approvalId' || key === 'toolCallId' || key === 'approved'
  if (value.type === 'text') return key === 'type'
  return false
}

function isAiSdkOutputWrapper(value: unknown): value is Record<string, unknown> & { type: string; value: unknown } {
  return isRecord(value) && 'value' in value && (value.type === 'json' || value.type === 'text')
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

async function compactMemoryStores(options: CreateAgentOptions, session: EdgeSessionContext, input: string) {
  const stores = Array.isArray(options.memory) ? options.memory : options.memory ? [options.memory] : []
  if (stores.length === 0 || !options.memoryCompaction) return []

  const config = typeof options.memoryCompaction === 'object' ? options.memoryCompaction : {}
  const context: EdgeMemoryCompactionContext = {
    input,
    session,
    state: session.state,
    thresholdTokens: config.thresholdTokens ?? 2_000,
    maxSnapshotTokens: config.maxSnapshotTokens,
  }
  const results = await Promise.all(stores.filter(store => store.compact).map(store => store.compact!(context)))
  return results
}

async function resolveMemoryRecords(options: CreateAgentOptions, session: EdgeSessionContext, input: string) {
  const stores = Array.isArray(options.memory) ? options.memory : options.memory ? [options.memory] : []
  if (stores.length === 0) return []

  const limit = options.memoryLimit ?? 5
  const context: EdgeMemorySearchContext = { input, session, state: session.state }
  const records = await Promise.all(stores.map(store => store.search(input, context)))
  return records.flat().slice(0, limit)
}

function toolMetadata(
  options: CreateAgentOptions,
  activeTools: Record<string, unknown>,
  session: EdgeSessionContext,
): Array<{ name: string; description?: string }> {
  if (options.toolManifests) {
    return filterToolManifestsForSession(options.toolManifests, session)
      .map(manifest => ({ name: manifest.name, description: manifest.description }))
  }
  return Object.keys(activeTools).map(name => ({ name }))
}

function resolveToolRepairOptions(options: CreateAgentOptions['toolRepair']): Required<EdgeToolRepairOptions> | null {
  if (options === false) return null
  const provided = typeof options === 'object' ? options : {}
  return {
    maxAttempts: provided.maxAttempts ?? 3,
    shouldRepair: provided.shouldRepair ?? defaultShouldRepairToolError,
    instruction: provided.instruction ?? defaultToolRepairInstruction,
  }
}

function createToolCallRepair(options: {
  toolRepair: Required<EdgeToolRepairOptions>
  generateText: GenerateTextFn
  model: LanguageModelV3
  enqueueActivity: (attempt: number, error: unknown) => Promise<void>
}) {
  let attempts = 0

  return async function repairToolCall({
    toolCall,
    tools,
    system,
    messages,
    error,
  }: {
    toolCall: { toolCallId: string; toolName: string; input: string }
    tools: Record<string, unknown>
    system: unknown
    messages: ModelMessage[]
    error: unknown
  }) {
    const attempt = attempts + 1
    if (attempt > options.toolRepair.maxAttempts || !options.toolRepair.shouldRepair(error, attempt)) return null

    attempts = attempt
    await options.enqueueActivity(attempt, error)

    const instruction = options.toolRepair.instruction(error, attempt)
    const repairPrompt: ModelMessage[] = [
      ...messages,
      {
        role: 'assistant',
        content: [
          {
            type: 'tool-call',
            toolCallId: toolCall.toolCallId,
            toolName: toolCall.toolName,
            input: toolCall.input,
          },
        ],
      },
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: toolCall.toolCallId,
            toolName: toolCall.toolName,
            output: { type: 'error-text', value: readableError(error) },
          },
        ],
      } satisfies ModelMessage,
      { role: 'user', content: instruction },
    ]

    const result = await (options.generateText as never as (options: Record<string, unknown>) => Promise<{ toolCalls?: Array<{ toolName: string; input: unknown }> }>)({
      model: options.model,
      system,
      messages: repairPrompt,
      tools,
      toolChoice: { type: 'tool', toolName: toolCall.toolName },
    })
    const repairedCall = result.toolCalls?.find(nextCall => nextCall.toolName === toolCall.toolName)
    if (!repairedCall) return null

    return {
      ...toolCall,
      input: JSON.stringify(repairedCall.input),
    }
  }
}

function defaultShouldRepairToolError(error: unknown) {
  const text = readableError(error).toLowerCase()
  const name = isRecord(error) && typeof error.name === 'string' ? error.name.toLowerCase() : ''
  return [
    'typevalidationerror',
    'validation',
    'invalid tool',
    'tool arguments',
    'zod',
    'schema',
  ].some(marker => name.includes(marker) || text.includes(marker))
}

function defaultToolRepairInstruction(error: unknown, attempt: number) {
  return [
    `The previous tool call failed validation on repair attempt ${attempt}.`,
    `Validation error: ${readableError(error)}`,
    'Correct the tool arguments to match the registered schema. Do not apologize. Do not ask the user to repeat themselves. Retry the appropriate tool call with valid JSON only.',
  ].join('\n')
}

function withSessionSystemContext(systemPrompt: string, session: EdgeSessionContext, memoryRecords: EdgeMemoryRecord[] = []) {
  const context: string[] = []
  const identity = publicIdentity(session.identity)

  if (identity) {
    context.push(`Current user: ${stableStringify(identity)}.`)
  }

  if (session.state) {
    context.push(`Current application state: ${stableStringify(session.state)}.`)
  }

  if (memoryRecords.length > 0) {
    context.push(`Relevant memory:\n${memoryRecords.map(formatMemoryRecord).join('\n')}`)
  }

  if (context.length === 0) return systemPrompt
  return `${systemPrompt}\n\nUse this host-provided context when helpful, but do not reveal hidden auth material:\n${context.join('\n')}`
}

function formatMemoryRecord(record: EdgeMemoryRecord) {
  const title = record.title ? `${record.title}: ` : ''
  return `- ${title}${record.body}`
}
