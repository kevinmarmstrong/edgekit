import type { GraphNode } from '../graph/node.js'
import type { AgentState, ValidationResult } from '../graph/state.js'
import { updateState } from '../graph/state.js'
import type { StateSnapshotEvent } from '../events/types.js'
import type { Message } from '../types.js'

export interface RespondNodeConfig {
  readonly blockedPatterns?: readonly RegExp[]
  readonly maxResponseLength?: number
  readonly fallbackMessage?: string
}

const DEFAULT_FALLBACK = "I'm sorry, I couldn't generate a valid response."

function findLastAssistantIndex(messages: readonly Message[]): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === 'assistant') {
      return i
    }
  }
  return -1
}

function validateResponse(
  content: string,
  config: RespondNodeConfig,
): ValidationResult {
  for (const pattern of config.blockedPatterns ?? []) {
    if (pattern.test(content)) {
      return { valid: false, reason: 'Blocked pattern matched', blockedPattern: String(pattern) }
    }
  }
  if (config.maxResponseLength != null && content.length > config.maxResponseLength) {
    return { valid: false, reason: `Response exceeds max length of ${config.maxResponseLength}` }
  }
  return { valid: true }
}

export function createRespondNode(
  config: RespondNodeConfig = {},
): GraphNode {
  return {
    id: 'respond',
    execute: async (state, context) => {
      const assistantIndex = findLastAssistantIndex(state.messages)

      if (assistantIndex === -1) {
        return state
      }

      const assistantMessage = state.messages[assistantIndex]!
      const validation = validateResponse(assistantMessage.content, config)

      const updatedMessages = validation.valid
        ? state.messages
        : [
            ...state.messages.slice(0, assistantIndex),
            { ...assistantMessage, content: config.fallbackMessage ?? DEFAULT_FALLBACK },
            ...state.messages.slice(assistantIndex + 1),
          ]

      const finalState = updateState(state, {
        messages: updatedMessages,
        outputValidation: validation,
      } as Partial<AgentState>)

      const snapshot: StateSnapshotEvent = {
        type: 'state:snapshot',
        timestamp: Date.now(),
        runId: finalState.runId,
        state: finalState as unknown as Readonly<Record<string, unknown>>,
      }
      context.emitter.emit(snapshot)

      return finalState
    },
  }
}
