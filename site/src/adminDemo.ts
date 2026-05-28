import { chromeAI, createModelProvider, tool } from '@kevinmarmstrong/edgekit'
import type { LanguageModelV3 } from '@kevinmarmstrong/edgekit'
import type { EdgeChat } from '@kevinmarmstrong/edgekit-ui'
import { z } from 'zod'
import { adminWorkflowProfile } from './profiles/admin-workflow'

type Account = {
  id: string
  name: string
  owner: string
  plan: 'Starter' | 'Pro' | 'Enterprise'
  seats: number
  status: 'Active' | 'At risk' | 'Suspended'
}

type AdminRole = 'admin' | 'billing' | 'support'

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
const adminMetrics = {
  approvalsRequested: 0,
  approvalsApproved: 0,
  approvalsRejected: 0,
}
const roleCapabilities: Record<AdminRole, string[]> = {
  admin: ['searchAccounts', 'updatePlan', 'suspendAccount'],
  billing: ['searchAccounts', 'updatePlan'],
  support: ['searchAccounts'],
}

export function mountAdminDemo() {
  const chat = document.querySelector<EdgeChat>('edge-chat#admin-chat')
  const scriptedMode = new URLSearchParams(window.location.search).get('adminAgentMode') === 'scripted'

  renderAdminState()
  document.querySelector<HTMLSelectElement>('#admin-role')?.addEventListener('change', () => {
    pushActivity(`Role changed to ${roleLabel(currentAdminRole())}`)
    renderAdminState()
  })

  chat?.configure(
    scriptedMode
      ? {
          model: [scriptedAdminProvider()],
          streamText: createScriptedAdminStream() as never,
        }
      : {
          model: [chromeAI()],
          downloadPolicy: 'never',
          toolChoice: 'required',
          toolProvider: ({ input }) => adminToolsForInput(input),
          telemetry: trackAdminTelemetry,
          onNoModel: ({ input }) => answerFromAccounts(input),
      },
  )
  chat?.applyMissionProfile(adminWorkflowProfile)
  chat?.registerTools({ searchAccounts, updatePlan, suspendAccount })
}

function adminToolsForInput(input: string) {
  const role = currentAdminRole()
  if (/\b(suspend|disable|block)\b/i.test(input)) return roleFilterTools({ searchAccounts, suspendAccount }, role)
  if (/\b(upgrade|downgrade|change|move|set|plan|enterprise|pro|starter)\b/i.test(input)) {
    return roleFilterTools({ searchAccounts, updatePlan }, role)
  }
  return roleFilterTools({ searchAccounts }, role)
}

function roleFilterTools<T extends Record<string, unknown>>(tools: T, role: AdminRole) {
  return Object.fromEntries(
    Object.entries(tools).filter(([toolName]) => canRoleUseTool(role, toolName)),
  ) as Partial<T>
}

