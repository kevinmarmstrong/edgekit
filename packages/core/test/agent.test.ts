import { describe, expect, it, vi } from 'vitest'
import type { LanguageModelV3 } from '@ai-sdk/provider'
import { z } from 'zod'
import {
  actionsToEdgeView,
  agUiEventToAgentEvents,
  createAgent,
  createAgUiAgent,
  createAuditTrail,
  createHandoffEnvelope,
  createHybridModelRouter,
  createMarkdownMemoryStore,
  createMissionControl,
  createModelProvider,
  createPiiRedactor,
  createSupervisorRouter,
  filterToolManifestsForSession,
  loadMcpTools,
  mcpToolsFromDefinitions,
  modelOptional,
  estimateTokens,
  resolveSessionContext,
  resolveModel,
  toolsFromManifests,
  withToolContext,
} from '../src/index'

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

  it('routes complex prompts to a developer-provided model route', async () => {
    const localModel = { provider: 'local', modelId: 'local', specificationVersion: 'v3' } as LanguageModelV3
    const cloudModel = { provider: 'cloud', modelId: 'cloud', specificationVersion: 'v3' } as LanguageModelV3
    const streamText = vi.fn((options: Record<string, unknown>) => ({
      fullStream: (async function* () {
        yield { type: 'text-delta', delta: 'routed' }
      })(),
      response: Promise.resolve({
        messages: [{ role: 'assistant', content: [{ type: 'text', text: 'routed' }] }],
      }),
      options,
    }))
    const modelRouter = createHybridModelRouter([
      {
        id: 'cloud-complex',
        model: [cloudModel],
        when: ({ input }) => input.includes('complex'),
      },
    ], [localModel])

    const agent = createAgent({
      systemPrompt: 'You are helpful.',
      model: [localModel],
      modelRouter,
      tools: {},
      streamText: streamText as never,
    })

    for await (const _ of agent.send('complex planning task')) {
      // drain
    }

    expect(streamText.mock.calls[0][0]).toMatchObject({ model: cloudModel })
  })

  it('emits telemetry and writes an approval audit trail', async () => {
    const telemetry = createMissionControl()
    const auditTrail = createAuditTrail({
      now: () => '2026-05-24T00:00:00.000Z',
      hash: payload => `hash:${payload.length}`,
    })
    const streamText = vi.fn(() => ({
      fullStream: (async function* () {
        yield {
          type: 'tool-call',
          toolCallId: 'tool-1',
          toolName: 'addToCart',
          input: { productId: 'dunk' },
        }
        yield {
          type: 'tool-approval-request',
          approvalId: 'approval-1',
          toolCall: { toolName: 'addToCart', input: { productId: 'dunk' } },
        }
      })(),
      response: Promise.resolve({
        messages: [{ role: 'assistant', content: [{ type: 'text', text: 'pending' }] }],
      }),
    }))
    const agent = createAgent({
      systemPrompt: 'You are helpful.',
      model: [fakeModel],
      tools: { addToCart: {} },
      streamText: streamText as never,
      telemetry,
      auditTrail,
      sessionId: 'test-session',
    })

    for await (const _ of agent.send('add dunk')) {
      // drain
    }
    for await (const _ of agent.respondToApproval('approval-1', false, 'testing')) {
      // drain
    }

    expect(telemetry.snapshot()).toMatchObject({
      runs: 2,
      toolCalls: { addToCart: 2 },
      approvals: { requested: 2, approved: 0, rejected: 1 },
    })
    expect(auditTrail.entries?.().map(entry => entry.event.action)).toContain('approval-decision')
    expect(auditTrail.entries?.()[0]?.previousHash).toBe('genesis')
  })

  it('hydrates identity and app state into model context while keeping auth in tools', async () => {
    const streamText = vi.fn((options: Record<string, unknown>) => ({
      fullStream: (async function* () {
        yield { type: 'text-delta', delta: 'state-aware' }
      })(),
      response: Promise.resolve({
        messages: [{ role: 'assistant', content: [{ type: 'text', text: 'state-aware' }] }],
      }),
      options,
    }))
    const agent = createAgent({
      systemPrompt: 'You are helpful.',
      model: [fakeModel],
      tools: {},
      streamText: streamText as never,
      identityProvider: () => ({
        id: 'user-1',
        tenantId: 'tenant-1',
        roles: ['admin'],
        permissions: ['accounts:read'],
        claims: { token: 'do-not-inject' },
      }),
      stateProvider: () => ({
        route: '/checkout',
        view: 'Checkout',
        summary: 'Cart contains 2 items.',
      }),
    })

    for await (const _ of agent.send('where am I?')) {
      // drain
    }

    const system = String(streamText.mock.calls[0][0].system)
    expect(system).toContain('Cart contains 2 items.')
    expect(system).toContain('roles')
    expect(system).not.toContain('do-not-inject')
  })

  it('hydrates relevant markdown memory into model context', async () => {
    const streamText = vi.fn((options: Record<string, unknown>) => ({
      fullStream: (async function* () {
        yield { type: 'text-delta', delta: 'remembered' }
      })(),
      response: Promise.resolve({
        messages: [{ role: 'assistant', content: [{ type: 'text', text: 'remembered' }] }],
      }),
      options,
    }))
    const memory = createMarkdownMemoryStore({
      documents: [
        {
          id: 'customer-notes',
          content: `# Shopping preferences

## Checkout
The shopper prefers curbside pickup and size 11 shoes.`,
        },
      ],
    })

    const agent = createAgent({
      systemPrompt: 'You are helpful.',
      model: [fakeModel],
      tools: {},
      streamText: streamText as never,
      memory,
    })

    for await (const _ of agent.send('what should I remember about checkout?')) {
      // drain
    }

    const system = String(streamText.mock.calls[0][0].system)
    expect(system).toContain('Relevant memory')
    expect(system).toContain('curbside pickup')
    expect(system).toContain('size 11')
  })

  it('redacts sensitive tool results before emitting events and telemetry', async () => {
    const telemetry = createMissionControl()
    const auditTrail = createAuditTrail()
    const redactor = createPiiRedactor()
    const streamText = vi.fn(() => ({
      fullStream: (async function* () {
        yield {
          type: 'tool-result',
          toolCallId: 'tool-1',
          toolName: 'lookupAccount',
          output: {
            email: 'sam@example.com',
            phone: '555-123-4567',
            note: 'No sensitive content here.',
          },
        }
      })(),
      response: Promise.resolve({
        messages: [{ role: 'assistant', content: [{ type: 'text', text: 'done' }] }],
      }),
    }))

    const agent = createAgent({
      systemPrompt: 'You are helpful.',
      model: [fakeModel],
      tools: { lookupAccount: {} },
      streamText: streamText as never,
      telemetry,
      auditTrail,
      redactors: redactor,
    })

    const events = []
    for await (const event of agent.send('look up the account')) {
      events.push(event)
    }

    expect(events).toContainEqual({
      type: 'tool-result',
      toolCallId: 'tool-1',
      toolName: 'lookupAccount',
      output: {
        email: '[REDACTED:email]',
        phone: '[REDACTED:phone]',
        note: 'No sensitive content here.',
      },
    })
    expect(telemetry.events().at(-1)?.data).not.toContain('sam@example.com')
    expect(auditTrail.entries?.()[0]?.event.output).toMatchObject({
      email: '[REDACTED:email]',
      phone: '[REDACTED:phone]',
    })
  })

  it('filters dynamic tool manifests by identity roles and permissions', async () => {
    const userTool = { execute: vi.fn() }
    const adminTool = { execute: vi.fn() }
    const manifests = [
      { name: 'searchOrders', tool: userTool, permissions: ['orders:read'] },
      { name: 'suspendAccount', tool: adminTool, roles: ['admin'], permissions: ['accounts:suspend'] },
    ]

    const session = await resolveSessionContext({
      identityProvider: () => ({
        id: 'user-1',
        roles: ['support'],
        permissions: ['orders:read'],
      }),
    })

    const allowed = filterToolManifestsForSession(manifests, session)
    expect(toolsFromManifests(allowed)).toEqual({ searchOrders: userTool })
  })

  it('passes session auth and identity into contextual tool execution', async () => {
    const execute = vi.fn((_input, context) => context)
    const wrapped = withToolContext(
      {
        searchAccountData: { execute },
      },
      {
        session: {
          identity: { id: 'user-1', roles: ['admin'] },
          auth: { headers: { authorization: 'Bearer test' } },
        },
        identity: { id: 'user-1', roles: ['admin'] },
        auth: { headers: { authorization: 'Bearer test' } },
      },
    )

    const result = await (wrapped.searchAccountData as { execute: (input: Record<string, unknown>) => Promise<unknown> }).execute({})

    expect(execute).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        identity: { id: 'user-1', roles: ['admin'] },
        auth: { headers: { authorization: 'Bearer test' } },
      }),
    )
    expect(result).toMatchObject({ identity: { id: 'user-1' } })
  })

  it('routes through a supervisor router using intent patterns before fallback', async () => {
    const localModel = { provider: 'local', modelId: 'local', specificationVersion: 'v3' } as LanguageModelV3
    const analysisModel = { provider: 'analysis', modelId: 'analysis', specificationVersion: 'v3' } as LanguageModelV3
    const router = createSupervisorRouter({
      fallback: [localModel],
      workers: [
        {
          id: 'analysis-worker',
          model: [analysisModel],
          patterns: [/synthesize/i],
        },
      ],
    })

    await expect(
      router({
        input: 'synthesize this account history',
        messages: [],
        tools: [],
        session: {},
        defaultModel: [localModel],
        phase: 'send',
      }),
    ).resolves.toEqual([analysisModel])

    await expect(
      router({
        input: 'open cart',
        messages: [],
        tools: [],
        session: {},
        defaultModel: [localModel],
        phase: 'send',
      }),
    ).resolves.toEqual([localModel])
  })

  it('passes a standardized handoff envelope to routed worker callbacks', async () => {
    const localModel = { provider: 'local', modelId: 'local', specificationVersion: 'v3' } as LanguageModelV3
    const cloudModel = { provider: 'cloud', modelId: 'cloud', specificationVersion: 'v3' } as LanguageModelV3
    const onHandoff = vi.fn()
    const router = createSupervisorRouter({
      fallback: [localModel],
      workers: [
        {
          id: 'cloud-worker',
          model: [cloudModel],
          intents: ['synthesize'],
          onHandoff,
        },
      ],
    })
    const handoff = createHandoffEnvelope({
      input: 'synthesize churn risk',
      intent: 'synthesize',
      messages: [{ role: 'user', content: 'synthesize churn risk' }],
      session: {
        identity: { id: 'user-1', roles: ['admin'], claims: { jwt: 'secret' } },
        state: { route: '/accounts', summary: 'Viewing ACME account.' },
      },
      memory: [{ id: 'm1', title: 'Account', body: 'ACME prefers annual billing.' }],
      tools: ['searchAccounts', 'updatePlan'],
      trace: { sessionId: 'session-1', runId: 'run-1', phase: 'send' },
    })

    await expect(
      router({
        input: 'synthesize churn risk',
        messages: [],
        tools: ['searchAccounts', 'updatePlan'],
        session: {},
        defaultModel: [localModel],
        phase: 'send',
        handoff,
      }),
    ).resolves.toEqual([cloudModel])

    expect(onHandoff).toHaveBeenCalledWith(expect.objectContaining({
      input: 'synthesize churn risk',
      memory: [{ id: 'm1', title: 'Account', body: 'ACME prefers annual billing.' }],
      session: expect.objectContaining({
        identity: expect.objectContaining({ id: 'user-1', roles: ['admin'] }),
        state: expect.objectContaining({ summary: 'Viewing ACME account.' }),
      }),
      tools: [{ name: 'searchAccounts' }, { name: 'updatePlan' }],
    }))
    expect(JSON.stringify(onHandoff.mock.calls[0][0])).not.toContain('secret')
  })
})

