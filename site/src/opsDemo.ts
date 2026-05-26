import { chromeAI, createKnowledgeTool, createModelProvider, modelOptional, tool } from '@kevinmarmstrong/edgekit'
import type { LanguageModelV3 } from '@kevinmarmstrong/edgekit'
import type { EdgeChat } from '@kevinmarmstrong/edgekit-ui'
import { z } from 'zod'
import { fieldOpsProfile } from './profiles/field-ops'

type WorkOrder = {
  id: string
  customer: string
  asset: string
  priority: 'Critical' | 'High' | 'Normal'
  status: 'Unassigned' | 'Parts reserved' | 'Dispatched'
  sla: string
  partSku: string
  partName: string
  technicianId?: string
  eta?: string
}

type Technician = {
  id: string
  name: string
  region: string
  skills: string[]
  eta: string
  status: 'Available' | 'On route' | 'Booked'
}

type InventoryItem = {
  sku: string
  name: string
  available: number
  reserved: number
}

type OpsRole = 'dispatcher' | 'viewer' | 'supervisor'

const workOrders: WorkOrder[] = [
  {
    id: 'WO-1842',
    customer: 'Riverside Clinic',
    asset: 'Rooftop HVAC compressor',
    priority: 'Critical',
    status: 'Unassigned',
    sla: '4h remaining',
    partSku: 'CMP-44',
    partName: 'Compressor module',
  },
  {
    id: 'WO-1819',
    customer: 'North Pier Foods',
    asset: 'Cold-room condenser',
    priority: 'High',
    status: 'Parts reserved',
    sla: '9h remaining',
    partSku: 'COND-12',
    partName: 'Condenser fan',
    technicianId: 'ava',
    eta: '32 min',
  },
  {
    id: 'WO-1760',
    customer: 'Metro School District',
    asset: 'Boiler pressure sensor',
    priority: 'Normal',
    status: 'Dispatched',
    sla: 'Tomorrow',
    partSku: 'SNS-8',
    partName: 'Pressure sensor',
    technicianId: 'omar',
    eta: '48 min',
  },
]

const technicians: Technician[] = [
  { id: 'ava', name: 'Ava Moreno', region: 'East', skills: ['HVAC', 'Refrigeration'], eta: '32 min', status: 'Available' },
  { id: 'omar', name: 'Omar Singh', region: 'North', skills: ['Boiler', 'Electrical'], eta: '48 min', status: 'Booked' },
  { id: 'jules', name: 'Jules Hart', region: 'East', skills: ['HVAC', 'Controls'], eta: '41 min', status: 'Available' },
]

const inventory: InventoryItem[] = [
  { sku: 'CMP-44', name: 'Compressor module', available: 2, reserved: 0 },
  { sku: 'COND-12', name: 'Condenser fan', available: 1, reserved: 1 },
  { sku: 'SNS-8', name: 'Pressure sensor', available: 7, reserved: 2 },
]

const opsActivity: string[] = ['No dispatch actions yet']
const opsAudit: string[] = ['No approval decisions yet']
const opsMetrics = {
  approvalsRequested: 0,
  approvalsApproved: 0,
  approvalsRejected: 0,
}
const roleCapabilities: Record<OpsRole, string[]> = {
  dispatcher: ['searchWorkOrders', 'searchRepairKnowledge', 'reserveInventory', 'assignTechnician'],
  viewer: ['searchWorkOrders'],
  supervisor: ['searchWorkOrders', 'searchRepairKnowledge', 'updateEta', 'approve high-risk changes'],
}
const repairKnowledge = [
  {
    id: 'cmp-44-safety',
    title: 'CMP-44 compressor replacement safety',
    excerpt: 'Reserve CMP-44 inventory before dispatch, verify lockout/tagout, and cite the safety checklist before changing ETA.',
    source: 'field-ops-repair-manual.md',
    uri: '/manuals/cmp-44-safety',
    roles: ['dispatcher', 'supervisor'],
    updatedAt: '2026-05-26',
  },
  {
    id: 'eta-policy',
    title: 'ETA update policy',
    excerpt: 'Supervisor approval is required before updating customer-facing ETA after dispatch or traffic delay.',
    source: 'dispatch-policy.md',
    uri: '/manuals/eta-policy',
    roles: ['supervisor'],
    updatedAt: '2026-05-26',
  },
]

