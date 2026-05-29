import { generateText as aiGenerateText, streamText as aiStreamText, stepCountIs } from 'ai'
import type { ModelMessage } from 'ai'
import type { LanguageModelV3 } from '@ai-sdk/provider'
import type { EdgeViewNode } from './view'
import type { ContextualToolExecute, EdgeIdentityProvider, EdgeSessionContext, EdgeSessionProvider, EdgeStateProvider, EdgeToolExecutionContext, EdgeToolManifest, EdgeToolProvider } from './context'
import { filterToolManifestsForSession, publicIdentity, resolveSessionContext, toolsFromManifests, withToolContext } from './context'
import type { EdgeActivityEvent, EdgeTelemetrySink } from './telemetry'
import { createTelemetryDispatcher } from './telemetry'
import type { DownloadPolicy, DownloadPromptEvent, ModelProvider, ModelStatusEvent, NoModelEvent } from './cascade'
import { createModelProvider, resolveModel } from './cascade'
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

export type EdgeGroundingMode = 'none' | 'soft' | 'strict'

export interface EdgeAgentIdentity {
  name: string
  description?: string
  persona?: string
  noEvidenceMessage?: string
  modelDisclosure?: 'none' | 'technical'
}

export interface EdgeEvidenceRecord {
  toolName: string
  output: unknown
}

export interface EdgeResponseValidationContext {
  input: string
  text: string
  toolsCalled: string[]
  toolResults: EdgeEvidenceRecord[]
  evidenceCount: number
  session: EdgeSessionContext
  provider?: { id: string; label: string }
  agentIdentity?: EdgeAgentIdentity
  grounding: EdgeGroundingMode
}

export type EdgeResponseValidator = (
  context: EdgeResponseValidationContext,
) => string | null | void | Promise<string | null | void>

export type EdgeNoModelToolCaller = (
  name: string,
  input: Record<string, unknown>,
  options?: { readOnlyOnly?: boolean },
) => Promise<unknown>

export type EdgeNoModelHandler = (
  event: NoModelEvent & {
    session: EdgeSessionContext
    history: EdgeModelMessage[]
    callTool: EdgeNoModelToolCaller
  },
) => string | null | void | Promise<string | null | void>

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
  agentIdentity?: EdgeAgentIdentity
  grounding?: EdgeGroundingMode
  validateResponse?: EdgeResponseValidator
  sessionId?: string
  telemetry?: EdgeTelemetrySink | EdgeTelemetrySink[]
  auditTrail?: EdgeAuditTrail
  onModelStatus?: (event: ModelStatusEvent) => string | null | void
  onDownloadPrompt?: (event: DownloadPromptEvent) => boolean | Promise<boolean>
  onNoModel?: EdgeNoModelHandler
  streamText?: StreamTextFn
  generateText?: GenerateTextFn
}

