import type { LanguageModelV3 } from '@ai-sdk/provider'
import { readableError, withTimeout } from '../shared'
import { chromeAI } from '../providers/chrome-ai'
import { webLLM } from '../providers/web-llm'
import type { DownloadPolicy, DownloadPromptEvent, ModelProvider, ModelStatus, ModelStatusEvent } from './index'
import { isModelProvider } from './index'

export type CascadeCapability =
  | 'local-model'
  | 'chrome-ai'
  | 'webllm'
  | 'cloud-route'
  | 'no-model-fallback'
  | 'tools'
  | 'approvals'
  | 'edgeview'

export type CascadeProviderStatus =
  | ModelStatus
  | 'downloadable'
  | 'denied'
  | 'skipped'

export type CascadeMode =
  | 'checking'
  | 'local-ready'
  | 'downloadable'
  | 'fallback-ready'
  | 'hidden'
  | 'unavailable'
  | 'error'

export type CascadeActionType =
  | 'continue'
  | 'prompt'
  | 'suggest'
  | 'message'
  | 'hide'
  | 'fallback'
  | 'retry'

export type CascadeVisibilityPolicy =
  | 'show-always'
  | 'hide-until-ready'
  | 'show-basic-when-local-unavailable'
  | ((snapshot: CascadeReadinessSnapshot) => CascadeActionType)

export interface CascadeProviderSnapshot {
  id: string
  label: string
  status: CascadeProviderStatus
  progress?: number
  message?: string
  modelSize?: string
  error?: string
}

export interface CascadeRecommendedAction {
  type: CascadeActionType
  label: string
  message: string
  provider?: string
}

export interface CascadeReadinessSnapshot {
  mode: CascadeMode
  message: string
  providers: CascadeProviderSnapshot[]
  capabilities: CascadeCapability[]
  requiredCapabilities: CascadeCapability[]
  missingCapabilities: CascadeCapability[]
  recommendedAction: CascadeRecommendedAction
  canRunAgent: boolean
  canUseFallback: boolean
  shouldHideFeatures: boolean
  downloadPolicy: DownloadPolicy
  updatedAt: string
}

export interface CascadeReadinessMessages {
  checking?: string
  ready?: string
  downloadable?: string
  downloading?: string
  fallback?: string
  hidden?: string
  unavailable?: string
  error?: string
}

export interface CascadeReadinessOptions {
  providers?: Array<ModelProvider | LanguageModelV3>
  downloadPolicy?: DownloadPolicy
  requiredCapabilities?: CascadeCapability[]
  tools?: Record<string, unknown>
  requiredTools?: string[]
  approvals?: boolean
  edgeView?: boolean
  fallback?: boolean
  visibilityPolicy?: CascadeVisibilityPolicy
  messages?: CascadeReadinessMessages
  modelResolveTimeoutMs?: number
  now?: () => string
  onSnapshot?: (snapshot: CascadeReadinessSnapshot) => void
  onPrompt?: (action: CascadeRecommendedAction, snapshot: CascadeReadinessSnapshot) => void
  onSuggest?: (action: CascadeRecommendedAction, snapshot: CascadeReadinessSnapshot) => void
  onMessage?: (action: CascadeRecommendedAction, snapshot: CascadeReadinessSnapshot) => void
  onHide?: (action: CascadeRecommendedAction, snapshot: CascadeReadinessSnapshot) => void
}

export interface CascadeReadinessCheckOptions {
  allowPrompt?: boolean
  providerId?: string
}

export interface EdgeCascadeReadinessController {
  check(options?: CascadeReadinessCheckOptions): Promise<CascadeReadinessSnapshot>
  getSnapshot(): CascadeReadinessSnapshot
  subscribe(listener: (snapshot: CascadeReadinessSnapshot) => void): () => void
  recordStatus(event: ModelStatusEvent): CascadeReadinessSnapshot
  update(options: Partial<CascadeReadinessOptions>): CascadeReadinessSnapshot
  promptDownload(providerId?: string): Promise<CascadeReadinessSnapshot>
  useFallback(): CascadeReadinessSnapshot
  hideAgent(message?: string): CascadeReadinessSnapshot
  retry(): Promise<CascadeReadinessSnapshot>
}