const { searchRepairKnowledge } = createKnowledgeTool({
  name: 'searchRepairKnowledge',
  defaultTopK: 2,
  source: {
    id: 'field-ops-knowledge',
    label: 'Field ops knowledge',
    description: 'Role-filtered repair manuals and dispatch policy.',
    search: (query, context) => {
      const roles = new Set(context.session.identity?.roles ?? [currentOpsRole()])
      const terms = queryTokens(query)
      return repairKnowledge
        .filter(document => document.roles.some(role => roles.has(role)))
        .map(document => ({
          document,
          score: terms.reduce((total, term) => total + (normalize(`${document.title} ${document.excerpt}`).includes(term) ? 1 : 0), 0),
        }))
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ document, score }) => ({
          ...document,
          score,
          citations: [{ label: document.title, uri: document.uri, source: document.source }],
        }))
    },
    freshness: () => ({ stale: false, updatedAt: '2026-05-26T00:00:00.000Z' }),
  },
})

export function mountOpsDemo() {
  const chat = document.querySelector<EdgeChat>('edge-chat#ops-chat')
  if (!chat) return

  const scriptedMode = new URLSearchParams(window.location.search).get('opsAgentMode') === 'scripted'
  renderOpsState()
  document.querySelector<HTMLSelectElement>('#ops-role')?.addEventListener('change', () => {
    pushOpsActivity(`Role changed to ${currentOpsRole()}`)
    renderOpsState()
  })
  window.addEventListener('online', renderOpsState)
  window.addEventListener('offline', renderOpsState)

  chat.configure(
    scriptedMode
      ? {
          model: [scriptedOpsProvider()],
          streamText: createScriptedOpsStream() as never,
        }
      : {
          model: [chromeAI()],
          downloadPolicy: 'never',
          toolChoice: 'required',
          toolProvider: ({ input }) => opsToolsForInput(input),
          onNoModel: ({ input }) => answerFromOps(input),
        },
  )
  chat.applyMissionProfile(fieldOpsProfile)
  chat.registerTools({ searchWorkOrders, searchRepairKnowledge, reserveInventory, assignTechnician, updateEta })
  chat.registerActions(({ toolName, output }) => {
    if (toolName !== 'searchWorkOrders') return []
    return extractWorkOrders(output).flatMap(order => [
      {
        id: `reserve-${order.id}`,
        label: `Reserve ${order.partName}`,
        toolName: 'reserveInventory',
        description: `${order.customer} needs ${order.partSku}. Current status: ${order.status}.`,
        input: { workOrderId: order.id, partSku: order.partSku },
        fields: [{ name: 'quantity', label: 'Quantity', type: 'number' as const, required: true, value: 1 }],
        successMessage: (result: unknown) => formatReservationSuccess(result, order),
      },
      {
        id: `assign-${order.id}`,
        label: `Assign technician`,
        toolName: 'assignTechnician',
        description: `Dispatch an available technician before SLA breach: ${order.sla}.`,
        input: { workOrderId: order.id },
        fields: [
          {
            name: 'technicianId',
            label: 'Technician',
            type: 'select' as const,
            required: true,
            options: technicians
              .filter(tech => tech.status === 'Available')
              .map(tech => ({ label: `${tech.name} · ${tech.eta}`, value: tech.id })),
          },
          { name: 'eta', label: 'ETA', type: 'text' as const, required: true, value: '32 min' },
        ],
        successMessage: (result: unknown) => formatAssignmentSuccess(result, order),
      },
      {
        id: `eta-${order.id}`,
        label: `Update ETA`,
        toolName: 'updateEta',
        description: `Supervisor-only ETA update for ${order.customer}. Current ETA: ${order.eta ?? 'not set'}.`,
        input: { workOrderId: order.id },
        fields: [
          { name: 'eta', label: 'ETA', type: 'text' as const, required: true, value: order.eta ?? '45 min' },
          { name: 'reason', label: 'Reason', type: 'text' as const, required: true, value: 'Traffic delay after dispatch' },
        ],
        successMessage: (result: unknown) => formatEtaSuccess(result, order),
      },
    ])
  })
}

