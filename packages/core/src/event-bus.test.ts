import { describe, it, expect, vi } from 'vitest'
import { createEventBus } from './event-bus.js'
import type { RuntimeEvent } from './types.js'

describe('createEventBus', () => {
  it('delivers events to registered handlers', () => {
    const bus = createEventBus()
    const handler = vi.fn()
    bus.on(handler)

    const event: RuntimeEvent = { type: 'model:ready' }
    bus.emit(event)

    expect(handler).toHaveBeenCalledWith(event)
  })

  it('supports multiple handlers', () => {
    const bus = createEventBus()
    const h1 = vi.fn()
    const h2 = vi.fn()
    bus.on(h1)
    bus.on(h2)

    bus.emit({ type: 'model:ready' })

    expect(h1).toHaveBeenCalledOnce()
    expect(h2).toHaveBeenCalledOnce()
  })

  it('returns unsubscribe function', () => {
    const bus = createEventBus()
    const handler = vi.fn()
    const unsub = bus.on(handler)

    unsub()
    bus.emit({ type: 'model:ready' })

    expect(handler).not.toHaveBeenCalled()
  })

  it('does not throw when handler throws', () => {
    const bus = createEventBus()
    bus.on(() => { throw new Error('boom') })
    const handler = vi.fn()
    bus.on(handler)

    bus.emit({ type: 'model:ready' })

    expect(handler).toHaveBeenCalledOnce()
  })

  it('clears all handlers on dispose', () => {
    const bus = createEventBus()
    const handler = vi.fn()
    bus.on(handler)

    bus.dispose()
    bus.emit({ type: 'model:ready' })

    expect(handler).not.toHaveBeenCalled()
  })
})