export function createCascadeReadinessController(
  options: CascadeReadinessOptions = {},
): EdgeCascadeReadinessController {
  let config: CascadeReadinessOptions = { ...options }
  const listeners = new Set<(snapshot: CascadeReadinessSnapshot) => void>()
  let snapshot = buildCascadeSnapshot([], config)
  let lastActionKey = ''

  const publish = (next: CascadeReadinessSnapshot) => {
    snapshot = next
    config.onSnapshot?.(next)
    for (const listener of listeners) listener(next)
    const action = next.recommendedAction
    const actionKey = `${action.type}:${action.provider ?? ''}:${next.mode}:${next.message}`
    if (actionKey !== lastActionKey) {
      lastActionKey = actionKey
      if (action.type === 'prompt') config.onPrompt?.(action, next)
      else if (action.type === 'suggest') config.onSuggest?.(action, next)
      else if (action.type === 'message') config.onMessage?.(action, next)
      else if (action.type === 'hide') config.onHide?.(action, next)
    }
    return next
  }

  const setProvider = (provider: CascadeProviderSnapshot) => {
    const providers = upsertProvider(snapshot.providers, provider)
    return publish(buildCascadeSnapshot(providers, config))
  }

  const check = async (checkOptions: CascadeReadinessCheckOptions = {}) => {
    publish(buildCascadeSnapshot(snapshot.providers, config, 'checking'))
    const providers = normalizeCascadeProviders(config.providers ?? [chromeAI(), webLLM()])
    let providerSnapshots = snapshot.providers

    for (const entry of providers) {
      if (checkOptions.providerId && entry.id !== checkOptions.providerId) continue
      providerSnapshots = upsertProvider(providerSnapshots, {
        id: entry.id,
        label: entry.label,
        status: 'checking',
        message: `Checking ${entry.label}...`,
      })
      publish(buildCascadeSnapshot(providerSnapshots, config, 'checking'))

      if (!entry.provider) {
        providerSnapshots = upsertProvider(providerSnapshots, {
          id: entry.id,
          label: entry.label,
          status: 'ready',
          message: `${entry.label} is ready.`,
        })
        publish(buildCascadeSnapshot(providerSnapshots, config))
        continue
      }

      try {
        let requestedDownload: DownloadPromptEvent | null = null
        const resolved = await withTimeout(entry.provider.resolve({
          downloadPolicy: config.downloadPolicy ?? 'prompt',
          timeoutMs: config.modelResolveTimeoutMs ?? 3_000,
          emitStatus: event => {
            providerSnapshots = upsertProvider(providerSnapshots, statusEventToProviderSnapshot(event, entry.label))
            publish(buildCascadeSnapshot(providerSnapshots, config))
          },
          requestDownload: async event => {
            requestedDownload = event
            providerSnapshots = upsertProvider(providerSnapshots, {
              id: event.provider,
              label: entry.label,
              status: 'downloadable',
              modelSize: event.modelSize,
              message: event.message,
            })
            publish(buildCascadeSnapshot(providerSnapshots, config))
            if (config.downloadPolicy === 'auto') return true
            return Boolean(checkOptions.allowPrompt)
          },
        }), config.modelResolveTimeoutMs ?? 3_000)

        const downloadEvent = requestedDownload as DownloadPromptEvent | null
        if (resolved) {
          providerSnapshots = upsertProvider(providerSnapshots, {
            id: entry.id,
            label: entry.label,
            status: 'ready',
            message: `${entry.label} is ready.`,
          })
        } else if (downloadEvent && !checkOptions.allowPrompt) {
          providerSnapshots = upsertProvider(providerSnapshots, {
            id: downloadEvent.provider,
            label: entry.label,
            status: config.downloadPolicy === 'never' ? 'skipped' : 'downloadable',
            modelSize: downloadEvent.modelSize,
            message: downloadEvent.message,
          })
        } else {
          providerSnapshots = upsertProvider(providerSnapshots, {
            id: entry.id,
            label: entry.label,
            status: 'unavailable',
            message: `${entry.label} is not available.`,
          })
        }
      } catch (error) {
        providerSnapshots = upsertProvider(providerSnapshots, {
          id: entry.id,
          label: entry.label,
          status: 'error',
          error: readableError(error),
          message: readableError(error),
        })
      }
      publish(buildCascadeSnapshot(providerSnapshots, config))
    }

    return snapshot
  }

  return {
    check,
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      listener(snapshot)
      return () => listeners.delete(listener)
    },
    recordStatus(event) {
      return setProvider(statusEventToProviderSnapshot(event))
    },
    update(nextOptions) {
      config = { ...config, ...nextOptions }
      return publish(buildCascadeSnapshot(snapshot.providers, config))
    },
    promptDownload(providerId) {
      return check({ allowPrompt: true, providerId })
    },
    useFallback() {
      config = { ...config, fallback: true }
      return publish(buildCascadeSnapshot(snapshot.providers, config, 'fallback-ready'))
    },
    hideAgent(message) {
      return publish(buildCascadeSnapshot(snapshot.providers, config, 'hidden', message))
    },
    retry() {
      return check()
    },
  }
}