function opsToolsForInput(input: string) {
  const role = currentOpsRole()
  if (role === 'viewer') return { searchWorkOrders }
  if (/\b(manual|policy|knowledge|safety|citation|cite|repair)\b/i.test(input)) return { searchWorkOrders, searchRepairKnowledge }
  if (role === 'supervisor' && /\b(eta|delay|arrival|time)\b/i.test(input)) return { searchWorkOrders, updateEta }
  if (/\b(assign|dispatch|technician|eta)\b/i.test(input)) return { searchWorkOrders, assignTechnician }
  if (/\b(reserve|part|inventory|stock|compressor)\b/i.test(input)) return { searchWorkOrders, reserveInventory }
  return { searchWorkOrders }
}

const searchWorkOrders = tool({
  description: 'Search field-service work orders by customer, priority, part, SLA, technician, or status.',
  inputSchema: z.object({
    query: z.string(),
    priority: modelOptional(z.enum(['Critical', 'High', 'Normal'])),
    status: modelOptional(z.enum(['Unassigned', 'Parts reserved', 'Dispatched'])),
  }),
  execute: async input => searchWorkOrderData(input),
})

const reserveInventory = tool({
  description: 'Reserve inventory for a work order after the user confirms the quantity and part.',
  inputSchema: z.object({
    workOrderId: z.string(),
    partSku: z.string(),
    quantity: z.number().default(1),
  }),
  execute: async ({ workOrderId, partSku, quantity }) => {
    const order = workOrders.find(item => item.id === workOrderId)
    const item = inventory.find(candidate => candidate.sku === partSku)
    if (!order || !item) return { success: false, error: 'Work order or inventory item not found' }
    if (item.available < quantity) return { success: false, error: 'Insufficient stock', available: item.available }
    item.available -= quantity
    item.reserved += quantity
    order.status = 'Parts reserved'
    pushOpsActivity(`Reserved ${quantity}x ${item.name} for ${order.customer}`)
    pushOpsAudit(`Approved reserveInventory for ${workOrderId}: ${quantity}x ${partSku}`)
    renderOpsState()
    return { success: true, workOrderId, customer: order.customer, partSku, partName: item.name, quantity, remaining: item.available }
  },
  needsApproval: true,
})

const assignTechnician = tool({
  description: 'Assign a technician to a field-service work order after user confirmation.',
  inputSchema: z.object({
    workOrderId: z.string(),
    technicianId: z.string(),
    eta: z.string(),
  }),
  execute: async ({ workOrderId, technicianId, eta }) => {
    const order = workOrders.find(item => item.id === workOrderId)
    const technician = technicians.find(item => item.id === technicianId)
    if (!order || !technician) return { success: false, error: 'Work order or technician not found' }
    order.technicianId = technicianId
    order.status = 'Dispatched'
    technician.status = 'On route'
    technician.eta = eta
    pushOpsActivity(`Assigned ${technician.name} to ${order.customer} · ETA ${eta}`)
    pushOpsAudit(`Approved assignTechnician for ${workOrderId}: ${technician.name}, ETA ${eta}`)
    renderOpsState()
    return { success: true, workOrderId, customer: order.customer, technician: technician.name, eta, status: order.status }
  },
  needsApproval: true,
})

const updateEta = tool({
  description: 'Update the ETA on a field-service work order after supervisor approval.',
  inputSchema: z.object({
    workOrderId: z.string(),
    eta: z.string(),
    reason: z.string(),
  }),
  execute: async ({ workOrderId, eta, reason }) => {
    const order = workOrders.find(item => item.id === workOrderId)
    if (!order) return { success: false, error: 'Work order not found' }
    order.eta = eta
    pushOpsActivity(`Updated ${order.customer} ETA to ${eta}: ${reason}`)
    pushOpsAudit(`Approved updateEta for ${workOrderId}: ${eta}, reason ${reason}`)
    renderOpsState()
    return { success: true, workOrderId, customer: order.customer, eta, reason }
  },
  needsApproval: true,
})

