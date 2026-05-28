import type { LanguageModelV3 } from '@ai-sdk/provider'
import { withTimeout } from '../shared'
import type { CascadeReadinessSnapshot } from './readiness'

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
  readiness?: CascadeReadinessSnapshot
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

export interface ProviderOptions {
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

export function isModelProvider(value: ModelProvider | LanguageModelV3): value is ModelProvider {
  return 'resolve' in value && typeof value.resolve === 'function'
}
