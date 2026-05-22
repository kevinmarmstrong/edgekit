import type { Message, ConversationState } from './types.js'

export function createContextManager(maxTurns?: number) {
  let state: ConversationState = { messages: [], turn: 0 }

  return {
    getState(): ConversationState {
      return state
    },

    addMessage(message: Message): ConversationState {
      const messages = [...state.messages, message]
      const turn = message.role === 'user' ? state.turn + 1 : state.turn

      if (maxTurns && turn > maxTurns) {
        throw new Error(`Conversation exceeded maximum of ${maxTurns} turns`)
      }

      state = { messages, turn }
      return state
    },

    clear(): void {
      const systemMessages = state.messages.filter((m) => m.role === 'system')
      state = { messages: systemMessages, turn: 0 }
    },
  } as const
}

export type ContextManager = ReturnType<typeof createContextManager>
