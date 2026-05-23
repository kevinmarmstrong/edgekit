import type { GraphNode } from '../graph/node.js'
import type { AgentState } from '../graph/state.js'
import { updateState } from '../graph/state.js'

export interface RetrieveNodeConfig {
  readonly topK?: number
  readonly scoreThreshold?: number
}

export function createRetrieveNode(config?: RetrieveNodeConfig): GraphNode {
  const topK = config?.topK ?? 5
  const scoreThreshold = config?.scoreThreshold ?? 0

  return {
    id: 'retrieve',
    errorPolicy: { onError: 'skip' },

    execute: async (state: AgentState, context): Promise<AgentState> => {
      if (!context.rag) {
        return state
      }

      const query = findLastUserQuery(state)
      if (!query) {
        return state
      }

      context.emitter.emit({
        type: 'edgekit:retrieval:start',
        timestamp: Date.now(),
        runId: state.runId,
        query,
      })

      const allChunks = await context.rag.retrieve(query, topK)
      const chunks = scoreThreshold > 0
        ? allChunks.filter((c) => (c.score ?? 0) >= scoreThreshold)
        : allChunks

      context.emitter.emit({
        type: 'edgekit:retrieval:complete',
        timestamp: Date.now(),
        runId: state.runId,
        chunkCount: chunks.length,
      })

      return updateState(state, { retrievedChunks: chunks })
    },
  }
}

function findLastUserQuery(state: AgentState): string | undefined {
  for (let i = state.messages.length - 1; i >= 0; i--) {
    const msg = state.messages[i]
    if (msg?.role === 'user') {
      return msg.content
    }
  }
  return undefined
}