function normalizeCascadeProviders(providers: Array<ModelProvider | LanguageModelV3>) {
  return providers.map(entry => {
    if (isModelProvider(entry)) return { id: entry.id, label: entry.label, provider: entry }
    const id = entry.provider || entry.modelId || 'language-model'
    return { id, label: id, model: entry }
  })
}

function statusEventToProviderSnapshot(event: ModelStatusEvent, fallbackLabel?: string): CascadeProviderSnapshot {
  return {
    id: event.provider,
    label: fallbackLabel ?? providerLabelFromId(event.provider),
    status: event.status,
    progress: event.progress,
    message: event.message,
  }
}

function upsertProvider(
  providers: CascadeProviderSnapshot[],
  provider: CascadeProviderSnapshot,
): CascadeProviderSnapshot[] {
  const existing = providers.filter(candidate => candidate.id !== provider.id)
  return [...existing, provider]
}

function buildCascadeSnapshot(
  providers: CascadeProviderSnapshot[],
  options: CascadeReadinessOptions,
  forcedMode?: CascadeMode,
  forcedMessage?: string,
): CascadeReadinessSnapshot {
  const downloadPolicy = options.downloadPolicy ?? 'prompt'
  const fallback = options.fallback === true
  const requiredCapabilities = options.requiredCapabilities ?? []
  const toolsReady = requiredToolsReady(options.tools, options.requiredTools)
  const capabilities = new Set<CascadeCapability>()

  if (providers.some(provider => provider.status === 'ready' && isLocalModelProvider(provider.id))) capabilities.add('local-model')
  if (providers.some(provider => provider.id === 'chrome-ai' && provider.status === 'ready')) capabilities.add('chrome-ai')
  if (providers.some(provider => provider.id === 'webllm' && provider.status === 'ready')) capabilities.add('webllm')
  if (providers.some(provider => isCloudRouteProvider(provider.id) && provider.status === 'ready')) capabilities.add('cloud-route')
  if (fallback) capabilities.add('no-model-fallback')
  if (toolsReady) capabilities.add('tools')
  if (options.approvals !== false) capabilities.add('approvals')
  if (options.edgeView !== false) capabilities.add('edgeview')

  const missingCapabilities = requiredCapabilities.filter(capability => !capabilities.has(capability))
  const downloading = providers.find(provider => provider.status === 'downloading')
  const ready = providers.find(provider => provider.status === 'ready')
  const downloadable = providers.find(provider => provider.status === 'downloadable')
  const error = providers.find(provider => provider.status === 'error')
  const checking = providers.some(provider => provider.status === 'checking')

  let mode: CascadeMode = forcedMode ?? 'unavailable'
  if (!forcedMode) {
    if (checking) mode = 'checking'
    else if (ready) mode = 'local-ready'
    else if (downloading) mode = 'downloadable'
    else if (downloadable && downloadPolicy !== 'never') mode = 'downloadable'
    else if (fallback) mode = 'fallback-ready'
    else if (error) mode = 'error'
  }

  const temporarySnapshot = {
    mode,
    message: '',
    providers,
    capabilities: [...capabilities],
    requiredCapabilities,
    missingCapabilities,
    recommendedAction: { type: 'message', label: 'Checking', message: '' } satisfies CascadeRecommendedAction,
    canRunAgent: mode === 'local-ready' && missingCapabilities.length === 0,
    canUseFallback: fallback,
    shouldHideFeatures: false,
    downloadPolicy,
    updatedAt: (options.now ?? (() => new Date().toISOString()))(),
  } satisfies CascadeReadinessSnapshot

  const visibilityAction = typeof options.visibilityPolicy === 'function'
    ? options.visibilityPolicy(temporarySnapshot)
    : null
  const shouldHide =
    mode === 'hidden'
    || visibilityAction === 'hide'
    || (options.visibilityPolicy === 'hide-until-ready' && mode !== 'local-ready')

  if (shouldHide) mode = 'hidden'

  const recommendedAction = recommendedCascadeAction(mode, {
    ready,
    downloadable,
    downloading,
    error,
    fallback,
    downloadPolicy,
    messages: options.messages,
    forcedMessage,
    hidden: shouldHide,
    fallbackPreferred: options.visibilityPolicy === 'show-basic-when-local-unavailable',
    missingCapabilities,
  })

  const message = forcedMessage ?? recommendedAction.message
  return {
    mode,
    message,
    providers,
    capabilities: [...capabilities],
    requiredCapabilities,
    missingCapabilities,
    recommendedAction,
    canRunAgent: mode === 'local-ready' && missingCapabilities.length === 0,
    canUseFallback: fallback,
    shouldHideFeatures: shouldHide,
    downloadPolicy,
    updatedAt: (options.now ?? (() => new Date().toISOString()))(),
  }
}