function scriptedOpsProvider() {
  const scriptedModel = {
    provider: 'scripted-field-ops',
    modelId: 'field-ops-dispatch',
    specificationVersion: 'v3',
  } as LanguageModelV3
  return createModelProvider({ id: 'scripted-field-ops', label: 'Scripted field ops agent', resolve: async () => scriptedModel })
}

function createScriptedOpsStream() {
  return (options: { messages?: unknown[]; tools?: Record<string, unknown> }) => {
    const input = latestUserInput(options.messages ?? [])
    const approval = findLatestApprovalResponse(options.messages ?? [])
    if (approval) {
      return approval.approved
        ? approvedOpsStream(options.tools ?? {}, approval.toolCall)
        : rejectedOpsStream(approval.toolCall)
    }
    return initialOpsStream(options.tools ?? {}, input)
  }
}

function initialOpsStream(tools: Record<string, unknown>, input: string) {
  const wantsKnowledge = /\b(manual|policy|knowledge|safety|citation|cite|repair)\b/i.test(input)
  const wantsEta = /\b(eta|delay|arrival|time)\b/i.test(input)
  const wantsAssign = /\b(assign|dispatch|technician)\b/i.test(input)
  const wantsReserve = /\b(reserve|part|inventory|stock|compressor)\b/i.test(input) || (!wantsAssign && !wantsEta)
  const toolCall = wantsAssign
    ? { type: 'tool-call', toolCallId: 'tool-assign-tech', toolName: 'assignTechnician', input: { workOrderId: 'WO-1842', technicianId: 'ava', eta: '32 min' } }
    : wantsEta
      ? { type: 'tool-call', toolCallId: 'tool-update-eta', toolName: 'updateEta', input: { workOrderId: 'WO-1842', eta: '45 min', reason: 'Traffic delay after dispatch' } }
      : { type: 'tool-call', toolCallId: 'tool-reserve-part', toolName: 'reserveInventory', input: { workOrderId: 'WO-1842', partSku: 'CMP-44', quantity: 1 } }
  return {
    fullStream: (async function* () {
      const searchInput = { query: input || 'critical compressor Riverside' }
      yield { type: 'tool-call', toolCallId: 'tool-search-work-orders', toolName: 'searchWorkOrders', input: searchInput }
      const output = await executeTool(tools.searchWorkOrders, searchInput)
      yield { type: 'tool-result', toolCallId: 'tool-search-work-orders', toolName: 'searchWorkOrders', output }
      if (wantsKnowledge) {
        yield { type: 'tool-call', toolCallId: 'tool-search-repair-knowledge', toolName: 'searchRepairKnowledge', input: { query: input || 'CMP-44 safety' } }
        const knowledge = await executeTool(tools.searchRepairKnowledge, { query: input || 'CMP-44 safety' })
        yield { type: 'tool-result', toolCallId: 'tool-search-repair-knowledge', toolName: 'searchRepairKnowledge', output: knowledge }
        yield { type: 'text-delta', delta: formatKnowledgeAnswer(knowledge) }
        return
      }
      yield {
        type: 'text-delta',
        delta: `Riverside Clinic has a Critical work order with ${workOrders[0].sla}. ${wantsEta ? 'Supervisor approval is required before updating ETA.' : wantsReserve ? 'Approval is required before reserving CMP-44 inventory.' : 'Approval is required before assigning Ava Moreno.'}`,
      }
      opsMetrics.approvalsRequested += 1
      renderOpsState()
      yield { type: 'tool-approval-request', approvalId: `approval-${toolCall.toolName}`, toolCall }
    })(),
    response: Promise.resolve({
      messages: [{ role: 'assistant', content: [{ type: 'text', text: 'Riverside Clinic is ready for review.' }, { type: 'tool-approval-request', approvalId: `approval-${toolCall.toolName}`, toolCall }] }],
    }),
  }
}

