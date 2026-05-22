import { describe, it, expect } from 'vitest'
import { createContextManager } from './context-manager.js'

describe('createContextManager', () => {
  it('starts with empty state', () => {
    const ctx = createContextManager()
    const state = ctx.getState()

    expect(state.messages).toEqual([])
    expect(state.turn).toBe(0)
  })

  it('adds messages immutably', () => {
    const ctx = createContextManager()
    const before = ctx.getState()

    ctx.addMessage({ role: 'user', content: 'hello' })
    const after = ctx.getState()

    expect(before.messages).toEqual([])
    expect(after.messages).toHaveLength(1)
    expect(after.messages[0]).toEqual({ role: 'user', content: 'hello' })
  })

  it('increments turn on user messages only', () => {
    const ctx = createContextManager()

    ctx.addMessage({ role: 'system', content: 'system prompt' })
    expect(ctx.getState().turn).toBe(0)

    ctx.addMessage({ role: 'user', content: 'hello' })
    expect(ctx.getState().turn).toBe(1)

    ctx.addMessage({ role: 'assistant', content: 'hi' })
    expect(ctx.getState().turn).toBe(1)

    ctx.addMessage({ role: 'user', content: 'another' })
    expect(ctx.getState().turn).toBe(2)
  })

  it('enforces max turns', () => {
    const ctx = createContextManager(2)

    ctx.addMessage({ role: 'user', content: '1' })
    ctx.addMessage({ role: 'user', content: '2' })

    expect(() => ctx.addMessage({ role: 'user', content: '3' })).toThrow(
      'Conversation exceeded maximum of 2 turns',
    )
  })

  it('clears state', () => {
    const ctx = createContextManager()
    ctx.addMessage({ role: 'user', content: 'hello' })

    ctx.clear()

    expect(ctx.getState().messages).toEqual([])
    expect(ctx.getState().turn).toBe(0)
  })
})