export function createAgent(options: CreateAgentOptions): EdgeAgent {
  const downloadPolicy = options.downloadPolicy ?? 'prompt'
  const maxSteps = options.maxSteps ?? 5
  const streamText = options.streamText ?? aiStreamText
  const providers = options.model ?? []
  const sessionId = options.sessionId ?? createId('session')
  const telemetry = createTelemetryDispatcher(options.telemetry, sessionId)
  const grounding = options.grounding ?? 'none'
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
    const baseSystem = withAgentRuntimeSystemContext(options.systemPrompt, {
      agentIdentity: options.agentIdentity,
      grounding,
    })
    const system = withSessionSystemContext(baseSystem, session, memoryRecords)
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
        const cachedStrictEvidence =
          cached.metadata?.grounding === 'strict' &&
          cached.metadata?.hasUsableEvidence === true
        if (grounding !== 'strict' || cachedStrictEvidence) {
          const cachedText = await validateAgentResponse({
            options,
            grounding,
            input: lastUserInput,
            text: cached.text,
            toolsCalled: cachedStrictEvidence ? ['responseCache'] : [],
            toolResults: cachedStrictEvidence
              ? [{ toolName: 'responseCache', output: { results: ['previously validated tool-backed response'] } }]
              : [],
            session,
          })
          yield await makeActivity('Using cached response', 'completed', { data: { key: cacheKey } })
          appendMessages(assistantTextMessage(cachedText))
          await telemetry.emit('run-finish', { runId, input: lastUserInput, data: { text: cachedText, cached: true, grounding } })
          yield { type: 'text-delta', text: cachedText }
          yield { type: 'done', text: cachedText }
          return
        }
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
      const rawCallTool = createNoModelToolCaller({
        tools: contextualTools,
        manifests: options.toolManifests,
        session,
      })
      const toolsCalled: string[] = []
      const toolResults: EdgeEvidenceRecord[] = []
      const callTool: EdgeNoModelToolCaller = async (name, input, callOptions) => {
        const output = await rawCallTool(name, input, callOptions)
        const redactedOutput = options.redactors
          ? await redactToolResultPayload(output, options.redactors, toolContext, name)
          : output
        toolsCalled.push(name)
        toolResults.push({ toolName: name, output: redactedOutput })
        return redactedOutput
      }
      const fallbackMessage = await options.onNoModel?.({
        availableTools: Object.keys(contextualTools),
        input: lastUserInput,
        message: defaultMessage,
        readiness,
        session,
        history: [...messages],
        callTool,
      }) ?? defaultNoModelMessage(options.agentIdentity, defaultMessage)
      const message = await validateAgentResponse({
        options,
        grounding,
        input: lastUserInput,
        text: fallbackMessage,
        toolsCalled,
        toolResults,
        session,
      })
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
    const toolsCalled: string[] = []
    const toolResults: EdgeEvidenceRecord[] = []
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
      toolChoice: options.toolChoice ?? (grounding === 'strict' && Object.keys(contextualTools).length > 0 ? 'required' : undefined),
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
          if (grounding !== 'strict') {
            yield { type: 'text-delta', text: delta }
          }
          break
        }
        case 'tool-call': {
          const toolName = String(part.toolName)
          usedTools = true
          toolsCalled.push(toolName)
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
          toolsCalled.push(toolName)
          const redactedOutput = await applyRedactors(part.output, options.redactors, {
            ...toolContext,
            toolName,
            phase: 'tool-result',
          })
          toolResults.push({ toolName, output: redactedOutput })
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
      const originalText = text
      const nextText = await validateAgentResponse({
        options,
        grounding,
        input: lastUserInput,
        text,
        toolsCalled,
        toolResults,
        session,
        provider: { id: resolved.provider.id, label: resolved.provider.label },
      })
      text = nextText
      appendMessages(text === originalText ? historyMessages : assistantTextMessage(text))
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
        metadata: {
          state: session.state,
          tools: Object.keys(contextualTools),
          grounding,
          evidenceCount: toolResults.length,
          hasUsableEvidence: toolResults.some(result => hasUsableToolEvidence(result.output)),
        },
      })
      yield await makeActivity('Saved response cache', 'completed', { data: { key: cacheKey } })
    }

    if (!terminalError && grounding === 'strict' && text) {
      yield { type: 'text-delta', text }
    }
    await telemetry.emit('run-finish', { runId, input: lastUserInput, data: { text, grounding, evidenceCount: toolResults.length } })
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

function withAgentRuntimeSystemContext(
  systemPrompt: string,
  context: { agentIdentity?: EdgeAgentIdentity; grounding: EdgeGroundingMode },
) {
  const additions: string[] = []
  const identity = context.agentIdentity

  if (identity?.name) {
    additions.push([
      `Assistant identity: You are ${identity.name}.`,
      identity.description ? identity.description : '',
      identity.persona ? `Tone/persona: ${identity.persona}.` : '',
      identity.modelDisclosure === 'technical'
        ? 'You may separately explain the current model/runtime only when asked and only as inference machinery, not as your identity.'
        : 'Do not identify yourself as a specific model, model provider, or creator team unless the developer explicitly configured that wording.',
    ].filter(Boolean).join(' '))
  }

  if (context.grounding === 'strict') {
    additions.push([
      'Strict grounding mode is enabled.',
      'For factual questions, use the registered evidence tools before answering.',
      'Answer only from configured assistant identity, host-provided context, memory, current runtime status, or tool results.',
      'If the evidence does not support a claim, say that you do not know from the available site/app evidence.',
      'Distinguish the Edgekit runtime, the configured assistant identity, and the model used for inference when the user asks what they are chatting with.',
      'Never fill gaps with pretrained facts about people, companies, affiliations, products, or biographies.',
    ].join(' '))
  } else if (context.grounding === 'soft') {
    additions.push('Prefer registered tools and host-provided evidence for factual claims. Say when the available evidence is insufficient.')
  }

  if (additions.length === 0) return systemPrompt
  return `${systemPrompt}\n\n${additions.join('\n')}`
}

async function validateAgentResponse(context: {
  options: CreateAgentOptions
  grounding: EdgeGroundingMode
  input: string
  text: string
  toolsCalled: string[]
  toolResults: EdgeEvidenceRecord[]
  session: EdgeSessionContext
  provider?: { id: string; label: string }
}) {
  const validationContext: EdgeResponseValidationContext = {
    input: context.input,
    text: context.text,
    toolsCalled: [...new Set(context.toolsCalled)],
    toolResults: context.toolResults,
    evidenceCount: context.toolResults.length,
    session: context.session,
    provider: context.provider,
    agentIdentity: context.options.agentIdentity,
    grounding: context.grounding,
  }

  const defaultReplacement = defaultStrictResponseReplacement(validationContext)
  if (defaultReplacement != null) return defaultReplacement

  const customReplacement = await context.options.validateResponse?.(validationContext)
  return customReplacement == null ? context.text : customReplacement
}

