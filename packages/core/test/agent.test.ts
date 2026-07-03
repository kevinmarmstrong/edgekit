import { describe, expect, it, vi } from 'vitest'
import type { LanguageModelV3 } from '@ai-sdk/provider'
import { z } from 'zod'
import {
  actionsToEdgeView,
  agUiEventToAgentEvents,
  createAgent,
  createAgUiAgent,
  createAuditTrail,
  createCascadeOnboardingController,
  createCascadeReadinessController,
  createHandoffEnvelope,
  createHybridModelRouter,
  createKnowledgeSkill,
  createKnowledgeTool,
  createMarkdownMemoryStore,
  createMemoryMutationJournal,
  createMemoryResponseCache,
  createMissionControl,
  createOfflineTool,
  createModelProvider,
  createPiiRedactor,
  createToolPolicyExecutor,
  createSupervisorRouter,
  executeParallelTools,
  filterToolManifestsForSession,
  loadMcpTools,
  mcpToolsFromDefinitions,
  modelOptional,
  estimateTokens,
  resolveSessionContext,
  resolveModel,
  syncMutationJournal,
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

  it('emits explicit handoff telemetry around app-owned worker routing without leaking secret claims', async () => {
    const events: Array<{ name: string; data?: unknown; provider?: string }> = []
    const localModel = { provider: 'local', modelId: 'local', specificationVersion: 'v3' } as LanguageModelV3
    const workerModel = { provider: 'worker', modelId: 'worker', specificationVersion: 'v3' } as LanguageModelV3
    const streamText = vi.fn(() => ({
      fullStream: (async function* () {
        yield { type: 'text-delta', delta: 'worker done' }
      })(),
      response: Promise.resolve({
        messages: [{ role: 'assistant', content: [{ type: 'text', text: 'worker done' }] }],
      }),
    }))
    const modelRouter = vi.fn(context => {
      expect(context.handoff).toMatchObject({
        input: 'synthesize account risk',
        trace: expect.objectContaining({ sessionId: 'handoff-session', phase: 'send' }),
        session: {
          identity: expect.objectContaining({ id: 'user-1', roles: ['analyst'] }),
          state: expect.objectContaining({ summary: 'Viewing a generic account.' }),
        },
      })
      return [workerModel]
    })
    const agent = createAgent({
      systemPrompt: 'You are helpful.',
      model: [localModel],
      modelRouter,
      tools: {},
      streamText: streamText as never,
      telemetry: event => events.push(event),
      sessionId: 'handoff-session',
      identityProvider: () => ({
        id: 'user-1',
        roles: ['analyst'],
        claims: { jwt: 'secret-worker-token' },
      }),
      stateProvider: () => ({ summary: 'Viewing a generic account.' }),
    })

    for await (const _ of agent.send('synthesize account risk')) {
      // drain
    }

    const handoffStart = events.find(event => event.name === 'handoff-start')
    const handoffFinish = events.find(event => event.name === 'handoff-finish')
    expect(modelRouter).toHaveBeenCalledOnce()
    expect(handoffStart?.data).toMatchObject({
      authority: 'app-owned-model-router',
      handoff: {
        version: 'edgekit.handoff.v1',
        phase: 'send',
        tools: [],
        identity: { id: 'user-1', roles: ['analyst'] },
        state: { summary: 'Viewing a generic account.' },
      },
    })
    expect(handoffFinish?.provider).toBe('worker')
    expect(handoffFinish?.data).toMatchObject({
      authority: 'app-owned-model-router',
      handoff: expect.objectContaining({ phase: 'send' }),
      result: { status: 'completed', provider: { id: 'worker', label: 'worker' } },
    })
    expect(JSON.stringify([handoffStart, handoffFinish])).not.toContain('secret-worker-token')
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

    expect(streamText.mock.calls[1]?.[0].messages).toContainEqual(
      expect.objectContaining({
        role: 'tool',
        content: [
          expect.objectContaining({
            type: 'tool-approval-response',
            approvalId: 'approval-1',
            approved: false,
          }),
        ],
      }),
    )
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

  it('stores redacted tool result payloads in model history for later turns', async () => {
    const redactor = (value: unknown, context: { toolName?: string; phase?: string }) =>
      (!context.toolName || context.toolName === 'lookupAccount') && context.phase === 'tool-result' && typeof value === 'string'
        ? value.replaceAll('sam@example.com', '[REDACTED:email]')
        : value
    const streamText = vi.fn()
      .mockReturnValueOnce({
        fullStream: (async function* () {
          yield {
            type: 'tool-result',
            toolCallId: 'tool-1',
            toolName: 'lookupAccount',
            output: { email: 'sam@example.com', note: 'keep this note' },
          }
        })(),
        response: Promise.resolve({
          messages: [
            {
              role: 'tool',
              content: [
                {
                  type: 'tool-result',
                  toolCallId: 'tool-1',
                  toolName: 'lookupAccount',
                  output: {
                    type: 'json',
                    value: { email: 'sam@example.com', note: 'keep this note' },
                  },
                },
                {
                  type: 'tool-result',
                  toolCallId: 'tool-2',
                  toolName: 'lookupAccount',
                  output: {
                    type: 'customer',
                    value: 'primary',
                    email: 'sam@example.com',
                    id: 'sam@example.com',
                  },
                },
              ],
            },
            {
              role: 'assistant',
              content: [{ type: 'text', text: 'The account email is sam@example.com.' }],
            },
          ],
        }),
      })
      .mockReturnValueOnce({
        fullStream: (async function* () {
          yield { type: 'text-delta', text: 'done' }
        })(),
        response: Promise.resolve({
          messages: [{ role: 'assistant', content: [{ type: 'text', text: 'done' }] }],
        }),
      })

    const agent = createAgent({
      systemPrompt: 'You are helpful.',
      model: [fakeModel],
      tools: { lookupAccount: {} },
      streamText: streamText as never,
      redactors: redactor,
    })

    for await (const _ of agent.send('look up the account')) {
      // drain
    }
    for await (const _ of agent.send('use the prior result')) {
      // drain
    }

    const secondCallMessages = JSON.stringify(streamText.mock.calls[1][0].messages)
    expect(secondCallMessages).not.toContain('sam@example.com')
    expect(secondCallMessages).toContain('[REDACTED:email]')
    expect(secondCallMessages).toContain('keep this note')
  })

  it('keeps tool-specific history redactors scoped to the local tool payload', async () => {
    const redactor = (value: unknown, context: { toolName?: string; phase?: string }) =>
      context.toolName === 'secretLookup' && context.phase === 'tool-result' && typeof value === 'string'
        ? '[REDACTED:secret]'
        : value
    const streamText = vi.fn()
      .mockReturnValueOnce({
        fullStream: (async function* () {
          yield {
            type: 'tool-result',
            toolCallId: 'tool-1',
            toolName: 'secretLookup',
            output: { secret: 'internal secret' },
          }
          yield {
            type: 'tool-result',
            toolCallId: 'tool-2',
            toolName: 'publicLookup',
            output: { fact: 'public fact' },
          }
        })(),
        response: Promise.resolve({
          messages: [
            {
              role: 'tool',
              content: [
                {
                  type: 'tool-result',
                  toolCallId: 'tool-1',
                  toolName: 'secretLookup',
                  output: { secret: 'internal secret' },
                },
                {
                  type: 'tool-result',
                  toolCallId: 'tool-2',
                  toolName: 'publicLookup',
                  output: { fact: 'public fact' },
                },
              ],
            },
            {
              role: 'assistant',
              content: [{ type: 'text', text: 'Use public fact in the answer.' }],
            },
          ],
        }),
      })
      .mockReturnValueOnce({
        fullStream: (async function* () {
          yield { type: 'text-delta', text: 'done' }
        })(),
        response: Promise.resolve({
          messages: [{ role: 'assistant', content: [{ type: 'text', text: 'done' }] }],
        }),
      })

    const agent = createAgent({
      systemPrompt: 'You are helpful.',
      model: [fakeModel],
      tools: { secretLookup: {}, publicLookup: {} },
      streamText: streamText as never,
      redactors: redactor,
    })

    for await (const _ of agent.send('look up secret and public facts')) {
      // drain
    }
    for await (const _ of agent.send('use the prior result')) {
      // drain
    }

    const secondCallMessages = JSON.stringify(streamText.mock.calls[1][0].messages)
    expect(secondCallMessages).not.toContain('internal secret')
    expect(secondCallMessages).toContain('[REDACTED:secret]')
    expect(secondCallMessages).toContain('public fact')
  })

  it('stores redacted approval response tool calls in model history', async () => {
    const redactor = (value: unknown, context: { toolName?: string; phase?: string }) => {
      if (typeof value !== 'string') return value
      if (value === 'tool-1') return '[REDACTED:id]'
      if (context.toolName === 'sendInvite' && context.phase === 'tool-result') {
        return value === 'sam@example.com' ? '[REDACTED:email]' : '[REDACTED:value]'
      }
      return value
    }
    const streamText = vi.fn()
      .mockReturnValueOnce({
        fullStream: (async function* () {
          yield {
            type: 'tool-approval-request',
            approvalId: 'approval-1',
            toolCall: {
              type: 'tool-call',
              toolCallId: 'tool-1',
              toolName: 'sendInvite',
              input: { email: 'sam@example.com', role: 'admin' },
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
                  toolCallId: 'tool-1',
                  toolCall: {
                    type: 'tool-call',
                    toolCallId: 'tool-1',
                    toolName: 'sendInvite',
                    input: { email: 'sam@example.com', role: 'admin' },
                  },
                },
              ],
            },
          ],
        }),
      })
      .mockReturnValueOnce({
        fullStream: (async function* () {
          yield { type: 'text-delta', text: 'done' }
        })(),
        response: Promise.resolve({
          messages: [{ role: 'assistant', content: [{ type: 'text', text: 'done' }] }],
        }),
      })

    const agent = createAgent({
      systemPrompt: 'You are helpful.',
      model: [fakeModel],
      tools: { sendInvite: {} },
      streamText: streamText as never,
      redactors: redactor,
    })

    for await (const _ of agent.send('invite Sam as an admin')) {
      // drain
    }
    for await (const _ of agent.respondToApproval('approval-1', true)) {
      // drain
    }

    const approvalRunMessages = JSON.stringify(streamText.mock.calls[1][0].messages)
    expect(approvalRunMessages).not.toContain('sam@example.com')
    expect(approvalRunMessages).toContain('[REDACTED:email]')
    expect(approvalRunMessages).toContain('sendInvite')
    expect(approvalRunMessages).toContain('tool-1')
    expect(approvalRunMessages).not.toContain('[REDACTED:id]')
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

  it('executes parallel-safe read tools concurrently and leaves unsafe tools sequential', async () => {
    const order: string[] = []
    const tools = {
      profile: {
        execute: async () => {
          order.push('profile-start')
          await new Promise(resolve => setTimeout(resolve, 30))
          order.push('profile-end')
          return { plan: 'pro' }
        },
      },
      weather: {
        execute: async () => {
          order.push('weather-start')
          await new Promise(resolve => setTimeout(resolve, 10))
          order.push('weather-end')
          return { temp: 72 }
        },
      },
      updateCart: {
        execute: async () => {
          order.push('cart')
          return { ok: true }
        },
      },
    }
    const results = await executeParallelTools({
      calls: [
        { id: 'call-1', toolName: 'profile', input: {} },
        { id: 'call-2', toolName: 'weather', input: {} },
        { id: 'call-3', toolName: 'updateCart', input: {} },
      ],
      tools,
      manifests: [
        { name: 'profile', tool: tools.profile, readOnly: true, parallelSafe: true },
        { name: 'weather', tool: tools.weather, readOnly: true, parallelSafe: true },
        { name: 'updateCart', tool: tools.updateCart },
      ],
      context: { session: {} },
    })

    expect(order.slice(0, 2).sort()).toEqual(['profile-start', 'weather-start'])
    expect(order.at(-1)).toBe('cart')
    expect(results).toEqual([
      { id: 'call-1', toolName: 'profile', output: { plan: 'pro' } },
      { id: 'call-2', toolName: 'weather', output: { temp: 72 } },
      { id: 'call-3', toolName: 'updateCart', output: { ok: true } },
    ])
  })

  it('queues offline-capable tool mutations and syncs them through the original tool context', async () => {
    const journal = createMemoryMutationJournal({ now: () => '2026-05-24T00:00:00.000Z' })
    const execute = vi.fn(async (input, context) => ({
      synced: true,
      input,
      userId: context.identity?.id,
    }))
    const addToCart = createOfflineTool({
      name: 'addToCart',
      tool: { execute },
      journal,
      online: () => false,
      idempotencyKey: input => `cart:${input.productId}:${input.size}`,
    })

    const queued = await addToCart.execute(
      { productId: 'dunk', size: '11' },
      { session: { identity: { id: 'user-1' } }, identity: { id: 'user-1' } },
    )

    expect(execute).not.toHaveBeenCalled()
    expect(queued).toMatchObject({
      queued: true,
      mutation: {
        toolName: 'addToCart',
        input: { productId: 'dunk', size: '11' },
        status: 'queued',
        idempotencyKey: 'cart:dunk:11',
      },
    })
    expect(await journal.list()).toHaveLength(1)

    const results = await syncMutationJournal({
      journal,
      tools: { addToCart: { execute } },
      context: { session: { identity: { id: 'user-1' } }, identity: { id: 'user-1' } },
      online: () => true,
    })

    expect(results).toEqual([
      expect.objectContaining({ toolName: 'addToCart', status: 'synced', output: expect.objectContaining({ userId: 'user-1' }) }),
    ])
    expect((await journal.list())[0]).toMatchObject({ status: 'synced', attempts: 1 })
  })

  it('marks offline sync conflicts for host review instead of dropping the mutation', async () => {
    const journal = createMemoryMutationJournal()
    await journal.enqueue({ toolName: 'updateTicket', input: { id: 'T-1' } })
    const conflict = Object.assign(new Error('version conflict'), { code: 'conflict' })

    const results = await syncMutationJournal({
      journal,
      tools: { updateTicket: { execute: async () => { throw conflict } } },
      context: { session: {} },
      online: () => true,
    })

    expect(results[0]).toMatchObject({ toolName: 'updateTicket', status: 'conflict' })
    expect((await journal.list())[0]).toMatchObject({ status: 'conflict', attempts: 1 })
  })

  it('enforces tool execution policy limits around untrusted tool calls', async () => {
    const executor = createToolPolicyExecutor({
      defaultPolicy: {
        timeoutMs: 15,
        maxInputBytes: 80,
        maxOutputBytes: 80,
      },
      policies: {
        slowTool: { timeoutMs: 5 },
      },
    })

    await expect(
      executor.execute({
        toolName: 'searchProducts',
        tool: { execute: async input => ({ ok: true, input }) },
        input: { query: 'dunks' },
        context: { session: {} },
      }),
    ).resolves.toMatchObject({ ok: true })

    await expect(
      executor.execute({
        toolName: 'searchProducts',
        tool: { execute: async () => ({ huge: 'x'.repeat(100) }) },
        input: { query: 'dunks' },
        context: { session: {} },
      }),
    ).rejects.toMatchObject({ name: 'EdgeToolPolicyError', code: 'output-too-large' })

    await expect(
      executor.execute({
        toolName: 'slowTool',
        tool: { execute: async () => new Promise(resolve => setTimeout(() => resolve({ ok: true }), 30)) },
        input: {},
        context: { session: {} },
      }),
    ).rejects.toMatchObject({ name: 'EdgeToolPolicyError', code: 'timeout' })
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

describe('knowledge access helpers', () => {
  it('wraps app-owned knowledge sources as citation-ready read tools', async () => {
    const searchCalls: unknown[] = []
    const tools = createKnowledgeTool({
      name: 'searchPolicies',
      defaultTopK: 1,
      source: {
        id: 'policy-kb',
        label: 'Policy KB',
        search: (query, context) => {
          searchCalls.push({ query, context })
          return [
            {
              id: 'refunds',
              title: 'Refund policy',
              excerpt: 'Refunds require an order lookup and manager approval.',
              source: 'support-policy.md',
              uri: '/policy/refunds',
              score: 0.92,
              citations: [{ label: 'Refund policy', uri: '/policy/refunds' }],
            },
            {
              id: 'shipping',
              title: 'Shipping policy',
              excerpt: 'Shipping upgrades are handled by support.',
            },
          ]
        },
        freshness: () => ({ stale: false, updatedAt: '2026-05-26T00:00:00.000Z' }),
      },
    })

    const result = await (
      tools.searchPolicies as { execute: (input: Record<string, unknown>, context: unknown) => Promise<unknown> }
    ).execute({ query: 'refund approval' }, { session: { identity: { id: 'u1', roles: ['support'] } } })

    expect(result).toMatchObject({
      source: { id: 'policy-kb', label: 'Policy KB' },
      query: 'refund approval',
      freshness: { stale: false },
      results: [
        {
          id: 'refunds',
          title: 'Refund policy',
          citations: [{ label: 'Refund policy', uri: '/policy/refunds' }],
        },
      ],
    })
    expect(searchCalls).toEqual([
      expect.objectContaining({
        query: 'refund approval',
        context: expect.objectContaining({
          topK: 1,
          session: expect.objectContaining({ identity: expect.objectContaining({ id: 'u1' }) }),
        }),
      }),
    ])
  })

  it('creates a Knowledge Access Skill with synthesis, citation, and protected-source metadata', () => {
    const skill = createKnowledgeSkill({
      id: 'support-policy',
      name: 'Support Policy Knowledge',
      description: 'Search support policies with source citations.',
      source: {
        id: 'support-policy-kb',
        search: () => [],
      },
      requiredFacts: ['policy title', 'approval requirement'],
    })

    expect(skill.requiredTools).toEqual(['searchSupportPolicy'])
    expect(Object.keys(skill.tools ?? {})).toEqual(['searchSupportPolicy'])
    expect(skill.policy).toMatchObject({ needsApproval: false, riskLevel: 'low' })
    expect(skill.synthesis?.requiredFacts).toEqual(
      expect.arrayContaining(['policy title', 'approval requirement', 'source citations', 'freshness or staleness status']),
    )
    expect(skill.protectedSections).toContain('source.authorization')
    expect(skill.meta).toMatchObject({ category: 'knowledge-access' })
  })
})

describe('createCascadeReadinessController', () => {
  it('reports local-ready when a provider resolves', async () => {
    const controller = createCascadeReadinessController({
      providers: [
        createModelProvider({
          id: 'chrome-ai',
          label: 'Chrome AI',
          resolve: async () => fakeModel,
        }),
      ],
      downloadPolicy: 'never',
      requiredCapabilities: ['local-model', 'tools', 'approvals'],
      requiredTools: ['searchDocs'],
      tools: { searchDocs: {} },
      now: () => '2026-05-26T00:00:00.000Z',
    })

    const snapshot = await controller.check()

    expect(snapshot).toMatchObject({
      mode: 'local-ready',
      canRunAgent: true,
      recommendedAction: {
        type: 'continue',
        label: 'Use local agent',
        provider: 'chrome-ai',
      },
      missingCapabilities: [],
    })
    expect(snapshot.capabilities).toEqual(expect.arrayContaining(['local-model', 'chrome-ai', 'tools', 'approvals']))
  })

  it('does not mark the agent runnable when required integration capabilities are missing', async () => {
    const controller = createCascadeReadinessController({
      providers: [
        createModelProvider({
          id: 'chrome-ai',
          label: 'Chrome AI',
          resolve: async () => fakeModel,
        }),
      ],
      requiredCapabilities: ['local-model', 'tools', 'approvals', 'edgeview'],
      requiredTools: ['searchAccounts', 'suspendAccount'],
      tools: { searchAccounts: {} },
      approvals: false,
      edgeView: false,
    })

    const snapshot = await controller.check()

    expect(snapshot.mode).toBe('local-ready')
    expect(snapshot.canRunAgent).toBe(false)
    expect(snapshot.missingCapabilities).toEqual(expect.arrayContaining(['tools', 'approvals', 'edgeview']))
    expect(snapshot.recommendedAction).toMatchObject({
      type: 'suggest',
      label: 'Complete setup',
    })
  })

  it('does not treat a cloud route as satisfying a required local model', async () => {
    const controller = createCascadeReadinessController({
      providers: [
        createModelProvider({
          id: 'cloud-route',
          label: 'Cloud route',
          resolve: async () => fakeModel,
        }),
      ],
      requiredCapabilities: ['local-model', 'cloud-route'],
    })

    const snapshot = await controller.check()

    expect(snapshot.capabilities).toContain('cloud-route')
    expect(snapshot.capabilities).not.toContain('local-model')
    expect(snapshot.canRunAgent).toBe(false)
    expect(snapshot.missingCapabilities).toEqual(['local-model'])
    expect(snapshot.recommendedAction).toMatchObject({
      type: 'suggest',
      label: 'Complete setup',
    })
  })

  it('marks a provider as downloadable and recommends prompting when downloads are allowed', async () => {
    const controller = createCascadeReadinessController({
      providers: [
        createModelProvider({
          id: 'chrome-ai',
          label: 'Chrome AI',
          resolve: async context => {
            const accepted = await context.requestDownload({
              provider: 'chrome-ai',
              message: 'Enable built-in browser AI?',
            })
            return accepted ? fakeModel : null
          },
        }),
      ],
      downloadPolicy: 'prompt',
    })

    const snapshot = await controller.check()

    expect(snapshot.mode).toBe('downloadable')
    expect(snapshot.recommendedAction).toMatchObject({
      type: 'prompt',
      provider: 'chrome-ai',
      message: 'Enable built-in browser AI?',
    })
  })

  it('uses fallback mode without prompting when public demos disable downloads', async () => {
    const controller = createCascadeReadinessController({
      providers: [
        createModelProvider({
          id: 'webllm',
          label: 'WebLLM',
          resolve: async context => {
            await context.requestDownload({
              provider: 'webllm',
              modelSize: 'small',
              message: 'Download a local model?',
            })
            return null
          },
        }),
      ],
      downloadPolicy: 'never',
      fallback: true,
      visibilityPolicy: 'show-basic-when-local-unavailable',
    })

    const snapshot = await controller.check()

    expect(snapshot.mode).toBe('fallback-ready')
    expect(snapshot.canUseFallback).toBe(true)
    expect(snapshot.recommendedAction.type).toBe('fallback')
    expect(snapshot.providers[0]).toMatchObject({ status: 'skipped' })
  })

  it('can hide features until required capabilities are available', async () => {
    const controller = createCascadeReadinessController({
      providers: [
        createModelProvider({
          id: 'empty',
          label: 'Empty',
          resolve: async () => null,
        }),
      ],
      requiredCapabilities: ['local-model'],
      visibilityPolicy: 'hide-until-ready',
    })

    const snapshot = await controller.check()

    expect(snapshot.mode).toBe('hidden')
    expect(snapshot.shouldHideFeatures).toBe(true)
    expect(snapshot.missingCapabilities).toEqual(['local-model'])
    expect(snapshot.recommendedAction.type).toBe('hide')
  })

  it('adds adopter-facing display fields that distinguish local, cloud, downloadable, hidden, and basic modes', async () => {
    const local = createCascadeReadinessController({
      providers: [createModelProvider({ id: 'chrome-ai', label: 'Chrome AI', resolve: async () => fakeModel })],
    })
    const cloud = createCascadeReadinessController({
      providers: [createModelProvider({ id: 'server-route', label: 'Server route', resolve: async () => fakeModel })],
    })
    const downloadable = createCascadeReadinessController({
      providers: [
        createModelProvider({
          id: 'webllm',
          label: 'WebLLM',
          resolve: async context => {
            await context.requestDownload({ provider: 'webllm', modelSize: 'small', message: 'Download a local model?' })
            return null
          },
        }),
      ],
      downloadPolicy: 'prompt',
    })
    const downloading = createCascadeReadinessController()
    const hidden = createCascadeReadinessController()
    const basic = createCascadeReadinessController({ fallback: true })

    await expect(local.check()).resolves.toMatchObject({
      mode: 'local-ready',
      displayMode: 'local-ready',
      providerKind: 'local',
      choiceState: 'ready',
    })
    await expect(cloud.check()).resolves.toMatchObject({
      mode: 'local-ready',
      displayMode: 'cloud-ready',
      providerKind: 'cloud',
      choiceState: 'ready',
    })
    await expect(downloadable.check()).resolves.toMatchObject({
      mode: 'downloadable',
      displayMode: 'local-downloadable',
      providerKind: 'local',
      choiceState: 'downloadable',
    })
    expect(downloading.recordStatus({ provider: 'webllm', status: 'downloading' })).toMatchObject({
      mode: 'downloadable',
      displayMode: 'local-downloading',
      providerKind: 'local',
      choiceState: 'downloading',
    })
    expect(hidden.hideAgent('Hidden by preference.')).toMatchObject({
      mode: 'hidden',
      displayMode: 'hidden',
      providerKind: 'none',
      choiceState: 'hidden',
    })
    expect(basic.useFallback()).toMatchObject({
      mode: 'fallback-ready',
      displayMode: 'basic-fallback',
      providerKind: 'basic',
      choiceState: 'fallback',
    })
  })

  it('provides a local-first onboarding controller with reusable switching methods and injected preferences', async () => {
    const writes: Array<{ mode: string; providerId?: string; reason?: string }> = []
    let openReason = ''
    let preference: { mode: 'auto' | 'local' | 'server' | 'basic'; providerId?: string; reason?: string } = { mode: 'auto' }
    const preferenceStore = {
      read: () => preference,
      write: (choice: { mode: 'auto' | 'local' | 'server' | 'basic'; providerId?: string; reason?: string }) => {
        preference = choice
        writes.push(choice)
      },
      clear: vi.fn(() => {
        preference = { mode: 'auto' }
      }),
    }
    const controller = createCascadeOnboardingController({
      providers: [
        createModelProvider({ id: 'chrome-ai', label: 'Chrome AI', resolve: async () => fakeModel }),
        createModelProvider({ id: 'server-route', label: 'Server route', resolve: async () => fakeModel }),
      ],
      fallback: true,
      preferenceStore,
      onChoiceOpen: reason => {
        openReason = reason ?? ''
      },
    })

    await expect(controller.check()).resolves.toMatchObject({
      displayMode: 'local-ready',
      providerKind: 'local',
      choiceState: 'ready',
      capabilities: expect.not.arrayContaining(['no-model-fallback']),
    })
    expect(controller.openChoice('settings')).toMatchObject({ displayMode: 'local-ready' })
    expect(openReason).toBe('settings')

    expect(controller.chooseBasic('user-choice')).toMatchObject({
      displayMode: 'basic-fallback',
      providerKind: 'basic',
      choiceState: 'fallback',
    })
    expect(writes.at(-1)).toMatchObject({ mode: 'basic', reason: 'user-choice' })

    await expect(controller.chooseServer('server-route')).resolves.toMatchObject({
      displayMode: 'cloud-ready',
      providerKind: 'cloud',
      choiceState: 'ready',
    })
    expect(writes.at(-1)).toMatchObject({ mode: 'server', providerId: 'server-route' })

    await expect(controller.chooseLocal('chrome-ai')).resolves.toMatchObject({
      displayMode: 'local-ready',
      providerKind: 'local',
      choiceState: 'ready',
    })
    expect(writes.at(-1)).toMatchObject({ mode: 'local', providerId: 'chrome-ai' })

    await controller.resetChoice()
    expect(preferenceStore.clear).toHaveBeenCalledOnce()
  })
})

describe('createAgent', () => {
  it('reports no-model instead of throwing when the cascade cannot resolve a model', async () => {
    const statuses: string[] = []
    const noModelInputs: string[] = []
    const readiness = createCascadeReadinessController({
      downloadPolicy: 'never',
      fallback: true,
    })
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
      cascadeReadiness: readiness,
    })

    const events = []
    for await (const event of agent.send('hello')) {
      events.push(event)
    }

    expect(events).toContainEqual(expect.objectContaining({
      type: 'no-model',
      message: 'No model available.',
    }))
    expect(statuses).toContain('unavailable')
    expect(noModelInputs).toEqual(['hello'])
    expect(events.find(event => event.type === 'no-model')).toMatchObject({
      readiness: {
        mode: 'fallback-ready',
        recommendedAction: { type: 'fallback' },
      },
    })
  })

  it('validates no-model fallback text in strict grounding mode', async () => {
    const agent = createAgent({
      systemPrompt: 'Answer from site evidence.',
      model: [createModelProvider({ id: 'none', label: 'None', resolve: async () => null })],
      tools: { searchSite: { execute: vi.fn() } },
      grounding: 'strict',
      agentIdentity: {
        name: 'Site assistant',
        noEvidenceMessage: 'I do not know from this site.',
      },
      downloadPolicy: 'never',
      onNoModel: () => 'I am created by the Gemma team.',
    })
    const events = []

    for await (const event of agent.send('who are you?')) {
      events.push(event)
    }

    expect(events).toContainEqual(expect.objectContaining({
      type: 'no-model',
      message: 'I do not know from this site.',
    }))
    expect(events).not.toContainEqual(expect.objectContaining({
      message: 'I am created by the Gemma team.',
    }))
  })

  it('treats no-model callTool results as strict grounding evidence', async () => {
    const searchSite = vi.fn(async () => ({ results: [{ title: 'Identity', excerpt: 'I am the Site assistant.' }] }))
    const agent = createAgent({
      systemPrompt: 'Answer from site evidence.',
      model: [createModelProvider({ id: 'none', label: 'None', resolve: async () => null })],
      tools: { searchSite: { execute: searchSite, readOnly: true } },
      grounding: 'strict',
      agentIdentity: {
        name: 'Site assistant',
        noEvidenceMessage: 'I do not know from this site.',
      },
      downloadPolicy: 'never',
      onNoModel: async ({ callTool }) => {
        await callTool('searchSite', { query: 'identity' })
        return 'I am the Site assistant.'
      },
    })
    const events = []

    for await (const event of agent.send('who are you?')) {
      events.push(event)
    }

    expect(searchSite).toHaveBeenCalledWith({ query: 'identity' }, expect.objectContaining({ session: expect.any(Object) }))
    expect(events).toContainEqual(expect.objectContaining({
      type: 'no-model',
      message: 'I am the Site assistant.',
    }))
  })

  it('redacts no-model callTool results before fallback handlers consume them', async () => {
    const searchSite = vi.fn(async () => ({
      results: [{ title: 'Contact', excerpt: 'Reach Kevin at kevin@example.test.' }],
    }))
    const redactor = (value: unknown, context: { phase?: string }) => {
      if (context.phase !== 'tool-result' || typeof value !== 'string') return value
      return value.replaceAll('kevin@example.test', '[REDACTED:email]')
    }
    const agent = createAgent({
      systemPrompt: 'Answer from site evidence.',
      model: [createModelProvider({ id: 'none', label: 'None', resolve: async () => null })],
      tools: { searchSite: { execute: searchSite, readOnly: true } },
      redactors: redactor,
      grounding: 'strict',
      agentIdentity: {
        name: 'Site assistant',
        noEvidenceMessage: 'I do not know from this site.',
      },
      downloadPolicy: 'never',
      onNoModel: async ({ callTool }) => {
        const output = await callTool('searchSite', { query: 'contact' })
        return JSON.stringify(output)
      },
    })
    const events = []

    for await (const event of agent.send('how do I contact Kevin?')) {
      events.push(event)
    }

    const noModelEvent = events.find(event => event.type === 'no-model')
    expect(noModelEvent).toMatchObject({
      message: expect.stringContaining('[REDACTED:email]'),
    })
    expect(noModelEvent).toMatchObject({
      message: expect.not.stringContaining('kevin@example.test'),
    })
  })

  it('denies unmanifested mutating tools in no-model fallback by default', async () => {
    const addToCart = vi.fn(async () => ({ ok: true }))
    const agent = createAgent({
      systemPrompt: 'Answer from site evidence.',
      model: [createModelProvider({ id: 'none', label: 'None', resolve: async () => null })],
      tools: { addToCart: { execute: addToCart, needsApproval: true } },
      downloadPolicy: 'never',
      onNoModel: async ({ callTool }) => {
        try {
          await callTool('addToCart', { productId: 'dunk' })
          return 'tool ran'
        } catch (error) {
          return error instanceof Error ? error.message : 'blocked'
        }
      },
    })
    const events = []

    for await (const event of agent.send('add dunk to cart')) {
      events.push(event)
    }

    expect(addToCart).not.toHaveBeenCalled()
    expect(events).toContainEqual(expect.objectContaining({
      type: 'no-model',
      message: 'Tool "addToCart" requires approval and cannot run in no-model fallback.',
    }))
  })

  it('evaluates function-valued approval gates before no-model tool execution', async () => {
    const addToCart = vi.fn(async () => ({ ok: true }))
    const needsApproval = vi.fn((input: Record<string, unknown>) => input.productId === 'dunk')
    const agent = createAgent({
      systemPrompt: 'Answer from site evidence.',
      model: [createModelProvider({ id: 'none', label: 'None', resolve: async () => null })],
      tools: { addToCart: { execute: addToCart, readOnly: true, needsApproval } },
      downloadPolicy: 'never',
      onNoModel: async ({ callTool }) => {
        try {
          await callTool('addToCart', { productId: 'dunk' })
          return 'tool ran'
        } catch (error) {
          return error instanceof Error ? error.message : 'blocked'
        }
      },
    })
    const events = []

    for await (const event of agent.send('add dunk to cart')) {
      events.push(event)
    }

    expect(needsApproval).toHaveBeenCalledWith(
      { productId: 'dunk' },
      expect.objectContaining({ session: expect.any(Object), args: { productId: 'dunk' } }),
    )
    expect(addToCart).not.toHaveBeenCalled()
    expect(events).toContainEqual(expect.objectContaining({
      type: 'no-model',
      message: 'Tool "addToCart" requires approval and cannot run in no-model fallback.',
    }))
  })

  it('lets approval gates dominate read-only manifests in no-model fallback', async () => {
    const addToCart = vi.fn(async () => ({ ok: true }))
    const agent = createAgent({
      systemPrompt: 'Answer from site evidence.',
      model: [createModelProvider({ id: 'none', label: 'None', resolve: async () => null })],
      tools: { addToCart: { execute: addToCart, needsApproval: true } },
      toolManifests: [{ name: 'addToCart', tool: { execute: addToCart, needsApproval: true }, readOnly: true }],
      downloadPolicy: 'never',
      onNoModel: async ({ callTool }) => {
        try {
          await callTool('addToCart', { productId: 'dunk' })
          return 'tool ran'
        } catch (error) {
          return error instanceof Error ? error.message : 'blocked'
        }
      },
    })
    const events = []

    for await (const event of agent.send('add dunk to cart')) {
      events.push(event)
    }

    expect(addToCart).not.toHaveBeenCalled()
    expect(events).toContainEqual(expect.objectContaining({
      type: 'no-model',
      message: 'Tool "addToCart" requires approval and cannot run in no-model fallback.',
    }))
  })

  it('returns a cached response without invoking model inference', async () => {
    const responseCache = createMemoryResponseCache()
    await responseCache.set({
      key: 'edgekit-cache:test',
      text: 'Cached answer.',
      createdAt: '2026-05-24T00:00:00.000Z',
    })
    const streamText = vi.fn()
    const agent = createAgent({
      systemPrompt: 'You are helpful.',
      model: [fakeModel],
      tools: {},
      streamText: streamText as never,
      responseCache,
      cachePolicy: {
        key: () => 'edgekit-cache:test',
      },
    })

    const events = []
    for await (const event of agent.send('business hours?')) {
      events.push(event)
    }

    expect(streamText).not.toHaveBeenCalled()
    expect(events).toContainEqual({
      type: 'activity',
      activity: expect.objectContaining({ label: 'Using cached response', status: 'completed' }),
    })
    expect(events).toContainEqual({ type: 'text-delta', text: 'Cached answer.' })
    expect(events).toContainEqual({ type: 'done', text: 'Cached answer.' })
  })

  it('skips strict cached responses that do not carry evidence metadata', async () => {
    const responseCache = createMemoryResponseCache()
    await responseCache.set({
      key: 'edgekit-cache:identity',
      text: 'I am created by the Gemma team.',
      createdAt: '2026-05-24T00:00:00.000Z',
    })
    const streamText = vi.fn(() => ({
      fullStream: (async function* () {
        yield { type: 'tool-call', toolCallId: 'tool-1', toolName: 'searchSite', input: { query: 'identity' } }
        yield { type: 'tool-result', toolCallId: 'tool-1', toolName: 'searchSite', output: { results: [{ title: 'Identity' }] } }
        yield { type: 'text-delta', delta: 'I am the Site assistant.' }
      })(),
      response: Promise.resolve({
        messages: [{ role: 'assistant', content: [{ type: 'text', text: 'I am the Site assistant.' }] }],
      }),
    }))
    const agent = createAgent({
      systemPrompt: 'Answer from site evidence.',
      model: [fakeModel],
      tools: { searchSite: {} },
      grounding: 'strict',
      agentIdentity: {
        name: 'Site assistant',
        noEvidenceMessage: 'I do not know from this site.',
      },
      streamText: streamText as never,
      responseCache,
      cachePolicy: {
        key: () => 'edgekit-cache:identity',
      },
    })
    const events = []

    for await (const event of agent.send('who are you?')) {
      events.push(event)
    }

    expect(streamText).toHaveBeenCalled()
    expect(events).not.toContainEqual({ type: 'text-delta', text: 'I am created by the Gemma team.' })
    expect(events).toContainEqual({ type: 'text-delta', text: 'I am the Site assistant.' })
    expect(events).toContainEqual({ type: 'done', text: 'I am the Site assistant.' })
  })

  it('uses strict cached responses that carry prior evidence metadata', async () => {
    const responseCache = createMemoryResponseCache()
    await responseCache.set({
      key: 'edgekit-cache:grounded',
      text: 'Cached grounded answer.',
      createdAt: '2026-05-24T00:00:00.000Z',
      metadata: { grounding: 'strict', hasUsableEvidence: true },
    })
    const streamText = vi.fn()
    const agent = createAgent({
      systemPrompt: 'Answer from site evidence.',
      model: [fakeModel],
      tools: { searchSite: {} },
      grounding: 'strict',
      agentIdentity: {
        name: 'Site assistant',
        noEvidenceMessage: 'I do not know from this site.',
      },
      streamText: streamText as never,
      responseCache,
      cachePolicy: {
        key: () => 'edgekit-cache:grounded',
      },
    })
    const events = []

    for await (const event of agent.send('what did search find?')) {
      events.push(event)
    }

    expect(streamText).not.toHaveBeenCalled()
    expect(events).toContainEqual({ type: 'text-delta', text: 'Cached grounded answer.' })
    expect(events).toContainEqual({ type: 'done', text: 'Cached grounded answer.' })
  })

  it('caches clean text responses and skips caching tool workflows', async () => {
    const responseCache = createMemoryResponseCache()
    const streamText = vi
      .fn()
      .mockImplementationOnce(() => ({
        fullStream: (async function* () {
          yield { type: 'text-delta', delta: 'Fresh answer.' }
        })(),
        response: Promise.resolve({
          messages: [{ role: 'assistant', content: [{ type: 'text', text: 'Fresh answer.' }] }],
        }),
      }))
      .mockImplementationOnce(() => ({
        fullStream: (async function* () {
          yield { type: 'tool-call', toolCallId: 'tool-1', toolName: 'searchProducts', input: { query: 'dunks' } }
          yield { type: 'text-delta', delta: 'Tool answer.' }
        })(),
        response: Promise.resolve({
          messages: [{ role: 'assistant', content: [{ type: 'text', text: 'Tool answer.' }] }],
        }),
      }))
    const agent = createAgent({
      systemPrompt: 'You are helpful.',
      model: [fakeModel],
      tools: { searchProducts: {} },
      streamText: streamText as never,
      responseCache,
      cachePolicy: {
        key: ({ input }) => `edgekit-cache:${input}`,
      },
    })

    for await (const _ of agent.send('what are your hours?')) {
      // drain
    }
    for await (const _ of agent.send('find dunks')) {
      // drain
    }

    expect(await responseCache.get('edgekit-cache:what are your hours?')).toMatchObject({ text: 'Fresh answer.' })
    expect(await responseCache.get('edgekit-cache:find dunks')).toBeNull()
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

  it('passes toolChoice through to the model stream', async () => {
    const streamText = vi.fn(() => ({
      fullStream: (async function* () {
        yield { type: 'text-delta', delta: 'ok' }
      })(),
      response: Promise.resolve({
        messages: [{ role: 'assistant', content: [{ type: 'text', text: 'ok' }] }],
      }),
    }))
    const agent = createAgent({
      systemPrompt: 'Use tools when required.',
      model: [fakeModel],
      tools: { searchDocs: {} },
      toolChoice: 'required',
      streamText: streamText as never,
    })

    for await (const _ of agent.send('what docs are available?')) {
      // drain
    }

    expect(streamText).toHaveBeenCalledWith(expect.objectContaining({ toolChoice: 'required' }))
  })

  it('injects configured agent identity and strict grounding into the model system prompt', async () => {
    const streamText = vi.fn((options: Record<string, unknown>) => ({
      fullStream: (async function* () {
        yield { type: 'tool-call', toolCallId: 'tool-1', toolName: 'searchSite', input: { query: 'who are you?' } }
        yield { type: 'tool-result', toolCallId: 'tool-1', toolName: 'searchSite', output: { results: ['site assistant'] } }
        yield { type: 'text-delta', delta: 'I am Product docs assistant.' }
      })(),
      response: Promise.resolve({
        messages: [{ role: 'assistant', content: [{ type: 'text', text: 'I am Product docs assistant.' }] }],
      }),
      options,
    }))
    const agent = createAgent({
      systemPrompt: 'Answer from site evidence.',
      model: [fakeModel],
      tools: { searchSite: {} },
      agentIdentity: {
        name: 'Product docs assistant',
        description: 'Built with Edgekit.',
        modelDisclosure: 'technical',
      },
      grounding: 'strict',
      streamText: streamText as never,
    })

    for await (const _ of agent.send('who are you?')) {
      // drain
    }

    expect(streamText.mock.calls[0][0]).toMatchObject({ toolChoice: 'required' })
    expect(String(streamText.mock.calls[0][0].system)).toContain('You are Product docs assistant')
    expect(String(streamText.mock.calls[0][0].system)).toContain('Strict grounding mode is enabled')
  })

  it('buffers and replaces strict grounded answers that have no evidence', async () => {
    const events = []
    const agent = createAgent({
      systemPrompt: 'Answer from site evidence.',
      model: [fakeModel],
      tools: { searchSite: {} },
      grounding: 'strict',
      agentIdentity: {
        name: 'Site assistant',
        noEvidenceMessage: 'I do not know from this site.',
      },
      streamText: (() => ({
        fullStream: (async function* () {
          yield { type: 'text-delta', delta: 'I am created by the Gemma team.' }
        })(),
        response: Promise.resolve({
          messages: [{ role: 'assistant', content: [{ type: 'text', text: 'I am created by the Gemma team.' }] }],
        }),
      })) as never,
    })

    for await (const event of agent.send('who are you?')) {
      events.push(event)
    }

    expect(events).not.toContainEqual({ type: 'text-delta', text: 'I am created by the Gemma team.' })
    expect(events).toContainEqual({ type: 'text-delta', text: 'I do not know from this site.' })
    expect(events).toContainEqual({ type: 'done', text: 'I do not know from this site.' })
  })

  it('allows configured assistant identity answers in strict grounding mode', async () => {
    const agent = createAgent({
      systemPrompt: 'Answer from configured identity.',
      model: [fakeModel],
      tools: { searchSite: {} },
      grounding: 'strict',
      agentIdentity: {
        name: 'Site assistant',
        noEvidenceMessage: 'I do not know from this site.',
      },
      streamText: (() => ({
        fullStream: (async function* () {
          yield { type: 'text-delta', delta: 'I am the Site assistant built with the Edgekit runtime.' }
        })(),
        response: Promise.resolve({
          messages: [{ role: 'assistant', content: [{ type: 'text', text: 'I am the Site assistant built with the Edgekit runtime.' }] }],
        }),
      })) as never,
    })
    const events = []

    for await (const event of agent.send('who are you?')) {
      events.push(event)
    }

    expect(events).toContainEqual({ type: 'text-delta', text: 'I am the Site assistant built with the Edgekit runtime.' })
    expect(events).toContainEqual({ type: 'done', text: 'I am the Site assistant built with the Edgekit runtime.' })
  })

  it('stores the validated strict response in history instead of the rejected model text', async () => {
    const streamText = vi.fn()
      .mockReturnValueOnce({
        fullStream: (async function* () {
          yield { type: 'text-delta', delta: 'I am created by the Gemma team.' }
        })(),
        response: Promise.resolve({
          messages: [{ role: 'assistant', content: [{ type: 'text', text: 'I am created by the Gemma team.' }] }],
        }),
      })
      .mockReturnValueOnce({
        fullStream: (async function* () {
          yield { type: 'text-delta', delta: 'safe followup' }
        })(),
        response: Promise.resolve({
          messages: [{ role: 'assistant', content: [{ type: 'text', text: 'safe followup' }] }],
        }),
      })
    const agent = createAgent({
      systemPrompt: 'Answer from site evidence.',
      model: [fakeModel],
      tools: { searchSite: {} },
      grounding: 'strict',
      agentIdentity: {
        name: 'Site assistant',
        noEvidenceMessage: 'I do not know from this site.',
      },
      streamText: streamText as never,
    })

    for await (const _ of agent.send('who are you?')) {
      // drain
    }
    for await (const _ of agent.send('can you expand?')) {
      // drain
    }

    const secondCallMessages = JSON.stringify(streamText.mock.calls[1][0].messages)
    expect(secondCallMessages).toContain('I do not know from this site.')
    expect(secondCallMessages).not.toContain('I am created by the Gemma team.')
  })

  it('lets custom validators replace unsupported strict grounded answers after tool evidence', async () => {
    const agent = createAgent({
      systemPrompt: 'Answer from site evidence.',
      model: [fakeModel],
      tools: { searchSite: {} },
      grounding: 'strict',
      validateResponse: ({ text }) => text.includes('unsupported-topic') ? 'I do not know from this site.' : null,
      streamText: (() => ({
        fullStream: (async function* () {
          yield { type: 'tool-call', toolCallId: 'tool-1', toolName: 'searchSite', input: { query: 'unsupported-topic' } }
          yield { type: 'tool-result', toolCallId: 'tool-1', toolName: 'searchSite', output: { results: [{ title: 'Projects', excerpt: 'Docs mention supported product guides.' }] } }
          yield { type: 'text-delta', delta: 'The assistant claims unsupported-topic expertise.' }
        })(),
        response: Promise.resolve({
          messages: [{ role: 'assistant', content: [{ type: 'text', text: 'The assistant claims unsupported-topic expertise.' }] }],
        }),
      })) as never,
    })
    const events = []

    for await (const event of agent.send('does the assistant have unsupported-topic expertise?')) {
      events.push(event)
    }

    expect(events).toContainEqual({ type: 'text-delta', text: 'I do not know from this site.' })
    expect(events).toContainEqual({ type: 'done', text: 'I do not know from this site.' })
  })

  it('treats empty retrieval results as no evidence in strict grounding mode', async () => {
    const agent = createAgent({
      systemPrompt: 'Answer from site evidence.',
      model: [fakeModel],
      tools: { searchSite: {} },
      grounding: 'strict',
      agentIdentity: {
        name: 'Site assistant',
        noEvidenceMessage: 'I do not know from this site.',
      },
      streamText: (() => ({
        fullStream: (async function* () {
          yield { type: 'tool-call', toolCallId: 'tool-1', toolName: 'searchSite', input: { query: 'unsupported affiliation' } }
          yield { type: 'tool-result', toolCallId: 'tool-1', toolName: 'searchSite', output: { query: 'unsupported affiliation', results: [] } }
          yield { type: 'text-delta', delta: 'The assistant asserts an unsupported external affiliation.' }
        })(),
        response: Promise.resolve({
          messages: [{ role: 'assistant', content: [{ type: 'text', text: 'The assistant asserts an unsupported external affiliation.' }] }],
        }),
      })) as never,
    })
    const events = []

    for await (const event of agent.send('is the assistant tied to an unsupported external affiliation?')) {
      events.push(event)
    }

    expect(events).toContainEqual({ type: 'text-delta', text: 'I do not know from this site.' })
    expect(events).toContainEqual({ type: 'done', text: 'I do not know from this site.' })
  })

  it('gives no-model fallback a scoped tool caller with the current session', async () => {
    const execute = vi.fn(async input => ({ ok: true, input }))
    const unavailable = createModelProvider({ id: 'none', label: 'None', resolve: async () => null })
    const agent = createAgent({
      systemPrompt: 'Answer from site evidence.',
      model: [unavailable],
      toolManifests: [{ name: 'searchSite', tool: { execute }, readOnly: true }],
      sessionProvider: () => ({ identity: { id: 'user-1' }, state: { summary: 'home page' } }),
      onNoModel: async ({ input, callTool, session }) => {
        const result = await callTool('searchSite', { query: input })
        return `${session.identity?.id}:${JSON.stringify(result)}`
      },
    })
    const events = []

    for await (const event of agent.send('contact')) {
      events.push(event)
    }

    expect(execute).toHaveBeenCalledWith({ query: 'contact' }, expect.objectContaining({
      identity: { id: 'user-1' },
      state: { summary: 'home page' },
    }))
    expect(events).toContainEqual(expect.objectContaining({
      type: 'no-model',
      message: expect.stringContaining('user-1'),
    }))
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
    })
  })

  it('uses AI SDK tool-call repair for validation-shaped tool failures', async () => {
    const repairError = {
      name: 'AI_TypeValidationError',
      message: 'Invalid tool arguments for searchProducts: size must be a string.',
    }
    const generateText = vi.fn(() => Promise.resolve({
      toolCalls: [{ toolName: 'searchProducts', input: { query: 'Nike Dunk Low', size: '9' } }],
    }))
    const streamText = vi.fn((options: Record<string, unknown>) => ({
      fullStream: (async function* () {
        const repairToolCall = options.experimental_repairToolCall as (input: Record<string, unknown>) => Promise<unknown>
        const repaired = await repairToolCall({
          toolCall: {
            type: 'tool-call',
            toolCallId: 'tool-1',
            toolName: 'searchProducts',
            input: '{"query":"Nike Dunk Low","size":9}',
          },
          tools: options.tools,
          system: options.system,
          messages: options.messages,
          error: repairError,
        })
        yield {
          type: 'tool-call',
          toolCallId: 'tool-1',
          toolName: 'searchProducts',
          input: JSON.parse((repaired as { input: string }).input),
        }
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
      generateText: generateText as never,
      toolRepair: { maxAttempts: 2 },
    })

    const events = []
    for await (const event of agent.send('find size nine dunks')) {
      events.push(event)
    }

    expect(streamText).toHaveBeenCalledTimes(1)
    expect(generateText).toHaveBeenCalledTimes(1)
    expect(events.some(event => event.type === 'error')).toBe(false)
    expect(events).toContainEqual({
      type: 'tool-call',
      toolName: 'searchProducts',
      toolCallId: 'tool-1',
      input: { query: 'Nike Dunk Low', size: '9' },
    })
    expect(events).toContainEqual({ type: 'text-delta', text: 'Found Nike Dunk Low in size 9.' })
    expect(generateText.mock.calls[0][0].messages.at(-1)).toMatchObject({
      role: 'user',
      content: expect.stringContaining('The previous tool call failed validation'),
    })
    expect(events).toContainEqual({
      type: 'activity',
      activity: expect.objectContaining({ label: 'Repairing tool arguments', status: 'started' }),
    })
  })

  it('surfaces a tool validation error when AI SDK repair cannot produce a replacement call', async () => {
    const repairError = {
      name: 'AI_TypeValidationError',
      message: 'Invalid tool arguments.',
    }
    const generateText = vi.fn(() => Promise.resolve({ toolCalls: [] }))
    const streamText = vi.fn((options: Record<string, unknown>) => ({
      fullStream: (async function* () {
        const repairToolCall = options.experimental_repairToolCall as (input: Record<string, unknown>) => Promise<unknown>
        await repairToolCall({
          toolCall: {
            type: 'tool-call',
            toolCallId: 'tool-1',
            toolName: 'searchProducts',
            input: '{"query":1}',
          },
          tools: options.tools,
          system: options.system,
          messages: options.messages,
          error: repairError,
        })
        yield {
          type: 'error',
          error: repairError,
        }
      })(),
      response: Promise.resolve({ messages: [] }),
    }))
    const agent = createAgent({
      systemPrompt: 'You are helpful.',
      model: [fakeModel],
      tools: { searchProducts: {} },
      streamText: streamText as never,
      generateText: generateText as never,
      toolRepair: { maxAttempts: 1 },
    })

    const events = []
    for await (const event of agent.send('find shoes')) {
      events.push(event)
    }

    expect(streamText).toHaveBeenCalledTimes(1)
    expect(generateText).toHaveBeenCalledTimes(1)
    expect(events).toContainEqual({
      type: 'error',
      error: repairError,
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

  it('points root endpoint transport users to the AG-UI sibling package', async () => {
    const agent = createAgUiAgent({ endpoint: '/ag-ui' })

    await expect(async () => {
      for await (const _ of agent.send('hello')) {
        // drain
      }
    }).rejects.toThrow('BREAKING in v0.3.0: endpoint transport was removed')
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
