import { streamText as aiStreamText, stepCountIs, tool } from 'ai'
import type { ModelMessage } from 'ai'
import type { LanguageModelV3 } from '@ai-sdk/provider'

export { stepCountIs, tool }
export type { LanguageModelV3 }

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
  | { type: 'approval-request'; approvalId: string; toolCall: unknown }
  | { type: 'no-model'; message: string }
  | { type: 'error'; error: unknown }
  | { type: 'done'; text: string }

type StreamTextFn = typeof aiStreamText

export interface CreateAgentOptions {
  systemPrompt: string
  tools: Record<string, unknown>
  model?: Array<ModelProvider | LanguageModelV3>
  downloadPolicy?: DownloadPolicy
  maxSteps?: number
  modelResolveTimeoutMs?: number
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
  const messages: ModelMessage[] = []
  let lastUserInput = ''

  const emitStatus = (event: ModelStatusEvent): ModelStatusEvent => {
    const custom = options.onModelStatus?.(event)
    return custom === null ? event : { ...event, message: custom ?? event.message }
  }

  const requestDownload = async (event: DownloadPromptEvent): Promise<boolean> => {
    if (downloadPolicy === 'auto') return true
    if (downloadPolicy === 'never') return false
    if (options.onDownloadPrompt) return Boolean(await options.onDownloadPrompt(event))
    return false
  }

  const run = async function* (): AsyncGenerator<AgentEvent> {
    const statusEvents: ModelStatusEvent[] = []
    const drainStatus = function* () {
      while (statusEvents.length > 0) {
        yield { type: 'status', event: statusEvents.shift()! } satisfies AgentEvent
      }
    }

    const resolved = await resolveModel(providers, {
      downloadPolicy,
      timeoutMs: options.modelResolveTimeoutMs ?? 3_000,
      emitStatus: event => {
        const displayEvent = emitStatus(event)
        statusEvents.push(displayEvent)
      },
      requestDownload,
    })
    yield* drainStatus()

    if (!resolved) {
      const defaultMessage = 'AI is not available in this browser.'
      const message = options.onNoModel?.({
        availableTools: Object.keys(options.tools),
        input: lastUserInput,
        message: defaultMessage,
      }) ?? defaultMessage
      yield { type: 'no-model', message }
      return
    }

    let text = ''
    const result = (streamText as never as (options: Record<string, unknown>) => ReturnType<StreamTextFn>)({
      model: resolved.model,
      system: options.systemPrompt,
      messages: [...messages],
      tools: options.tools,
      stopWhen: stepCountIs(maxSteps),
    })

    for await (const part of result.fullStream as AsyncIterable<Record<string, unknown>>) {
      yield* drainStatus()
      switch (part.type) {
        case 'text-delta': {
          const delta = String(part.text ?? part.delta ?? '')
          text += delta
          yield { type: 'text-delta', text: delta }
          break
        }
        case 'tool-call':
          yield {
            type: 'tool-call',
            toolName: String(part.toolName),
            toolCallId: String(part.toolCallId),
            input: part.input,
          }
          break
        case 'tool-result':
          yield {
            type: 'tool-result',
            toolName: String(part.toolName),
            toolCallId: String(part.toolCallId),
            output: part.output,
          }
          break
        case 'tool-approval-request':
          yield {
            type: 'approval-request',
            approvalId: String(part.approvalId),
            toolCall: part.toolCall,
          }
          break
        case 'error':
          yield { type: 'error', error: part.error }
          break
      }
    }
    yield* drainStatus()

    const response = await result.response
    messages.push(...response.messages)
    yield { type: 'done', text }
  }

  return {
    async *send(input: string): AsyncGenerator<AgentEvent> {
      lastUserInput = input
      messages.push({ role: 'user', content: input })
      yield* run()
    },
    async *respondToApproval(approvalId: string, approved: boolean, reason?: string): AsyncGenerator<AgentEvent> {
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
      yield* run()
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
