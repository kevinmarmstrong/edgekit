import { describe, it, expect, vi } from 'vitest'
import { createEventEmitter } from './emitter.js'
import type { AgentEvent } from './types.js'

function makeEvent(_type: string): AgentEvent {
  return { type: 'run:started', timestamp: Date.now(), runId: 'r1' } as AgentEvent
}

describe('createEventEmitter', () => {
  it('emit calls all registered handlers', () => {
    const emitter = createEventEmitter()
    const h1 = vi.fn()
    const h2 = vi.fn()
    emitter.on(h1)
    emitter.on(h2)

    const event = makeEvent('run:started')
    emitter.emit(event)

    expect(h1).toHaveBeenCalledWith(event)
    expect(h2).toHaveBeenCalledWith(event)
    expect(h1).toHaveBeenCalledOnce()
    expect(h2).toHaveBeenCalledOnce()
  })

  it('on returns unsubscribe function that works', () => {
    const emitter = createEventEmitter()
    const handler = vi.fn()
    const unsubscribe = emitter.on(handler)

    const event = makeEvent('run:started')
    emitter.emit(event)
    expect(handler).toHaveBeenCalledOnce()

    unsubscribe()
    emitter.emit(event)
    expect(handler).toHaveBeenCalledOnce() // still 1, not 2
  })

  it('dispose clears all handlers', () => {
    const emitter = createEventEmitter()
    const h1 = vi.fn()
    const h2 = vi.fn()
    emitter.on(h1)
    emitter.on(h2)

    emitter.dispose()
    emitter.emit(makeEvent('run:started'))

    expect(h1).not.toHaveBeenCalled()
    expect(h2).not.toHaveBeenCalled()
  })

  it('handler added after emit does not receive past events', () => {
    const emitter = createEventEmitter()
    emitter.emit(makeEvent('run:started'))

    const handler = vi.fn()
    emitter.on(handler)

    expect(handler).not.toHaveBeenCalled()
  })

  it('emitting with no handlers does not throw', () => {
    const emitter = createEventEmitter()
    expect(() => emitter.emit(makeEvent('run:started'))).not.toThrow()
  })

  it('unsubscribing the same handler twice is safe', () => {
    const emitter = createEventEmitter()
    const handler = vi.fn()
    const unsub = emitter.on(handler)

    unsub()
    unsub() // second call should not throw

    emitter.emit(makeEvent('run:started'))
    expect(handler).not.toHaveBeenCalled()
  })

  it('handlers receive events in registration order', () => {
    const emitter = createEventEmitter()
    const order: number[] = []

    emitter.on(() => order.push(1))
    emitter.on(() => order.push(2))
    emitter.on(() => order.push(3))

    emitter.emit(makeEvent('run:started'))
    expect(order).toEqual([1, 2, 3])
  })

  it('can register and emit multiple different event types', () => {
    const emitter = createEventEmitter()
    const handler = vi.fn()
    emitter.on(handler)

    const startEvent: AgentEvent = {
      type: 'run:started',
      timestamp: 1000,
      runId: 'r1',
    }
    const finishedEvent: AgentEvent = {
      type: 'run:finished',
      timestamp: 2000,
      runId: 'r1',
      status: 'completed',
    }

    emitter.emit(startEvent)
    emitter.emit(finishedEvent)

    expect(handler).toHaveBeenCalledTimes(2)
    expect(handler).toHaveBeenNthCalledWith(1, startEvent)
    expect(handler).toHaveBeenNthCalledWith(2, finishedEvent)
  })
})