function defaultStrictResponseReplacement(context: EdgeResponseValidationContext) {
  if (context.grounding !== 'strict') return null
  const noEvidenceMessage = context.agentIdentity?.noEvidenceMessage ?? 'I do not know from the available site/app evidence.'
  const lower = context.text.toLowerCase()
  const modelIdentityPatterns = [
    'created by the gemma team',
    'i am gemma',
    "i'm gemma",
    'as gemma',
    'created by google',
    'created by openai',
    'created by anthropic',
  ]
  if (modelIdentityPatterns.some(pattern => lower.includes(pattern))) {
    return noEvidenceMessage
  }

  if (isConfiguredIdentityAnswer(context, lower)) {
    return null
  }

  if (
    context.toolsCalled.length === 0
    || context.evidenceCount === 0
    || !context.toolResults.some(result => hasUsableToolEvidence(result.output))
  ) {
    return noEvidenceMessage
  }

  return null
}

function isConfiguredIdentityAnswer(context: EdgeResponseValidationContext, lowerText: string) {
  if (!/\b(who are you|what are you|are you edgekit|are you gemma|which model|model identity)\b/i.test(context.input)) {
    return false
  }
  const identityName = context.agentIdentity?.name?.toLowerCase()
  const namesConfiguredIdentity = identityName ? lowerText.includes(identityName) : false
  const namesEdgekitRuntime = /\bedgekit\b/.test(lowerText) && /\b(runtime|component|widget|powers|built with)\b/.test(lowerText)
  const separatesModel = /\bmodel\b/.test(lowerText) && /\b(inference|runtime|machinery|separate)\b/.test(lowerText)
  return namesConfiguredIdentity || namesEdgekitRuntime || separatesModel
}

function hasUsableToolEvidence(output: unknown): boolean {
  if (Array.isArray(output)) return output.length > 0
  if (!isRecord(output)) return output != null
  if ('error' in output) return false

  const resultLists = ['results', 'matches', 'items', 'records', 'documents', 'citations']
  for (const key of resultLists) {
    if (key in output) {
      const value = output[key]
      return Array.isArray(value) ? value.length > 0 : Boolean(value)
    }
  }

  return Object.entries(output)
    .filter(([key]) => !['query', 'input', 'currentPage', 'freshness', 'source'].includes(key))
    .some(([, value]) => {
      if (Array.isArray(value)) return value.length > 0
      if (isRecord(value)) return Object.keys(value).length > 0
      return value != null && value !== ''
    })
}

function assistantTextMessage(text: string): ModelMessage {
  return { role: 'assistant', content: [{ type: 'text', text }] }
}

function defaultNoModelMessage(identity: EdgeAgentIdentity | undefined, fallback: string) {
  return identity?.noEvidenceMessage ?? fallback
}

function createNoModelToolCaller(options: {
  tools: Record<string, unknown>
  manifests?: EdgeToolManifest[]
  session: EdgeSessionContext
}): EdgeNoModelToolCaller {
  const manifestReadOnly = new Map(options.manifests?.map(manifest => [manifest.name, Boolean(manifest.readOnly)]) ?? [])
  const context: EdgeToolExecutionContext = {
    session: options.session,
    identity: options.session.identity,
    auth: options.session.auth,
    state: options.session.state,
  }

  return async (name, input, callOptions = {}) => {
    const readOnlyOnly = callOptions.readOnlyOnly !== false
    const candidate = options.tools[name]
    if (!isRecord(candidate) || typeof candidate.execute !== 'function') {
      throw new Error(`Tool "${name}" is not available for no-model fallback.`)
    }
    const approvalRequired = await noModelToolNeedsApproval(candidate, input, context)
    if (approvalRequired) {
      throw new Error(`Tool "${name}" requires approval and cannot run in no-model fallback.`)
    }
    if (readOnlyOnly) {
      const manifestAllowsRead = manifestReadOnly.get(name) === true
      const toolAllowsRead = candidate.readOnly === true
      if (!manifestAllowsRead && !toolAllowsRead) {
        throw new Error(`Tool "${name}" is not marked read-only for no-model fallback.`)
      }
    }
    return (candidate.execute as (input: Record<string, unknown>) => unknown | Promise<unknown>)(input)
  }
}

async function noModelToolNeedsApproval(
  candidate: Record<string, unknown>,
  input: Record<string, unknown>,
  context: EdgeToolExecutionContext,
) {
  if (candidate.needsApproval === true) return true
  if (typeof candidate.needsApproval !== 'function') return false
  try {
    return Boolean(await (candidate.needsApproval as (
      input: Record<string, unknown>,
      options: Record<string, unknown>,
    ) => boolean | Promise<boolean>)(input, {
      args: input,
      messages: [],
      experimental_context: context,
      context,
      session: context.session,
      identity: context.identity,
      auth: context.auth,
      state: context.state,
    }))
  } catch {
    return true
  }
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
