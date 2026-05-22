import type { RuntimeEvent } from './types.js'

type EventHandler = (event: RuntimeEvent) => void

export function createEventBus() {
  const handlers = new Set<EventHandler>()

  return {
    on(handler: EventHandler): () => void {
      handlers.add(handler)
      return () => {
        handlers.delete(handler)
      }
    },

    emit(event: RuntimeEvent): void {
      for (const handler of handlers) {
        try {
          handler(event)
        } catch {
          // handlers must not throw into the bus
        }
      }
    },

    dispose(): void {
      handlers.clear()
    },
  } as const
}

export type EventBus = ReturnType<typeof createEventBus>
