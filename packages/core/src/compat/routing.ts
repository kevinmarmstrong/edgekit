// FROZEN per Phase C compatibility convention: bug fixes only, no behavior changes. Source of truth lives in the matching sibling package when one exists; otherwise this is deprecated DEFER surface.
import type { ModelMessage } from 'ai'
import type { LanguageModelV3 } from '@ai-sdk/provider'
import type { EdgeSessionContext } from '../context'
import type { ModelProvider } from '../cascade'
import type { EdgeHandoffEnvelope } from './agui'

export interface ModelRouterContext {
  input: string
  messages: ModelMessage[]
  tools: string[]
  session: EdgeSessionContext
  defaultModel: Array<ModelProvider | LanguageModelV3>
  phase: 'send' | 'approval'
  handoff?: EdgeHandoffEnvelope
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

export interface SupervisorWorkerRoute {
  id: string
  description?: string
  model: Array<ModelProvider | LanguageModelV3>
  intents?: string[]
  patterns?: RegExp[]
  when?: (context: ModelRouterContext) => boolean | Promise<boolean>
  onHandoff?: (handoff: EdgeHandoffEnvelope) => void | Promise<void>
}

export interface CreateSupervisorRouterOptions {
  workers: SupervisorWorkerRoute[]
  fallback?: Array<ModelProvider | LanguageModelV3>
}

export function createHybridModelRouter(routes: HybridModelRoute[], fallback?: Array<ModelProvider | LanguageModelV3>): EdgeModelRouter {
  return async context => {
    for (const route of routes) {
      if (!route.when || await route.when(context)) return route.model
    }
    return fallback ?? context.defaultModel
  }
}

export function createSupervisorRouter(options: CreateSupervisorRouterOptions): EdgeModelRouter {
  return async context => {
    const normalizedInput = context.input.toLowerCase()

    for (const worker of options.workers) {
      const intentMatch = worker.intents?.some(intent => normalizedInput.includes(intent.toLowerCase())) ?? false
      const patternMatch = worker.patterns?.some(pattern => {
        pattern.lastIndex = 0
        return pattern.test(context.input)
      }) ?? false
      const customMatch = worker.when ? await worker.when(context) : false
      if (intentMatch || patternMatch || customMatch) {
        if (worker.onHandoff && context.handoff) await worker.onHandoff(context.handoff)
        return worker.model
      }
    }

    return options.fallback ?? context.defaultModel
  }
}
