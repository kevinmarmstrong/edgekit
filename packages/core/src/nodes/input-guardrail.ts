import type { GraphNode } from '../graph/node.js'

export interface InputGuardrailNodeConfig {
  readonly blockedPatterns?: readonly RegExp[]
  readonly maxInputTokens?: number
}

export function createInputGuardrailNode(
  config?: InputGuardrailNodeConfig,
): GraphNode {
  return {
    id: 'input_guardrail',
    execute: async (state, _context) => {
      // TODO: implement input validation logic
      void config
      return state
    },
  }
}
