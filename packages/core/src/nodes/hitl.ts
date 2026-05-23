import type { GraphNode } from '../graph/node.js'

export interface HitlNodeConfig {
  readonly timeoutMs?: number
}

export function createHitlNode(config?: HitlNodeConfig): GraphNode {
  return {
    id: 'hitl',
    execute: async (state, _context) => {
      // TODO: implement human-in-the-loop approval checkpoint
      void config
      return state
    },
  }
}
