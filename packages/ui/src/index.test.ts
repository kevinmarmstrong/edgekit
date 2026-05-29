// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AgentEvent } from '@kevinmarmstrong/edgekit'
import { EdgeChat, mountChat } from './index'

function mount() {
  const chat = new EdgeChat()
  document.body.appendChild(chat)
  return chat
}

async function send(chat: EdgeChat, input = 'show an action') {
  await chat.updateComplete
  const field = chat.shadowRoot?.querySelector<HTMLInputElement>('[data-testid="chat-input"]')
  const button = chat.shadowRoot?.querySelector<HTMLButtonElement>('[data-testid="send-button"]')
  expect(field).toBeTruthy()
  expect(button).toBeTruthy()
  field!.value = input
  button!.click()
}

async function clickAction(chat: EdgeChat, index = 0) {
  await waitFor(() => chat.shadowRoot?.querySelector<HTMLButtonElement>('[data-testid="action-run-button"]'))
  const button = chat.shadowRoot?.querySelectorAll<HTMLButtonElement>('[data-testid="action-run-button"]')[index]
  expect(button).toBeTruthy()
  button!.click()
  await new Promise(resolve => setTimeout(resolve, 0))
  await chat.updateComplete
}

async function waitFor<T>(probe: () => T | null | undefined, timeoutMs = 1_000): Promise<T> {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const value = probe()
    if (value) return value
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  throw new Error('Timed out waiting for UI state.')
}

function viewAgent(view: AgentEvent) {
  return {
    async *send() {
      yield view
      yield { type: 'done', text: '' } satisfies AgentEvent
    },
    async *respondToApproval() {
      yield { type: 'done', text: '' } satisfies AgentEvent
    },
    reset() {
      // no-op fake agent for UI form tests
    },
  }
}

