import { describe, expect, it, vi } from 'vitest'
import type { LanguageModelV3 } from '@ai-sdk/provider'
import { createAgent, createModelProvider, resolveModel } from '../src/index'

const fakeModel = { provider: 'fake', modelId: 'fake-model', specificationVersion: 'v3' } as LanguageModelV3

describe('resolveModel', () => {
  it('tries providers in order and returns the first available model', async () => {
    const events: string[] = []
    const unavailable = createModelProvider({
      id: 'first',
      label: 'First',
      resolve: async () => {
        events.push('first')
        return null
      },
    })
    const available = createModelProvider({
      id: 'second',
      label: 'Second',
      resolve: async () => {
        events.push('second')
        return fakeModel
      },
    })

    const result = await resolveModel([unavailable, available], {
      downloadPolicy: 'never',
      emitStatus: () => undefined,
      requestDownload: async () => false,
    })

    expect(result?.model).toBe(fakeModel)
    expect(result?.provider.id).toBe('second')
    expect(events).toEqual(['first', 'second'])
  })
})

describe('createAgent', () => {
  it('reports no-model instead of throwing when the cascade cannot resolve a model', async () => {
    const statuses: string[] = []
    const agent = createAgent({
      systemPrompt: 'You are helpful.',
      model: [
        createModelProvider({
          id: 'empty',
          label: 'Empty',
          resolve: async () => null,
        }),
      ],
      tools: {},
      onModelStatus: ({ status }) => {
        statuses.push(status)
        return null
      },
      onNoModel: () => 'No model available.',
    })

    const events = []
    for await (const event of agent.send('hello')) {
      events.push(event)
    }

    expect(events).toContainEqual({
      type: 'no-model',
      message: 'No model available.',
    })
    expect(statuses).toContain('unavailable')
  })

  it('passes conversation history to the next turn', async () => {
    const streamText = vi.fn(async function* () {})
    const agent = createAgent({
      systemPrompt: 'You are helpful.',
      model: [createModelProvider({ id: 'fake', label: 'Fake', resolve: async () => fakeModel })],
      tools: {},
      streamText: ((options: unknown) => {
        streamText(options)
        return {
          fullStream: (async function* () {
            yield { type: 'text-delta', delta: 'ok' }
            yield { type: 'finish' }
          })(),
          response: Promise.resolve({
            messages: [{ role: 'assistant', content: [{ type: 'text', text: 'ok' }] }],
          }),
        }
      }) as never,
    })

    for await (const _ of agent.send('first')) {
      // drain
    }
    for await (const _ of agent.send('second')) {
      // drain
    }

    expect(streamText).toHaveBeenCalledTimes(2)
    expect(streamText.mock.calls[0][0]).toMatchObject({
      messages: [{ role: 'user', content: 'first' }],
    })
    expect(streamText.mock.calls[1][0]).toMatchObject({
      messages: [
        { role: 'user', content: 'first' },
        { role: 'assistant', content: [{ type: 'text', text: 'ok' }] },
        { role: 'user', content: 'second' },
      ],
    })
  })
})