function formatKnowledgeAnswer(output: unknown) {
  const record = isRecord(output) && Array.isArray(output.results) ? output.results.find(isRecord) : undefined
  if (!record) return 'The field-ops knowledge source did not contain enough evidence for that question.'
  const title = String(record.title ?? 'Retrieved policy')
  const excerpt = String(record.excerpt ?? '')
  const source = String(record.source ?? 'field-ops knowledge')
  const uri = String(record.uri ?? '')
  return `${title}: ${excerpt} Citation: ${source}${uri ? ` (${uri})` : ''}. Freshness: current.`
}

function approvedOpsStream(tools: Record<string, unknown>, toolCall: ApprovalToolCall | null) {
  const approvedCall = toolCall ?? { type: 'tool-call', toolCallId: 'tool-reserve-part', toolName: 'reserveInventory', input: { workOrderId: 'WO-1842', partSku: 'CMP-44', quantity: 1 } }
  return {
    fullStream: (async function* () {
      opsMetrics.approvalsApproved += 1
      renderOpsState()
      yield approvedCall
      const output = await executeTool(tools[approvedCall.toolName], approvedCall.input)
      yield { type: 'tool-result', toolCallId: approvedCall.toolCallId, toolName: approvedCall.toolName, output }
      yield { type: 'text-delta', delta: formatOpsSuccess(approvedCall, output) }
    })(),
    response: Promise.resolve({ messages: [{ role: 'assistant', content: [{ type: 'text', text: formatOpsSuccess(approvedCall, undefined) }] }] }),
  }
}

function rejectedOpsStream(toolCall: ApprovalToolCall | null) {
  const name = toolCall?.toolName === 'assignTechnician' ? 'assign a technician' : toolCall?.toolName === 'updateEta' ? 'update ETA' : 'reserve inventory'
  return {
    fullStream: (async function* () {
      opsMetrics.approvalsRejected += 1
      pushOpsActivity(`Rejected request to ${name}; ERP state unchanged`)
      pushOpsAudit(`Rejected ${toolCall?.toolName ?? 'mutation'}; no ERP mutation executed`)
      renderOpsState()
      yield { type: 'text-delta', delta: `I did not ${name}. The work order, ETA, technician, and inventory state were left unchanged.` }
    })(),
    response: Promise.resolve({ messages: [{ role: 'assistant', content: [{ type: 'text', text: `I did not ${name}.` }] }] }),
  }
}

function renderOpsState() {
  renderWorkOrders()
  renderInventory()
  renderTechnicians()
  renderOpsActivity()
  renderOpsAudit()
  renderOpsSummary()
  renderOpsScope()
  renderOpsWorkflowState()
  renderOpsTelemetry()
}

function renderWorkOrders() {
  const board = document.querySelector<HTMLElement>('#ops-work-orders')
  if (!board) return
  board.innerHTML = workOrders.map(order => {
    const technician = technicians.find(item => item.id === order.technicianId)
    return `
      <article class="ops-card" data-testid="ops-work-order" data-work-order-id="${order.id}">
        <div>
          <span class="status-chip ${priorityClass(order.priority)}">${order.priority}</span>
          <span class="status-chip">${order.status}</span>
        </div>
        <h3>${order.customer}</h3>
        <p>${order.asset}</p>
        <dl>
          <div><dt>Work order</dt><dd>${order.id}</dd></div>
          <div><dt>SLA</dt><dd data-testid="ops-sla-${order.id}">${order.sla}</dd></div>
          <div><dt>Part</dt><dd>${order.partSku}</dd></div>
          <div><dt>Technician</dt><dd data-testid="ops-tech-${order.id}">${technician?.name ?? 'Unassigned'}</dd></div>
          <div><dt>ETA</dt><dd data-testid="ops-eta-${order.id}">${order.eta ?? technician?.eta ?? 'Not set'}</dd></div>
        </dl>
      </article>
    `
  }).join('')
}

