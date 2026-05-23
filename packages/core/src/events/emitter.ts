import type { AgentEvent } from './types.js'

export interface EventEmitter {
  emit(event: AgentEvent): void
  on(handler: (event: AgentEvent) => void): () => void
  dispose(): void
}

export function createEventEmitter(): EventEmitter {
  const handlers = new Set<(event: AgentEvent) => void>()

  return {
    emit(event: AgentEvent): void {
      for (const handler of handlers) {
        handler(event)
      }
    },

    on(handler: (event: AgentEvent) => void): () => void {
      handlers.add(handler)
      return () => {
        handlers.delete(handler)
      }
    },

    dispose(): void {
      handlers.clear()
    },
  }
}
