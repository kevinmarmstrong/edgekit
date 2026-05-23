import type { GraphNode } from '../graph/node.js'

export interface EscalateNodeConfig {
  readonly reason?: string
  readonly target?: 'local' | 'cloud'
}

export function createEscalateNode(
  config?: EscalateNodeConfig,
): GraphNode {
  return {
    id: 'escalate',
    execute: async (state, _context) => {
      // TODO: implement escalation from local to cloud (or vice-versa)
      void config
      return state
    },
  }
}