function renderInventory() {
  const table = document.querySelector<HTMLElement>('#ops-inventory')
  if (!table) return
  table.innerHTML = inventory.map(item => `
    <tr>
      <td>${item.sku}</td>
      <td>${item.name}</td>
      <td data-testid="inventory-available-${item.sku}">${item.available}</td>
      <td>${item.reserved}</td>
    </tr>
  `).join('')
}

function renderTechnicians() {
  const roster = document.querySelector<HTMLElement>('#ops-technicians')
  if (!roster) return
  roster.innerHTML = technicians.map(tech => `
    <article class="tech-row">
      <div>
        <h3>${tech.name}</h3>
        <p>${tech.region} · ${tech.skills.join(', ')}</p>
      </div>
      <span class="status-chip ${tech.status === 'Available' ? 'ok' : ''}" data-testid="tech-status-${tech.id}">${tech.status}</span>
    </article>
  `).join('')
}

function renderOpsActivity() {
  const log = document.querySelector<HTMLElement>('#ops-activity')
  if (!log) return
  log.innerHTML = opsActivity.map(item => `<li>${item}</li>`).join('')
}

function renderOpsAudit() {
  const log = document.querySelector<HTMLElement>('#ops-audit')
  if (!log) return
  log.innerHTML = opsAudit.map(item => `<li>${item}</li>`).join('')
}

function renderOpsSummary() {
  const compressor = inventory.find(item => item.sku === 'CMP-44')
  const stock = document.querySelector<HTMLElement>('#ops-cmp-stock')
  if (stock && compressor) stock.textContent = String(compressor.available)
  const availableTechs = document.querySelector<HTMLElement>('#ops-available-techs')
  if (availableTechs) availableTechs.textContent = String(technicians.filter(tech => tech.status === 'Available').length)
}

function renderOpsScope() {
  const role = currentOpsRole()
  const scope = document.querySelector<HTMLElement>('#ops-role-scope')
  const risk = document.querySelector<HTMLElement>('#ops-risk-state')
  const sync = document.querySelector<HTMLElement>('#ops-sync-state')
  const capabilityList = document.querySelector<HTMLElement>('#ops-capability-list')
  if (scope) {
    scope.textContent = role === 'viewer'
      ? 'Viewer can search and inspect work orders; mutation tools are hidden.'
      : role === 'supervisor'
        ? 'Supervisor can search, update ETA, review policy, and approve high-risk changes.'
        : 'Dispatcher can search work orders, reserve parts, and assign available technicians.'
  }
  if (risk) {
    risk.textContent = role === 'viewer' ? 'Read-only role: no mutation tools exposed' : 'Mutations require approval'
  }
  if (sync) {
    sync.textContent = navigator.onLine
      ? 'Online: ERP mutations execute immediately after approval.'
      : 'Offline: approved idempotent mutations would queue in the host-owned journal.'
  }
  if (capabilityList) {
    capabilityList.innerHTML = roleCapabilities[role].map(capability => `<li>${capability}</li>`).join('')
  }
}

function renderOpsWorkflowState() {
  const primaryOrder = workOrders.find(order => order.id === 'WO-1842')
  if (!primaryOrder) return
  const workflow = document.querySelector<HTMLElement>('#ops-workflow-state')
  const nextAction = document.querySelector<HTMLElement>('#ops-next-action')
  const evidence = document.querySelector<HTMLElement>('#ops-policy-evidence')
  const resilience = document.querySelector<HTMLElement>('#ops-resilience-state')
  const resilienceDetail = document.querySelector<HTMLElement>('#ops-resilience-detail')
  const technician = technicians.find(item => item.id === primaryOrder.technicianId)

  if (workflow) {
    workflow.textContent = primaryOrder.status === 'Unassigned'
      ? 'Triage ready'
      : primaryOrder.status === 'Parts reserved'
        ? 'Parts reserved, dispatch pending'
        : 'Dispatched with active ETA'
  }
  if (nextAction) {
    nextAction.textContent = primaryOrder.status === 'Unassigned'
      ? 'Next action: reserve CMP-44 after approval, then assign an East HVAC technician.'
      : primaryOrder.status === 'Parts reserved'
        ? 'Next action: assign Ava or Jules with ETA evidence before the 4h SLA breach.'
        : `Next action: monitor ${technician?.name ?? 'assigned technician'} and update ETA only with supervisor approval.`
  }
  if (evidence) {
    evidence.textContent = currentOpsRole() === 'viewer'
      ? 'Read-only users can inspect work orders without policy mutation tools'
      : primaryOrder.status === 'Dispatched' || primaryOrder.eta
        ? 'ETA policy requires supervisor approval for customer-facing changes'
        : 'CMP-44 safety checklist required before dispatch'
  }
  if (resilience) {
    resilience.textContent = navigator.onLine ? 'Online execution' : 'Offline journal mode'
  }
  if (resilienceDetail) {
    resilienceDetail.textContent = navigator.onLine
      ? 'Approved idempotent mutations execute now; audit and telemetry records stay visible.'
      : 'Approved idempotent mutations would queue in the host-owned journal until sync resumes.'
  }
}

