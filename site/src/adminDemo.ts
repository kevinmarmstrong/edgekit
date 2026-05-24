import { chromeAI, createModelProvider, tool } from '@kevinmarmstrong/edgekit'
import type { LanguageModelV3 } from '@kevinmarmstrong/edgekit'
import type { EdgeChat } from '@kevinmarmstrong/edgekit-ui'
import { z } from 'zod'

type Account = {
  id: string
  name: string
  owner: string
  plan: 'Starter' | 'Pro' | 'Enterprise'
  seats: number
  status: 'Active' | 'At risk' | 'Suspended'
}

const accounts: Account[] = [
  {
    id: 'northwind',
    name: 'Northwind Labs',
    owner: 'Maya Chen',
    plan: 'Pro',
    seats: 48,
    status: 'Active',
  },
  {
    id: 'globex',
    name: 'Globex Retail',
    owner: 'Iris Patel',
    plan: 'Enterprise',
    seats: 132,
    status: 'At risk',
  },
  {
    id: 'acme',
    name: 'Acme Field Ops',
    owner: 'Ramon Ortiz',
    plan: 'Starter',
    seats: 18,
    status: 'Active',
  },
]

const activity: string[] = ['No workflow actions yet']

export function mountAdminDemo() {
  const chat = document.querySelector<EdgeChat>('edge-chat#admin-chat')
  const scriptedMode = new URLSearchParams(window.location.search).get('adminAgentMode') === 'scripted'

  renderAccounts()
  renderActivity()

  chat?.configure(
    scriptedMode
      ? {
          model: [scriptedAdminProvider()],
          streamText: createScriptedAdminStream() as never,
        }
      : {
          model: [chromeAI()],
          downloadPolicy: 'never',
          onNoModel: ({ input }) => answerFromAccounts(input),
        },
  )
  chat?.registerTools({ searchAccounts, updatePlan, suspendAccount })
}

const searchAccounts = tool({
  description: 'Search customer accounts by name, owner, plan, or status.',
  inputSchema: z.object({
    query: z.string().describe('Account, owner, plan, or status search terms'),
  }),
  execute: async ({ query }) => {
    const normalized = query.toLowerCase()
    const results = accounts.filter(account => {
      return [
        account.name,
        account.owner,
        account.plan,
        account.status,
      ].some(value => value.toLowerCase().includes(normalized))
    })
    return { results, total: results.length }
  },
})

const updatePlan = tool({
  description: 'Change a customer account plan after approval.',
  inputSchema: z.object({
    accountId: z.string().describe('Account id to update'),
    plan: z.enum(['Starter', 'Pro', 'Enterprise']).describe('New account plan'),
  }),
  execute: async ({ accountId, plan }) => {
    const account = accounts.find(candidate => candidate.id === accountId)
    if (!account) return { success: false, error: 'Account not found' }
    account.plan = plan
    pushActivity(`Updated ${account.name} to ${plan}`)
    renderAccounts()
    renderActivity()
    return { success: true, account: account.name, plan }
  },
  needsApproval: true,
})

const suspendAccount = tool({
  description: 'Suspend a customer account after approval.',
  inputSchema: z.object({
    accountId: z.string().describe('Account id to suspend'),
    reason: z.string().describe('Reason for suspension'),
  }),
  execute: async ({ accountId, reason }) => {
    const account = accounts.find(candidate => candidate.id === accountId)
    if (!account) return { success: false, error: 'Account not found' }
    account.status = 'Suspended'
    pushActivity(`Suspended ${account.name}: ${reason}`)
    renderAccounts()
    renderActivity()
    return { success: true, account: account.name, reason }
  },
  needsApproval: true,
})

function renderAccounts() {
  const list = document.querySelector<HTMLElement>('#admin-accounts')
  if (!list) return

  list.innerHTML = accounts
    .map(
      account => `
        <article class="account-row" data-testid="account-row" data-account-id="${account.id}">
          <div>
            <h3>${account.name}</h3>
            <p>${account.owner}</p>
          </div>
          <dl>
            <div><dt>Plan</dt><dd data-testid="plan-${account.id}">${account.plan}</dd></div>
            <div><dt>Seats</dt><dd>${account.seats}</dd></div>
            <div><dt>Status</dt><dd data-testid="status-${account.id}">${account.status}</dd></div>
          </dl>
        </article>
      `,
    )
    .join('')
}