function trackAdminTelemetry(event: { name?: string; approved?: boolean }) {
  if (event.name === 'approval-request') adminMetrics.approvalsRequested += 1
  if (event.name === 'approval-decision') {
    event.approved ? adminMetrics.approvalsApproved += 1 : adminMetrics.approvalsRejected += 1
  }
  if (event.name === 'approval-request' || event.name === 'approval-decision') renderAdminState()
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
    const role = currentAdminRole()
    if (!canRoleUseTool(role, 'updatePlan')) return blockedRoleResult(role, 'updatePlan')
    const account = accounts.find(candidate => candidate.id === accountId)
    if (!account) return { success: false, error: 'Account not found' }
    account.plan = plan
    pushActivity(`Updated ${account.name} to ${plan}`)
    renderAdminState()
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
    const role = currentAdminRole()
    if (!canRoleUseTool(role, 'suspendAccount')) return blockedRoleResult(role, 'suspendAccount')
    const account = accounts.find(candidate => candidate.id === accountId)
    if (!account) return { success: false, error: 'Account not found' }
    account.status = 'Suspended'
    pushActivity(`Suspended ${account.name}: ${reason}`)
    renderAdminState()
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

function renderAdminState() {
  renderAccounts()
  renderActivity()
  renderAdminSummary()
}

function renderAdminSummary() {
  const role = currentAdminRole()
  const visibleTools = roleCapabilities[role]
  setText('admin-role-state', roleLabel(role))
  setText('admin-role-detail', roleDetail(role))
  setText('admin-visible-tools', `${visibleTools.length} tool${visibleTools.length === 1 ? '' : 's'}`)
  setText('admin-tool-detail', visibleTools.join(', '))
  setText('admin-approval-count', `${adminMetrics.approvalsRequested} requested`)
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
  const toolCall = approvalToolCall(request)
  const role = currentAdminRole()
  const blockedText = canRoleUseTool(role, toolCall.toolName) ? '' : formatBlockedRoleText(role, toolCall.toolName)

  return {
    fullStream: (async function* () {
      const searchInput = { query: request.accountId }
      yield { type: 'tool-call', toolCallId: 'tool-search-accounts', toolName: 'searchAccounts', input: searchInput }
      const output = await executeTool(tools.searchAccounts, searchInput)
      yield { type: 'tool-result', toolCallId: 'tool-search-accounts', toolName: 'searchAccounts', output }
      if (blockedText) {
        pushActivity(`Blocked ${toolCall.toolName}; ${roleLabel(role)} role is not authorized for this tool`)
        renderAdminState()
        yield { type: 'text-delta', delta: blockedText }
        return
      }
      yield {
        type: 'text-delta',
        delta: `${request.accountName} is ready for review. Approval is required before ${request.actionLabel}.`,
      }
      adminMetrics.approvalsRequested += 1
      renderAdminState()
      yield {
        type: 'tool-approval-request',
        approvalId: `approval-${request.action}`,
        toolCall,
      }
    })(),
    response: Promise.resolve({
      messages: [
        {
          role: 'assistant',
          content: blockedText
            ? [{ type: 'text', text: blockedText }]
            : [
                { type: 'text', text: `${request.accountName} is ready for review.` },
                { type: 'tool-approval-request', approvalId: `approval-${request.action}`, toolCall },
              ],
        },
      ],
    }),
  }
}

function approvedAdminStream(tools: Record<string, unknown>, request: AdminRequest, approvedToolCall: ApprovalToolCall | null) {
  const toolCall = approvedToolCall ?? approvalToolCall(request)
  const role = currentAdminRole()
  const blockedText = canRoleUseTool(role, toolCall.toolName) ? '' : formatBlockedRoleText(role, toolCall.toolName)

  if (blockedText) {
    return {
      fullStream: (async function* () {
        pushActivity(`Blocked ${toolCall.toolName}; ${roleLabel(role)} role is not authorized for this tool`)
        renderAdminState()
        yield { type: 'text-delta', delta: blockedText }
      })(),
      response: Promise.resolve({
        messages: [
          {
            role: 'assistant',
            content: [{ type: 'text', text: blockedText }],
          },
        ],
      }),
    }
  }

  return {
    fullStream: (async function* () {
      adminMetrics.approvalsApproved += 1
      renderAdminState()
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

function formatBlockedRoleText(role: AdminRole, toolName: string) {
  return `I did not run ${toolName}. ${roleLabel(role)} does not have that account-management capability.`
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
      adminMetrics.approvalsRejected += 1
      renderAdminState()
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
  const action = /\b(suspend|suspension|disable|deactivate)\b/.test(normalized) ? 'suspend' : 'update-plan'
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
    (part): part is { approvalId?: string; approved: boolean; toolCall?: unknown } =>
      isRecord(part) && part.type === 'tool-approval-response' && typeof part.approved === 'boolean',
  )
  if (!approval) return undefined

  return {
    ...approval,
    toolCall: normalizeToolCall(approval.toolCall) ?? findApprovalRequestToolCall(messages, approval.approvalId),
  }
}

function findApprovalRequestToolCall(messages: unknown[], approvalId: unknown): ApprovalToolCall | null {
  if (typeof approvalId !== 'string') return null
  for (const message of [...messages].reverse()) {
    if (!isRecord(message) || message.role !== 'assistant' || !Array.isArray(message.content)) continue
    const request = message.content.find(part => isRecord(part) && part.type === 'tool-approval-request' && part.approvalId === approvalId)
    if (isRecord(request)) return normalizeToolCall(request.toolCall)
  }
  return null
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

function currentAdminRole(): AdminRole {
  const value = document.querySelector<HTMLSelectElement>('#admin-role')?.value
  return value === 'billing' || value === 'support' ? value : 'admin'
}

function canRoleUseTool(role: AdminRole, toolName: string) {
  return roleCapabilities[role].includes(toolName)
}

function blockedRoleResult(role: AdminRole, toolName: string) {
  pushActivity(`Blocked ${toolName}; ${roleLabel(role)} role is not authorized for this tool`)
  renderAdminState()
  return {
    success: false,
    blocked: true,
    error: `${roleLabel(role)} does not have permission to run ${toolName}`,
    role,
    toolName,
  }
}

function roleLabel(role: AdminRole) {
  if (role === 'billing') return 'Billing manager'
  if (role === 'support') return 'Support viewer'
  return 'Admin'
}

function roleDetail(role: AdminRole) {
  if (role === 'billing') return 'Can search accounts and update plans with approval; suspension tools are hidden.'
  if (role === 'support') return 'Can search account context only; all mutation tools are hidden.'
  return 'Can search accounts, update plans, and suspend accounts with approval.'
}

function setText(id: string, text: string) {
  const element = document.getElementById(id)
  if (element) element.textContent = text
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