function renderOpsTelemetry() {
  const role = currentOpsRole()
  const tools = document.querySelector<HTMLElement>('#ops-telemetry-tools')
  const approvals = document.querySelector<HTMLElement>('#ops-telemetry-approvals')
  const audit = document.querySelector<HTMLElement>('#ops-telemetry-audit')
  if (tools) tools.textContent = `${role} · ${roleCapabilities[role].length} tools`
  if (approvals) {
    approvals.textContent = `${opsMetrics.approvalsRequested} requested · ${opsMetrics.approvalsApproved} approved · ${opsMetrics.approvalsRejected} rejected`
  }
  if (audit) {
    const count = opsAudit[0] === 'No approval decisions yet' ? 0 : opsAudit.length
    audit.textContent = `${count} recorded`
  }
}

function answerFromOps(input: string) {
  const { results } = searchWorkOrderData({ query: input })
  if (results.length === 0) return 'Local browser AI is unavailable here, and basic field-ops mode did not find a matching work order.'
  return [
    'Local browser AI is unavailable here, so Edgekit answered through basic field-ops mode.',
    '',
    ...results.map(order => `${order.id} · ${order.customer} · ${order.priority} · ${order.status} · ${order.sla} · needs ${order.partSku}`),
    '',
    'Enable Chrome AI for guarded inventory reservation and dispatch workflows.',
  ].join('\n')
}

function searchWorkOrderData(input: { query: string; priority?: string; status?: string }) {
  const tokens = queryTokens(input.query)
  const results = workOrders.filter(order => {
    const haystack = normalize(`${order.id} ${order.customer} ${order.asset} ${order.priority} ${order.status} ${order.sla} ${order.partSku} ${order.partName}`)
    const matchesQuery = tokens.length === 0 || tokens.every(token => haystack.includes(token))
    const matchesPriority = !input.priority || order.priority === input.priority
    const matchesStatus = !input.status || order.status === input.status
    return matchesQuery && matchesPriority && matchesStatus
  })
  return { results, total: results.length, summary: results.map(orderSummary) }
}

function extractWorkOrders(output: unknown): WorkOrder[] {
  if (!isRecord(output) || !Array.isArray(output.results)) return []
  return output.results.filter((item): item is WorkOrder => isRecord(item) && typeof item.id === 'string' && typeof item.customer === 'string')
}

function orderSummary(order: WorkOrder) {
  return `${order.id}: ${order.customer} is ${order.priority}; status ${order.status}; SLA ${order.sla}; needs ${order.partSku} ${order.partName}.`
}

function formatOpsSuccess(toolCall: ApprovalToolCall, output: unknown) {
  const record = isRecord(output) ? output : {}
  if (toolCall.toolName === 'updateEta') {
    return `Updated ETA for ${String(record.customer ?? toolCall.input.workOrderId ?? 'the work order')} to ${String(record.eta ?? toolCall.input.eta ?? 'set')}.`
  }
  if (toolCall.toolName === 'assignTechnician') {
    return `Assigned ${String(record.technician ?? 'the technician')} to ${String(record.customer ?? 'the work order')} with ETA ${String(record.eta ?? toolCall.input.eta ?? 'set')}.`
  }
  return `Reserved ${String(record.quantity ?? toolCall.input.quantity ?? 1)}x ${String(record.partName ?? toolCall.input.partSku ?? 'part')} for ${String(record.customer ?? toolCall.input.workOrderId ?? 'the work order')}. Remaining stock: ${String(record.remaining ?? 'updated')}.`
}

