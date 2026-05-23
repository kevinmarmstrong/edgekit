import type { GraphNode, NodeErrorPolicy } from '../graph/node.js'
import type { ValidationResult } from '../graph/state.js'
import { updateState } from '../graph/state.js'
import { validateInput } from '../guardrails.js'

export interface InputGuardrailNodeConfig {
  readonly blockedPatterns?: readonly RegExp[]
  readonly maxInputLength?: number
  readonly maxInputTokens?: number
}

const HALT_POLICY: NodeErrorPolicy = { onError: 'halt' } as const
const VALID: ValidationResult = { valid: true } as const

function fail(reason: string, blockedPattern?: string): ValidationResult {
  return blockedPattern ? { valid: false, reason, blockedPattern } : { valid: false, reason }
}

export function createInputGuardrailNode(config?: InputGuardrailNodeConfig): GraphNode {
  return {
    id: 'input_guardrail',
    execute: async (state, _context) => {
      const last = [...state.messages].reverse().find((m) => m.role === 'user')
      if (!last) return updateState(state, { inputValidation: VALID })

      const input = last.content

      if (config?.maxInputLength && input.length > config.maxInputLength) {
        return updateState(state, {
          inputValidation: fail(`Input exceeds max length of ${config.maxInputLength} characters`),
        })
      }

      if (config?.blockedPatterns) {
        for (const pattern of config.blockedPatterns) {
          if (pattern.test(input)) {
            return updateState(state, {
              inputValidation: fail('Input contains blocked content', pattern.source),
            })
          }
        }
      }

      const result = validateInput(input, { maxInputTokens: config?.maxInputTokens })
      if (!result.valid) {
        return updateState(state, { inputValidation: fail(result.reason!) })
      }

      return updateState(state, { inputValidation: VALID })
    },
    errorPolicy: HALT_POLICY,
  }
}