describe('edge-chat form actions', () => {
  afterEach(() => {
    document.body.replaceChildren()
    vi.restoreAllMocks()
  })

  it('blocks generated forms when the active tool provider does not expose the tool', async () => {
    const execute = vi.fn()
    const chat = mount()
    chat.configure({
      tools: { deleteAccount: { execute } },
      toolProvider: () => ({}),
    })
    chat.useAgent(viewAgent({
      type: 'view',
      view: {
        type: 'form',
        id: 'unsafe-delete',
        toolName: 'deleteAccount',
        submitLabel: 'Delete account',
        input: { accountId: 'acct-1' },
      },
    }))

    await send(chat)
    await clickAction(chat)

    expect(execute).not.toHaveBeenCalled()
    expect(chat.shadowRoot?.textContent).toContain('deleteAccount is not available for this session')
  })

  it('does not let generated form labels drive toolProvider exposure', async () => {
    const execute = vi.fn()
    const chat = mount()
    chat.configure({
      tools: { deleteAccount: { execute } },
      toolProvider: ({ input }) => input.includes('deleteAccount') ? { deleteAccount: { execute } } : {},
    })
    chat.useAgent(viewAgent({
      type: 'view',
      view: {
        type: 'form',
        id: 'unsafe-delete',
        toolName: 'deleteAccount',
        submitLabel: 'Delete account',
        input: { accountId: 'acct-1' },
      },
    }))

    await send(chat)
    await clickAction(chat)

    expect(execute).not.toHaveBeenCalled()
    expect(chat.shadowRoot?.textContent).toContain('deleteAccount is not available for this session')
  })

  it('allows generated forms to use tools exposed by the originating user prompt', async () => {
    const execute = vi.fn(async input => ({ success: true, input }))
    const chat = mount()
    chat.configure({
      tools: { createTicket: { execute } },
      toolProvider: ({ input }) => input.includes('support ticket') ? { createTicket: { execute } } : {},
    })
    chat.useAgent(viewAgent({
      type: 'view',
      view: {
        type: 'form',
        id: 'create-ticket',
        toolName: 'createTicket',
        submitLabel: 'Create ticket',
        input: { category: 'orders' },
      },
    }))

    await send(chat, 'create a support ticket')
    await clickAction(chat)
    await waitFor(() => execute.mock.calls.length > 0 || chat.shadowRoot?.textContent?.includes('Something went wrong'))

    expect(chat.shadowRoot?.textContent).not.toContain('Something went wrong')
    expect(execute).toHaveBeenCalledWith(
      { category: 'orders' },
      expect.objectContaining({ session: expect.any(Object) }),
    )
  })

  it('fails closed for unsupported generated-form input schemas', async () => {
    const execute = vi.fn()
    const chat = mount()
    chat.configure({
      tools: {
        createTicket: {
          execute,
          inputSchema: {
            type: 'object',
            properties: { category: { type: 'string' } },
          },
        },
      },
    })
    chat.useAgent(viewAgent({
      type: 'view',
      view: {
        type: 'form',
        id: 'create-ticket',
        toolName: 'createTicket',
        submitLabel: 'Create ticket',
        input: { category: 'orders' },
      },
    }))

    await send(chat, 'create a support ticket')
    await clickAction(chat)

    expect(execute).not.toHaveBeenCalled()
    expect(chat.shadowRoot?.textContent).toContain('input schema is not executable')
  })

  it('validates generated forms with AI SDK validate schemas', async () => {
    const execute = vi.fn(async input => ({ success: true, input }))
    const chat = mount()
    chat.configure({
      tools: {
        createTicket: {
          execute,
          inputSchema: {
            validate(input: unknown) {
              return { success: true, value: { ...(input as Record<string, unknown>), normalized: true } }
            },
          },
        },
      },
    })
    chat.useAgent(viewAgent({
      type: 'view',
      view: {
        type: 'form',
        id: 'create-ticket',
        toolName: 'createTicket',
        submitLabel: 'Create ticket',
        input: { category: 'orders' },
      },
    }))

    await send(chat, 'create a support ticket')
    await clickAction(chat)
    await waitFor(() => execute.mock.calls.length > 0)

    expect(execute).toHaveBeenCalledWith(
      { category: 'orders', normalized: true },
      expect.objectContaining({ session: expect.any(Object) }),
    )
  })

  it('rejects AI SDK validate failure wrappers before executing generated forms', async () => {
    const execute = vi.fn()
    const chat = mount()
    chat.configure({
      tools: {
        createTicket: {
          execute,
          inputSchema: {
            validate() {
              return { issues: [{ message: 'category is required' }] }
            },
          },
        },
      },
    })
    chat.useAgent(viewAgent({
      type: 'view',
      view: {
        type: 'form',
        id: 'create-ticket',
        toolName: 'createTicket',
        submitLabel: 'Create ticket',
        input: { category: 'orders' },
      },
    }))

    await send(chat, 'create a support ticket')
    await clickAction(chat)

    expect(execute).not.toHaveBeenCalled()
    expect(chat.shadowRoot?.textContent).toContain('input failed validation')
  })

  it('blocks untrusted generated forms for approval-gated tools', async () => {
    const execute = vi.fn()
    const chat = mount()
    chat.configure({
      tools: {
        deleteAccount: {
          execute,
          needsApproval: true,
        },
      },
    })
    chat.useAgent(viewAgent({
      type: 'view',
      view: {
        type: 'form',
        id: 'unsafe-delete',
        toolName: 'deleteAccount',
        submitLabel: 'Delete account',
        input: { accountId: 'acct-1' },
      },
    }))

    await send(chat)
    await clickAction(chat)

    expect(execute).not.toHaveBeenCalled()
    expect(chat.shadowRoot?.textContent).toContain('requires approval')
  })

  it('evaluates function-valued approval gates before generated form execution', async () => {
    const execute = vi.fn()
    const chat = mount()
    chat.configure({
      tools: {
        transferFunds: {
          execute,
          needsApproval: ({ amount }: { amount?: number }) => Number(amount) > 1000,
        },
      },
    })
    chat.useAgent(viewAgent({
      type: 'view',
      view: {
        type: 'form',
        id: 'unsafe-transfer',
        toolName: 'transferFunds',
        submitLabel: 'Transfer funds',
        input: { amount: 2500 },
      },
    }))

    await send(chat)
    await clickAction(chat)

    expect(execute).not.toHaveBeenCalled()
    expect(chat.shadowRoot?.textContent).toContain('requires approval')
  })

  it('allows generated forms when AI SDK approval predicates return false for safe input', async () => {
    const execute = vi.fn(async input => ({ ok: true, input }))
    const chat = mount()
    chat.configure({
      tools: {
        transferFunds: {
          execute,
          needsApproval: ({ amount }: { amount?: number }) => Number(amount) > 1000,
        },
      },
    })
    chat.useAgent(viewAgent({
      type: 'view',
      view: {
        type: 'form',
        id: 'safe-transfer',
        toolName: 'transferFunds',
        submitLabel: 'Transfer funds',
        input: { amount: 10 },
      },
    }))

    await send(chat)
    await clickAction(chat)
    await waitFor(() => execute.mock.calls.length > 0)

    expect(execute).toHaveBeenCalledWith(
      { amount: 10 },
      expect.objectContaining({ session: expect.any(Object) }),
    )
    expect(chat.shadowRoot?.textContent).toContain('Transfer funds complete')
  })

  it('treats generated forms with direct-input approval predicates as approval-sensitive', async () => {
    const execute = vi.fn()
    const chat = mount()
    chat.configure({
      tools: {
        transferFunds: {
          execute,
          needsApproval: (args: Record<string, unknown>) => Number(args.amount) > 1000,
        },
      },
    })
    chat.useAgent(viewAgent({
      type: 'view',
      view: {
        type: 'form',
        id: 'unsafe-transfer',
        toolName: 'transferFunds',
        submitLabel: 'Transfer funds',
        input: { amount: 2500 },
      },
    }))

    await send(chat)
    await clickAction(chat)

    expect(execute).not.toHaveBeenCalled()
    expect(chat.shadowRoot?.textContent).toContain('requires approval')
  })

  it('treats generated forms with destructured direct-input approval predicates as approval-sensitive', async () => {
    const execute = vi.fn()
    const chat = mount()
    chat.configure({
      tools: {
        transferFunds: {
          execute,
          needsApproval: ({ amount }: { amount?: number }) => Number(amount) > 1000,
        },
      },
    })
    chat.useAgent(viewAgent({
      type: 'view',
      view: {
        type: 'form',
        id: 'unsafe-transfer',
        toolName: 'transferFunds',
        submitLabel: 'Transfer funds',
        input: { amount: 2500 },
      },
    }))

    await send(chat)
    await clickAction(chat)

    expect(execute).not.toHaveBeenCalled()
    expect(chat.shadowRoot?.textContent).toContain('requires approval')
  })

  it('treats generated forms with direct-input args-field predicates as approval-sensitive', async () => {
    const execute = vi.fn()
    const chat = mount()
    chat.configure({
      tools: {
        transferFunds: {
          execute,
          needsApproval: (input: Record<string, unknown>) =>
            Number((input.args as Record<string, unknown> | undefined)?.amount) > 1000,
        },
      },
    })
    chat.useAgent(viewAgent({
      type: 'view',
      view: {
        type: 'form',
        id: 'unsafe-transfer',
        toolName: 'transferFunds',
        submitLabel: 'Transfer funds',
        input: { args: { amount: 2500 } },
      },
    }))

    await send(chat)
    await clickAction(chat)

    expect(execute).not.toHaveBeenCalled()
    expect(chat.shadowRoot?.textContent).toContain('requires approval')
  })

  it('allows trusted host action forms to execute approval-gated tools after user click', async () => {
    const execute = vi.fn(async input => ({ success: true, input }))
    const chat = mount()
    chat.configure({
      tools: {
        addToCart: {
          execute,
          needsApproval: true,
          inputSchema: {
            safeParse(input: unknown) {
              return { success: true, data: input }
            },
          },
        },
      },
    })
    chat.registerActions(() => [{
      id: 'add-dunk',
      label: 'Add Nike Dunk Low to cart',
      toolName: 'addToCart',
      input: { productId: 'nike-dunk-low', quantity: 1, size: '11' },
      successMessage: 'Added Nike Dunk Low to your cart',
    }])
    chat.useAgent(viewAgent({
      type: 'tool-result',
      toolCallId: 'tool-1',
      toolName: 'searchProducts',
      output: { products: [{ id: 'nike-dunk-low' }] },
    }))

    await send(chat)
    await clickAction(chat)

    expect(execute).toHaveBeenCalledWith(
      { productId: 'nike-dunk-low', quantity: 1, size: '11' },
      expect.objectContaining({ session: expect.any(Object) }),
    )
    expect(chat.shadowRoot?.textContent).toContain('Added Nike Dunk Low to your cart')
  })

  it('does not trust generated forms that reuse a host action id', async () => {
    const execute = vi.fn()
    const chat = mount()
    chat.configure({
      tools: {
        deleteAccount: {
          execute,
          needsApproval: true,
        },
      },
    })
    chat.registerActions(() => [{
      id: 'shared-action',
      label: 'Delete safe account',
      toolName: 'deleteAccount',
      input: { accountId: 'safe-account' },
    }])
    chat.useAgent({
      async *send() {
        yield {
          type: 'tool-result',
          toolCallId: 'tool-1',
          toolName: 'searchAccounts',
          output: { accounts: [{ id: 'safe-account' }] },
        } satisfies AgentEvent
        yield {
          type: 'view',
          view: {
            type: 'form',
            id: 'shared-action',
            toolName: 'deleteAccount',
            submitLabel: 'Delete attacker account',
            input: { accountId: 'attacker-account' },
          },
        } satisfies AgentEvent
        yield { type: 'done', text: '' } satisfies AgentEvent
      },
      async *respondToApproval() {
        yield { type: 'done', text: '' } satisfies AgentEvent
      },
      reset() {
        // no-op fake agent for UI form tests
      },
    })

    await send(chat)
    await waitFor(() => chat.shadowRoot?.querySelectorAll('[data-testid="action-run-button"]').length === 2)
    await clickAction(chat, 1)

    expect(execute).not.toHaveBeenCalled()
    expect(chat.shadowRoot?.textContent).toContain('requires approval')
  })

  it('scopes trusted form field reads to the clicked form instance', async () => {
    const execute = vi.fn(async input => ({ success: true, input }))
    const chat = mount()
    chat.configure({
      tools: {
        transferFunds: {
          execute,
          needsApproval: true,
          inputSchema: {
            safeParse(input: unknown) {
              return { success: true, data: input }
            },
          },
        },
      },
    })
    chat.registerActions(() => [{
      id: 'shared-transfer',
      label: 'Transfer approved amount',
      toolName: 'transferFunds',
      input: { accountId: 'safe-account' },
      fields: [{ name: 'amount', label: 'Amount', type: 'number', value: 100 }],
    }])
    chat.useAgent({
      async *send() {
        yield {
          type: 'view',
          view: {
            type: 'form',
            id: 'shared-transfer',
            toolName: 'transferFunds',
            submitLabel: 'Transfer attacker amount',
            input: { accountId: 'attacker-account' },
            fields: [{ name: 'amount', label: 'Amount', type: 'number', value: 9999 }],
          },
        } satisfies AgentEvent
        yield {
          type: 'tool-result',
          toolCallId: 'tool-1',
          toolName: 'lookupAccount',
          output: { accountId: 'safe-account' },
        } satisfies AgentEvent
        yield { type: 'done', text: '' } satisfies AgentEvent
      },
      async *respondToApproval() {
        yield { type: 'done', text: '' } satisfies AgentEvent
      },
      reset() {
        // no-op fake agent for UI form tests
      },
    })

    await send(chat, 'transfer approved amount')
    await waitFor(() => chat.shadowRoot?.querySelectorAll('[data-testid="action-run-button"]').length === 2)
    await clickAction(chat, 1)
    await waitFor(() => execute.mock.calls.length > 0)

    expect(execute).toHaveBeenCalledWith(
      { accountId: 'safe-account', amount: 100 },
      expect.objectContaining({ session: expect.any(Object) }),
    )
  })

  it('passes AI SDK-style input and options to function-valued approval gates', async () => {
    const approval = vi.fn((input: Record<string, unknown>, options?: Record<string, unknown>) => Number(input.amount) > 1000)
    const execute = vi.fn(async input => ({ success: true, input }))
    const chat = mount()
    function needsApproval(input: Record<string, unknown>, options?: Record<string, unknown>) {
      approval(input, options)
      return Number(input.amount) > 1000
    }
    chat.configure({
      tools: {
        transferFunds: {
          execute,
          needsApproval,
        },
      },
    })
    chat.registerActions(() => [{
      id: 'transfer',
      label: 'Transfer funds',
      toolName: 'transferFunds',
      input: { amount: 2500 },
    }])
    chat.useAgent(viewAgent({
      type: 'tool-result',
      toolCallId: 'tool-1',
      toolName: 'lookupAccount',
      output: { accountId: 'safe-account' },
    }))

    await send(chat, 'transfer funds')
    await clickAction(chat)
    await waitFor(() => approval.mock.calls.length > 0)

    expect(approval.mock.calls[0][0]).toEqual({ amount: 2500 })
    expect(approval.mock.calls[0][1]).toMatchObject({
      toolCallId: expect.any(String),
      messages: [],
      experimental_context: expect.objectContaining({ session: expect.any(Object) }),
    })
    expect(execute).toHaveBeenCalled()
  })

  it('treats generated forms with throwing approval predicates as approval-sensitive', async () => {
    const execute = vi.fn()
    const chat = mount()
    chat.configure({
      tools: {
        transferFunds: {
          execute,
          needsApproval: () => {
            throw new Error('approval predicate failed')
          },
        },
      },
    })
    chat.useAgent(viewAgent({
      type: 'view',
      view: {
        type: 'form',
        id: 'transfer',
        toolName: 'transferFunds',
        submitLabel: 'Transfer funds',
        input: { amount: 10 },
      },
    }))

    await send(chat, 'transfer funds')
    await clickAction(chat)

    expect(execute).not.toHaveBeenCalled()
    expect(chat.shadowRoot?.textContent).toContain('requires approval')
  })

  it('exposes header labels, status text, and styling parts for host theming', async () => {
    const chat = mount()
    chat.agentTitle = 'Ask me anything'
    chat.agentSubtitle = 'About this site'
    chat.statusText = ''

    await chat.updateComplete

    expect(chat.shadowRoot?.querySelector('[part~="title"]')?.textContent).toContain('Ask me anything')
    expect(chat.shadowRoot?.querySelector('[part~="subtitle"]')?.textContent).toContain('About this site')
    expect(chat.shadowRoot?.querySelector('[data-testid="agent-status"]')).toBeNull()
    expect(chat.shadowRoot?.querySelector('[part~="send-button"]')).toBeTruthy()
    expect(chat.shadowRoot?.querySelector('[part~="messages"]')).toBeTruthy()
  })

  it('mountChat applies profile, tools, labels, and fallback config in one call', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const searchSite = { execute: vi.fn(async () => ({ results: [{ title: 'Contact' }] })), readOnly: true }
    const chat = mountChat(host, {
      missionProfile: {
        id: 'site-qa-v1',
        mission: 'site-qa',
        version: '1.0.0',
        systemPrompt: 'Answer from site content.',
        requiredTools: ['searchSite'],
      },
      tools: { searchSite },
      placeholder: 'Ask about this site',
      readyMessage: 'Ready for site Q&A.',
      agentTitle: 'Ask me anything',
      agentSubtitle: 'About the site',
      statusText: '',
      downloadPolicy: 'never',
      agentIdentity: { name: 'Site assistant' },
      grounding: 'strict',
      onNoModel: async ({ input, callTool }) => {
        await callTool('searchSite', { query: input })
        return `Basic answer: ${input}`
      },
    })

    await chat.updateComplete

    expect(host.querySelector('edge-chat')).toBe(chat)
    expect(chat.shadowRoot?.textContent).toContain('Ask me anything')
    expect(chat.shadowRoot?.textContent).toContain('About the site')
    expect(chat.shadowRoot?.textContent).toContain('Ready for site Q&A.')
    await send(chat, 'contact')
    await waitFor(() => chat.shadowRoot?.textContent?.includes('Basic answer: contact'))
  })

  it('mountChat passes runtime identity and grounding separately from UI labels', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const searchSite = { execute: vi.fn() }
    const chat = mountChat(host, {
      missionProfile: {
        id: 'site-qa-v1',
        mission: 'site-qa',
        version: '1.0.0',
        systemPrompt: 'Answer from site content.',
        requiredTools: ['searchSite'],
        agentIdentity: { name: 'Runtime assistant' },
        grounding: 'strict',
      },
      tools: { searchSite },
      agentTitle: 'Visible title',
      downloadPolicy: 'never',
      onNoModel: ({ message }) => message,
    })

    await chat.updateComplete

    expect(chat.shadowRoot?.textContent).toContain('Visible title')
    expect(chat.validateMissionProfile({
      id: 'site-qa-v1',
      mission: 'site-qa',
      version: '1.0.0',
      systemPrompt: 'Answer from site content.',
      requiredTools: ['searchSite'],
      agentIdentity: { name: 'Runtime assistant' },
      grounding: 'strict',
    }).ok).toBe(true)
  })

  it('mountChat composes profile tools with separately registered tools', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const profileTool = { execute: vi.fn(async () => ({ value: 'profile' })), readOnly: true }
    const registeredTool = { execute: vi.fn(async () => ({ value: 'registered' })), readOnly: true }
    const chat = mountChat(host, {
      missionProfile: {
        id: 'site-qa-v1',
        mission: 'site-qa',
        version: '1.0.0',
        systemPrompt: 'Answer from site content.',
        requiredTools: ['searchSite'],
        tools: { searchSite: profileTool },
        agentIdentity: { name: 'Runtime assistant' },
        grounding: 'strict',
      },
      tools: { listDemos: registeredTool },
      downloadPolicy: 'never',
      onNoModel: async ({ callTool }) => {
        const search = await callTool('searchSite', { query: 'edgekit' }) as { value: string }
        const demos = await callTool('listDemos', {}) as { value: string }
        return `${search.value} ${demos.value}`
      },
    })

    await chat.updateComplete
    await send(chat, 'edgekit demos')
    await waitFor(() => chat.shadowRoot?.textContent?.includes('profile registered'))

    expect(profileTool.execute).toHaveBeenCalled()
    expect(registeredTool.execute).toHaveBeenCalled()
  })
})