function recommendedCascadeAction(
  mode: CascadeMode,
  context: {
    ready?: CascadeProviderSnapshot
    downloadable?: CascadeProviderSnapshot
    downloading?: CascadeProviderSnapshot
    error?: CascadeProviderSnapshot
    fallback: boolean
    downloadPolicy: DownloadPolicy
    messages?: CascadeReadinessMessages
    forcedMessage?: string
    hidden?: boolean
    fallbackPreferred?: boolean
    missingCapabilities?: CascadeCapability[]
  },
): CascadeRecommendedAction {
  const missingCapabilities = context.missingCapabilities ?? []

  if (context.hidden || mode === 'hidden') {
    return {
      type: 'hide',
      label: 'Hide agent',
      message: context.forcedMessage ?? context.messages?.hidden ?? 'Agent features are hidden until the required browser capabilities are available.',
    }
  }

  if (mode === 'checking') {
    return {
      type: 'message',
      label: 'Checking',
      message: context.messages?.checking ?? 'Checking browser AI capabilities...',
    }
  }

  const providerOnlyMissing = missingCapabilities.every(capability =>
    capability === 'local-model' || capability === 'chrome-ai' || capability === 'webllm' || capability === 'cloud-route',
  )

  if (missingCapabilities.length > 0 && !(mode === 'downloadable' && providerOnlyMissing)) {
    return {
      type: 'suggest',
      label: 'Complete setup',
      message: `Missing required ${missingCapabilities.length === 1 ? 'capability' : 'capabilities'}: ${missingCapabilities.join(', ')}.`,
    }
  }

  if (mode === 'local-ready' && context.ready) {
    return {
      type: 'continue',
      label: isCloudRouteProvider(context.ready.id) ? 'Use cloud route' : 'Use local agent',
      provider: context.ready.id,
      message: context.messages?.ready ?? `${context.ready.label} is ready.`,
    }
  }

  if (context.downloading) {
    return {
      type: 'message',
      label: 'Preparing model',
      provider: context.downloading.id,
      message: context.downloading.message ?? context.messages?.downloading ?? 'Preparing the local model...',
    }
  }

  if (mode === 'downloadable' && context.downloadable) {
    return {
      type: context.downloadPolicy === 'never' ? 'suggest' : 'prompt',
      label: context.downloadPolicy === 'never' ? 'Use basic mode' : 'Enable local AI',
      provider: context.downloadable.id,
      message:
        context.messages?.downloadable
        ?? context.downloadable.message
        ?? 'This browser can enable a local model for richer agent behavior.',
    }
  }

  if (mode === 'fallback-ready' || (context.fallback && context.fallbackPreferred)) {
    return {
      type: 'fallback',
      label: 'Use basic mode',
      message: context.messages?.fallback ?? 'Local AI is unavailable, so Edgekit can run in transparent basic mode.',
    }
  }

  if (mode === 'error' && context.error) {
    return {
      type: 'retry',
      label: 'Retry capability check',
      provider: context.error.id,
      message: context.messages?.error ?? context.error.message ?? 'The provider check failed.',
    }
  }

  return {
    type: 'suggest',
    label: 'Use a supported browser',
    message: context.messages?.unavailable ?? 'No local model is available in this browser. The app can hide the sidecar or show a fallback experience.',
  }
}

function requiredToolsReady(tools?: Record<string, unknown>, requiredTools?: string[]) {
  if (!requiredTools || requiredTools.length === 0) return true
  if (!tools) return false
  return requiredTools.every(name => Object.prototype.hasOwnProperty.call(tools, name))
}

function isCloudRouteProvider(id: string) {
  return /cloud|route|server/i.test(id)
}

function isLocalModelProvider(id: string) {
  return !isCloudRouteProvider(id)
}

function providerLabelFromId(id: string) {
  if (id === 'chrome-ai') return 'Chrome AI'
  if (id === 'webllm') return 'WebLLM'
  return id
}