function formatReservationSuccess(result: unknown, order: WorkOrder) {
  const record = isRecord(result) ? result : {}
  return `Reserved ${String(record.quantity ?? 1)}x ${order.partName} for ${order.customer}. Remaining stock: ${String(record.remaining ?? 'updated')}.`
}

function formatAssignmentSuccess(result: unknown, order: WorkOrder) {
  const record = isRecord(result) ? result : {}
  return `Assigned ${String(record.technician ?? 'technician')} to ${order.customer}. ETA ${String(record.eta ?? 'set')}.`
}

function formatEtaSuccess(result: unknown, order: WorkOrder) {
  const record = isRecord(result) ? result : {}
  return `Updated ETA for ${order.customer} to ${String(record.eta ?? 'set')}.`
}

function findLatestApprovalResponse(messages: unknown[]) {
  const toolMessage = [...messages].reverse().find((message): message is { role: string; content: unknown } => isRecord(message) && message.role === 'tool')
  const content = Array.isArray(toolMessage?.content) ? toolMessage.content : []
  const approval = content.find(
    (part): part is { approved: boolean; toolCall?: unknown } =>
      isRecord(part) && part.type === 'tool-approval-response' && typeof part.approved === 'boolean',
  )
  return approval ? { ...approval, toolCall: normalizeToolCall(approval.toolCall) } : undefined
}

function normalizeToolCall(value: unknown): ApprovalToolCall | null {
  if (!isRecord(value) || typeof value.toolCallId !== 'string' || typeof value.toolName !== 'string' || !isRecord(value.input)) return null
  return { type: typeof value.type === 'string' ? value.type : undefined, toolCallId: value.toolCallId, toolName: value.toolName, input: value.input }
}

type ApprovalToolCall = { type?: string; toolCallId: string; toolName: string; input: Record<string, unknown> }

async function executeTool(toolDefinition: unknown, input: Record<string, unknown>) {
  const candidate = toolDefinition as { execute?: (input: Record<string, unknown>) => unknown | Promise<unknown> }
  if (!candidate.execute) return { error: 'Tool is not executable.' }
  return candidate.execute(input)
}

function latestUserInput(messages: unknown[]) {
  const userMessage = [...messages].reverse().find((message): message is { role: string; content: unknown } => isRecord(message) && message.role === 'user')
  return typeof userMessage?.content === 'string' ? userMessage.content : ''
}

function pushOpsActivity(item: string) {
  if (opsActivity.length === 1 && opsActivity[0] === 'No dispatch actions yet') opsActivity.length = 0
  opsActivity.unshift(item)
}

function pushOpsAudit(item: string) {
  if (opsAudit.length === 1 && opsAudit[0] === 'No approval decisions yet') opsAudit.length = 0
  opsAudit.unshift(`${new Date().toISOString().slice(11, 19)} · ${item}`)
}

function currentOpsRole(): OpsRole {
  const value = document.querySelector<HTMLSelectElement>('#ops-role')?.value
  return value === 'viewer' || value === 'supervisor' ? value : 'dispatcher'
}

function priorityClass(priority: WorkOrder['priority']) {
  if (priority === 'Critical') return 'danger'
  if (priority === 'High') return 'warn'
  return 'ok'
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, ' ').trim()
}

function queryTokens(value: string) {
  const stopWords = new Set([
    'a',
    'about',
    'an',
    'and',
    'assign',
    'available',
    'dispatch',
    'field',
    'find',
    'for',
    'hold',
    'inventory',
    'me',
    'need',
    'one',
    'order',
    'part',
    'please',
    'reserve',
    'show',
    'stock',
    'technician',
    'the',
    'to',
    'work',
  ])
  return normalize(value)
    .split(' ')
    .filter(token => token.length > 1 && !stopWords.has(token))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
