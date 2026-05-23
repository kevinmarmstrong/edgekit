import type { GraphNode } from '../graph/node.js'

export interface RouteNodeConfig {
  readonly skills?: readonly string[]
  readonly confidenceThreshold?: number
}

export function createRouteNode(config?: RouteNodeConfig): GraphNode {
  return {
    id: 'route',
    execute: async (state, _context) => {
      // TODO: implement skill routing logic
      void config
      return state
    },
  }
}