function renderActivity() {
  const log = document.querySelector<HTMLElement>('#admin-activity')
  if (!log) return
  log.innerHTML = activity.map(item => `<li>${item}</li>`).join('')
}

function answerFromAccounts(input: string) {
  const normalized = input.toLowerCase()
  const results = accounts.filter(account => {
    const wantsNorthwind = normalized.includes('northwind')
    const wantsGlobex = normalized.includes('globex')
    if (wantsNorthwind) return account.id === 'northwind'
    if (wantsGlobex) return account.id === 'globex'
    return normalized.includes('account') || normalized.includes(account.plan.toLowerCase())
  })

  if (results.length === 0) {
    return 'Local browser AI is unavailable here, and basic account mode did not find matching accounts.'
  }

  return [
    'Local browser AI is unavailable here, so edgekit answered through basic account mode.',
    '',
    ...results.map(account => `${account.name} - ${account.plan} - ${account.status}`),
    '',
    'Enable Chrome AI for guarded account updates and suspension workflows.',
  ].join('\n')
}

function scriptedAdminProvider() {
  const scriptedModel = {
    provider: 'scripted-admin',
    modelId: 'admin-workflow',
    specificationVersion: 'v3',
  } as LanguageModelV3

  return createModelProvider({
    id: 'scripted-admin',
    label: 'Scripted admin agent',
    resolve: async () => scriptedModel,
  })
}

function createScriptedAdminStream() {
  return (options: { messages?: unknown[]; tools?: Record<string, unknown> }) => {
    const messages = options.messages ?? []
    const approval = findLatestApprovalResponse(messages)
    const request = parseAdminRequest(latestUserInput(messages))

    if (approval) {
      if (!approval.approved) return rejectedAdminStream(request)
      return approvedAdminStream(options.tools ?? {}, request, approval.toolCall)
    }

    return initialAdminStream(options.tools ?? {}, request)
  }
}

function initialAdminStream(tools: Record<string, unknown>, request: AdminRequest) {
  return {
    fullStream: (async function* () {
      const searchInput = { query: request.accountId }
      yield { type: 'tool-call', toolCallId: 'tool-search-accounts', toolName: 'searchAccounts', input: searchInput }
      const output = await executeTool(tools.searchAccounts, searchInput)
      yield { type: 'tool-result', toolCallId: 'tool-search-accounts', toolName: 'searchAccounts', output }
      yield {
        type: 'text-delta',
        delta: `${request.accountName} is ready for review. Approval is required before ${request.actionLabel}.`,
      }
      yield {
        type: 'tool-approval-request',
        approvalId: `approval-${request.action}`,
        toolCall: approvalToolCall(request),
      }
    })(),
    response: Promise.resolve({
      messages: [
        {
          role: 'assistant',
          content: [
            { type: 'text', text: `${request.accountName} is ready for review.` },
            { type: 'tool-approval-request', approvalId: `approval-${request.action}`, toolCall: approvalToolCall(request) },
          ],
        },
      ],
    }),
  }
}

function approvedAdminStream(tools: Record<string, unknown>, request: AdminRequest, approvedToolCall: ApprovalToolCall | null) {
  const toolCall = approvedToolCall ?? approvalToolCall(request)
  return {
    fullStream: (async function* () {
      yield toolCall
      const output = await executeTool(tools[toolCall.toolName], toolCall.input)
      yield { type: 'tool-result', toolCallId: toolCall.toolCallId, toolName: toolCall.toolName, output }
      const successText = formatAdminSuccess(toolCall, output, request)
      yield {
        type: 'text-delta',
        delta: successText,
      }
    })(),
    response: Promise.resolve({
      messages: [
        {
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: formatAdminSuccess(toolCall, undefined, request),
            },
          ],
        },
      ],
    }),
  }
}

