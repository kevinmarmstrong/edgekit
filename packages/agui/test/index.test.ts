import { describe, expect, it } from 'vitest'
import { agUiEventToAgentEvents, createAgUiAgent, createHandoffEnvelope } from '../src/index'

describe('agui package', () => {
  it('maps AG-UI text events', () => {
    expect(agUiEventToAgentEvents({ type: 'TEXT_MESSAGE_CONTENT', delta: 'hi' })).toEqual([
      { type: 'text-delta', text: 'hi' },
    ])
  })

  it('wraps an event iterator as an Edgekit agent', async () => {
    const agent = createAgUiAgent({
      run: async function* () {
        yield { type: 'TEXT_MESSAGE_CONTENT', delta: 'hello' }
      },
    })

    const events = []
    for await (const event of agent.send('hello')) events.push(event)

    expect(events.at(-1)).toEqual({ type: 'done', text: 'hello' })
  })

  it('creates handoff envelopes', () => {
    const envelope = createHandoffEnvelope({
      input: 'help',
      messages: [],
      session: { identity: { id: 'u1' }, state: { summary: 'route' } },
      trace: { sessionId: 's1', runId: 'r1', phase: 'send' },
    })

    expect(envelope.session.identity?.id).toBe('u1')
    expect(envelope.approximateTokens).toBeGreaterThan(0)
  })
})