describe('createMarkdownMemoryStore', () => {
  it('turns markdown headings into searchable memory records', async () => {
    const store = createMarkdownMemoryStore({
      documents: [
        {
          id: 'workflows',
          tags: ['checkout'],
          content: `# Checkout
Use order lookup before refunds.

## VIP handling
Offer curbside pickup for preferred shoppers.`,
        },
      ],
    })

    const results = await store.search('preferred pickup', {
      input: 'preferred pickup',
      session: {},
    })

    expect(results[0]).toMatchObject({
      title: 'VIP handling',
      body: expect.stringContaining('curbside pickup'),
      tags: ['checkout'],
    })
  })

  it('compacts append-heavy markdown records into a searchable snapshot', async () => {
    const store = createMarkdownMemoryStore({
      documents: [
        {
          id: 'history',
          content: `# Turn 1
Customer asked about refunds for order A.

# Turn 2
Agent checked warranty and offered store credit.

# Turn 3
Customer prefers curbside pickup and text updates.`,
        },
      ],
      compaction: {
        thresholdTokens: 8,
        summarize: records => `Current state snapshot:\n${records.map(record => `- ${record.body}`).join('\n')}`,
      },
    })

    const result = await store.compact?.({
      input: 'pickup',
      session: {},
      thresholdTokens: 8,
    })
    const records = store.records?.() ?? []
    const search = await store.search('curbside pickup', { input: 'curbside pickup', session: {} })

    expect(result).toMatchObject({
      compacted: true,
      archivedRecords: expect.arrayContaining([expect.objectContaining({ title: 'Turn 1' })]),
      snapshot: expect.objectContaining({ title: 'Current state snapshot' }),
    })
    expect(records).toHaveLength(1)
    expect(records[0].body).toContain('Customer prefers curbside pickup')
    expect(search[0].title).toBe('Current state snapshot')
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

  it('repairs validation-shaped tool failures invisibly before surfacing a response', async () => {
    const streamText = vi
      .fn()
      .mockImplementationOnce(() => ({
        fullStream: (async function* () {
          yield {
            type: 'error',
            error: {
              name: 'AI_TypeValidationError',
              message: 'Invalid tool arguments for searchProducts: size must be a string.',
            },
          }
        })(),
        response: Promise.resolve({ messages: [] }),
      }))
      .mockImplementationOnce(() => ({
        fullStream: (async function* () {
          yield { type: 'text-delta', delta: 'Found Nike Dunk Low in size 9.' }
        })(),
        response: Promise.resolve({
          messages: [{ role: 'assistant', content: [{ type: 'text', text: 'Found Nike Dunk Low in size 9.' }] }],
        }),
      }))
    const agent = createAgent({
      systemPrompt: 'You are helpful.',
      model: [fakeModel],
      tools: { searchProducts: {} },
      streamText: streamText as never,
      toolRepair: { maxAttempts: 2 },
    })

    const events = []
    for await (const event of agent.send('find size nine dunks')) {
      events.push(event)
    }

    expect(streamText).toHaveBeenCalledTimes(2)
    expect(events.some(event => event.type === 'error')).toBe(false)
    expect(events).toContainEqual({ type: 'text-delta', text: 'Found Nike Dunk Low in size 9.' })
    expect(streamText.mock.calls[1][0].messages.at(-1)).toMatchObject({
      role: 'user',
      content: expect.stringContaining('The previous tool call failed validation'),
    })
  })

  it('surfaces a tool validation error after the repair limit is exhausted', async () => {
    const streamText = vi.fn(() => ({
      fullStream: (async function* () {
        yield {
          type: 'error',
          error: {
            name: 'AI_TypeValidationError',
            message: 'Invalid tool arguments.',
          },
        }
      })(),
      response: Promise.resolve({ messages: [] }),
    }))
    const agent = createAgent({
      systemPrompt: 'You are helpful.',
      model: [fakeModel],
      tools: { searchProducts: {} },
      streamText: streamText as never,
      toolRepair: { maxAttempts: 1 },
    })

    const events = []
    for await (const event of agent.send('find shoes')) {
      events.push(event)
    }

    expect(streamText).toHaveBeenCalledTimes(2)
    expect(events).toContainEqual({
      type: 'error',
      error: {
        name: 'AI_TypeValidationError',
        message: 'Invalid tool arguments.',
      },
    })
  })
})

describe('createHandoffEnvelope', () => {
  it('packages intent, state, memory, messages, and tool names without secret claims', () => {
    const envelope = createHandoffEnvelope({
      input: 'plan an account save workflow',
      intent: 'account-save',
      messages: [{ role: 'user', content: 'plan an account save workflow' }],
      session: {
        identity: { id: 'user-1', tenantId: 'tenant-1', roles: ['admin'], claims: { token: 'secret' } },
        state: { route: '/accounts/acme', summary: 'Viewing ACME renewal risk.' },
      },
      memory: [{ id: 'pref', body: 'ACME wants annual billing.' }],
      tools: ['searchAccounts'],
      trace: { sessionId: 'session-1', runId: 'run-1', phase: 'send' },
    })

    expect(envelope).toMatchObject({
      version: 'edgekit.handoff.v1',
      input: 'plan an account save workflow',
      intent: 'account-save',
      session: {
        identity: { id: 'user-1', tenantId: 'tenant-1', roles: ['admin'], permissions: [] },
        state: { route: '/accounts/acme', summary: 'Viewing ACME renewal risk.' },
      },
      memory: [{ id: 'pref', body: 'ACME wants annual billing.' }],
      tools: [{ name: 'searchAccounts' }],
      trace: { sessionId: 'session-1', runId: 'run-1', phase: 'send' },
    })
    expect(envelope.approximateTokens).toBeGreaterThan(0)
    expect(JSON.stringify(envelope)).not.toContain('secret')
  })

  it('estimates tokens from serialized payload size', () => {
    expect(estimateTokens('12345678')).toBe(2)
    expect(estimateTokens({ a: '12345678' })).toBeGreaterThan(2)
  })
})

describe('modelOptional', () => {
  it('normalizes omitted and null model slots to undefined', () => {
    const inputSchema = z.object({
      query: z.string(),
      size: modelOptional(z.string()),
      maxPrice: modelOptional(z.number()),
    })

    expect(inputSchema.parse({ query: 'nike dunks' })).toEqual({
      query: 'nike dunks',
    })
    expect(inputSchema.parse({ query: 'nike dunks', size: null, maxPrice: null })).toEqual({
      query: 'nike dunks',
      size: undefined,
      maxPrice: undefined,
    })
    expect(inputSchema.parse({ query: 'nike dunks', size: '9', maxPrice: 100 })).toEqual({
      query: 'nike dunks',
      size: '9',
      maxPrice: 100,
    })
  })

  it('keeps invalid concrete values invalid', () => {
    const inputSchema = z.object({
      maxPrice: modelOptional(z.number()),
    })

    expect(inputSchema.safeParse({ maxPrice: '100' }).success).toBe(false)
  })
})

describe('actionsToEdgeView', () => {
  it('converts tool actions into declarative EdgeView cards', () => {
    expect(
      actionsToEdgeView([
        {
          id: 'add-dunk',
          label: 'Add Nike Dunk Low to cart',
          toolName: 'addToCart',
          description: 'Choose a size.',
          input: { productId: 'dunk', quantity: 1 },
          fields: [
            {
              name: 'size',
              label: 'Size',
              type: 'select',
              required: true,
              options: [{ label: '11', value: '11' }],
            },
          ],
        },
      ]),
    ).toEqual([
      {
        type: 'card',
        id: 'add-dunk-card',
        title: 'Add Nike Dunk Low to cart',
        description: 'Choose a size.',
        children: [
          {
            type: 'form',
            id: 'add-dunk',
            toolName: 'addToCart',
            submitLabel: 'Add Nike Dunk Low to cart',
            input: { productId: 'dunk', quantity: 1 },
            fields: [
              {
                name: 'size',
                label: 'Size',
                type: 'select',
                required: true,
                options: [{ label: '11', value: '11' }],
              },
            ],
          },
        ],
      },
    ])
  })
})

describe('AG-UI adapter', () => {
  it('maps AG-UI text, tool result, and custom EdgeView events to AgentEvent values', () => {
    expect(
      agUiEventToAgentEvents({
        type: 'TEXT_MESSAGE_CONTENT',
        delta: 'Hello',
      }),
    ).toEqual([{ type: 'text-delta', text: 'Hello' }])

    expect(
      agUiEventToAgentEvents({
        type: 'TOOL_CALL_RESULT',
        toolCallId: 'tool-1',
        toolCallName: 'searchProducts',
        content: { results: [] },
      }),
    ).toEqual([
      {
        type: 'tool-result',
        toolCallId: 'tool-1',
        toolName: 'searchProducts',
        output: { results: [] },
      },
    ])

    expect(
      agUiEventToAgentEvents({
        type: 'CUSTOM',
        name: 'edgekit.view',
        value: {
          type: 'text',
          text: 'A declarative UI payload',
        },
      }),
    ).toEqual([
      {
        type: 'view',
        view: {
          type: 'text',
          text: 'A declarative UI payload',
        },
      },
    ])
  })

  it('creates an EdgeAgent over AG-UI event streams', async () => {
    const agent = createAgUiAgent({
      run: async function* ({ input }) {
        yield { type: 'RUN_STARTED', input }
        yield { type: 'TEXT_MESSAGE_CONTENT', delta: 'From AG-UI' }
        yield { type: 'RUN_FINISHED' }
      },
    })

    const events = []
    for await (const event of agent.send('hello')) {
      events.push(event)
    }

    expect(events).toEqual([
      { type: 'text-delta', text: 'From AG-UI' },
      { type: 'done', text: 'From AG-UI' },
    ])
  })
})

describe('MCP adapter', () => {
  it('turns MCP tool definitions into executable AI SDK tools', async () => {
    const calls: unknown[] = []
    const tools = mcpToolsFromDefinitions(
      [
        {
          name: 'searchDocs',
          description: 'Search docs',
          inputSchema: {
            type: 'object',
            required: ['query'],
            properties: {
              query: { type: 'string' },
            },
          },
        },
      ],
      {
        callTool: async (name, input) => {
          calls.push({ name, input })
          return { results: ['ok'] }
        },
      },
    )

    const result = await (tools.searchDocs as { execute: (input: Record<string, unknown>) => Promise<unknown> }).execute({
      query: 'edgekit',
    })

    expect(result).toEqual({ results: ['ok'] })
    expect(calls).toEqual([{ name: 'searchDocs', input: { query: 'edgekit' } }])
  })

  it('loads MCP tools from a client catalog', async () => {
    const tools = await loadMcpTools({
      listTools: async () => ({ tools: [{ name: 'ping' }] }),
      callTool: async () => 'pong',
    })

    expect(Object.keys(tools)).toEqual(['ping'])
  })
})