function formatAdminSuccess(toolCall: ApprovalToolCall, output: unknown, request: AdminRequest) {
  const outputRecord = isRecord(output) ? output : undefined
  const account = typeof outputRecord?.account === 'string' ? outputRecord.account : request.accountName
  if (toolCall.toolName === 'updatePlan') {
    const plan = typeof outputRecord?.plan === 'string'
      ? outputRecord.plan
      : typeof toolCall.input.plan === 'string'
        ? toolCall.input.plan
        : 'the requested plan'
    return `Updated ${account} to ${plan}.`
  }
  if (toolCall.toolName === 'suspendAccount') return `Suspended ${account}.`
  return `Completed ${toolCall.toolName}.`
}

function rejectedAdminStream(request: AdminRequest) {
  return {
    fullStream: (async function* () {
      yield {
        type: 'text-delta',
        delta: `I did not ${request.action === 'update-plan' ? 'update' : 'suspend'} ${request.accountName}.`,
      }
    })(),
    response: Promise.resolve({
      messages: [
        {
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: `I did not ${request.action === 'update-plan' ? 'update' : 'suspend'} ${request.accountName}.`,
            },
          ],
        },
      ],
    }),
  }
}

type AdminRequest = {
  action: 'update-plan' | 'suspend'
  accountId: 'northwind' | 'globex'
  accountName: string
  actionLabel: string
}

function parseAdminRequest(input: string): AdminRequest {
  const normalized = input.toLowerCase()
  const isGlobex = normalized.includes('globex')
  const action = normalized.includes('suspend') ? 'suspend' : 'update-plan'
  return {
    action,
    accountId: isGlobex ? 'globex' : 'northwind',
    accountName: isGlobex ? 'Globex Retail' : 'Northwind Labs',
    actionLabel: action === 'suspend' ? 'suspending the account' : 'changing the plan',
  }
}

function approvalToolCall(request: AdminRequest) {
  if (request.action === 'suspend') {
    return {
      type: 'tool-call',
      toolCallId: 'tool-suspend-account',
      toolName: 'suspendAccount',
      input: { accountId: request.accountId, reason: 'Requested by admin workflow' },
    }
  }

  return {
    type: 'tool-call',
    toolCallId: 'tool-update-plan',
    toolName: 'updatePlan',
    input: { accountId: request.accountId, plan: 'Enterprise' },
  }
}

type ApprovalToolCall = {
  type?: string
  toolCallId: string
  toolName: string
  input: Record<string, unknown>
}

function latestUserInput(messages: unknown[]) {
  const userMessage = [...messages]
    .reverse()
    .find((message): message is { role: string; content: unknown } => isRecord(message) && message.role === 'user')
  return typeof userMessage?.content === 'string' ? userMessage.content : ''
}

function findLatestApprovalResponse(messages: unknown[]) {
  const toolMessage = [...messages]
    .reverse()
    .find((message): message is { role: string; content: unknown } => isRecord(message) && message.role === 'tool')
  const content = Array.isArray(toolMessage?.content) ? toolMessage.content : []
  const approval = content.find(
    (part): part is { approved: boolean; toolCall?: unknown } =>
      isRecord(part) && part.type === 'tool-approval-response' && typeof part.approved === 'boolean',
  )
  return approval ? { ...approval, toolCall: normalizeToolCall(approval.toolCall) } : undefined
}

function normalizeToolCall(value: unknown): ApprovalToolCall | null {
  if (!isRecord(value)) return null
  if (typeof value.toolCallId !== 'string') return null
  if (typeof value.toolName !== 'string') return null
  if (!isRecord(value.input)) return null
  return {
    type: typeof value.type === 'string' ? value.type : undefined,
    toolCallId: value.toolCallId,
    toolName: value.toolName,
    input: value.input,
  }
}

async function executeTool(toolDefinition: unknown, input: Record<string, unknown>) {
  const candidate = toolDefinition as { execute?: (input: Record<string, unknown>) => unknown | Promise<unknown> }
  if (!candidate.execute) return { error: 'Tool is not executable.' }
  return candidate.execute(input)
}

function pushActivity(item: string) {
  if (activity.length === 1 && activity[0] === 'No workflow actions yet') activity.length = 0
  activity.unshift(item)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
