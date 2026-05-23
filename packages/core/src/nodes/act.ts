import type { GraphNode } from '../graph/node.js'

export interface ActNodeConfig {
  readonly maxToolRounds?: number
}

export function createActNode(config?: ActNodeConfig): GraphNode {
  return {
    id: 'act',
    execute: async (state, _context) => {
      // TODO: implement tool execution logic
      void config
      return state
    },
  }
}
