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
    const noModelInputs: string[] = []
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
      onNoModel: ({ input }) => {
        noModelInputs.push(input)
        return 'No model available.'
      },
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
    expect(noModelInputs).toEqual(['hello'])
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

  it('resumes a paused tool approval with an approval response message', async () => {
    const streamText = vi
      .fn()
      .mockImplementationOnce((options: unknown) => ({
        fullStream: (async function* () {
          yield {
            type: 'tool-approval-request',
            approvalId: 'approval-1',
            toolCall: {
              type: 'tool-call',
              toolCallId: 'tool-1',
              toolName: 'addToCart',
              input: { productId: 'pegasus', quantity: 1 },
            },
          }
        })(),
        response: Promise.resolve({
          messages: [
            {
              role: 'assistant',
              content: [
                {
                  type: 'tool-approval-request',
                  approvalId: 'approval-1',
                  toolCall: {
                    type: 'tool-call',
                    toolCallId: 'tool-1',
                    toolName: 'addToCart',
                    input: { productId: 'pegasus', quantity: 1 },
                  },
                },
              ],
            },
          ],
        }),
        options,
      }))
      .mockImplementationOnce((options: unknown) => ({
        fullStream: (async function* () {
          yield { type: 'text-delta', delta: 'Added to cart.' }
        })(),
        response: Promise.resolve({
          messages: [{ role: 'assistant', content: [{ type: 'text', text: 'Added to cart.' }] }],
        }),
        options,
      }))

    const agent = createAgent({
      systemPrompt: 'You are helpful.',
      model: [createModelProvider({ id: 'fake', label: 'Fake', resolve: async () => fakeModel })],
      tools: { addToCart: {} },
      streamText: streamText as never,
    })

    const firstEvents = []
    for await (const event of agent.send('add the pegasus to my cart')) {
      firstEvents.push(event)
    }
    const secondEvents = []
    for await (const event of agent.respondToApproval('approval-1', true)) {
      secondEvents.push(event)
    }

    expect(firstEvents).toContainEqual({
      type: 'approval-request',
      approvalId: 'approval-1',
      toolCall: {
        type: 'tool-call',
        toolCallId: 'tool-1',
        toolName: 'addToCart',
        input: { productId: 'pegasus', quantity: 1 },
      },
    })
    expect(secondEvents).toContainEqual({ type: 'text-delta', text: 'Added to cart.' })
    expect(streamText.mock.calls[1][0]).toMatchObject({
      messages: [
        { role: 'user', content: 'add the pegasus to my cart' },
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-approval-request',
              approvalId: 'approval-1',
            },
          ],
        },
        {
          role: 'tool',
          content: [
            {
              type: 'tool-approval-response',
              approvalId: 'approval-1',
              approved: true,
            },
          ],
        },
      ],
    })
  })
})
