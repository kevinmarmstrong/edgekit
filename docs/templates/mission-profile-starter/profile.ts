import { modelOptional, tool } from '@kevinmarmstrong/edgekit'
import { createMissionProfile, createSkill } from '@kevinmarmstrong/edgekit-skills'
import { z } from 'zod'

type SupportCase = {
  id: string
  customer: string
  product: string
  priority: 'Low' | 'Normal' | 'High' | 'Urgent'
  status: 'Open' | 'Waiting on customer' | 'Escalated'
  summary: string
}

const supportCases: SupportCase[] = [
  {
    id: 'CASE-1042',
    customer: 'Riverside Clinic',
    product: 'Edgekit Commerce',
    priority: 'Urgent',
    status: 'Open',
    summary: 'Checkout agent cannot complete size selection after inventory refresh.',
  },
  {
    id: 'CASE-1031',
    customer: 'Northwind Labs',
    product: 'Edgekit Admin',
    priority: 'High',
    status: 'Escalated',
    summary: 'Admin approval audit export is missing rejection reason.',
  },
]

export const searchSupportCases = tool({
  description: 'Search customer support cases by customer, product, priority, status, or summary.',
  inputSchema: z.object({
    query: z.string(),
    priority: modelOptional(z.enum(['Low', 'Normal', 'High', 'Urgent'])),
  }),
  execute: async ({ query, priority }) => {
    const normalized = query.toLowerCase()
    const results = supportCases.filter(item => {
      const haystack = `${item.id} ${item.customer} ${item.product} ${item.priority} ${item.status} ${item.summary}`.toLowerCase()
      return haystack.includes(normalized) && (!priority || item.priority === priority)
    })
    return { results, total: results.length }
  },
})

export const createSupportTicket = tool({
  description: 'Create a follow-up support ticket after the user confirms category, priority, and summary.',
  inputSchema: z.object({
    customer: z.string(),
    category: z.enum(['Billing', 'Orders', 'Technical', 'Account']),
    priority: z.enum(['Normal', 'High', 'Urgent']),
    summary: z.string(),
  }),
  execute: async input => ({
    success: true,
    ticketId: `TICKET-${Math.floor(1000 + Math.random() * 9000)}`,
    ...input,
  }),
  needsApproval: true,
})

export const supportSearchSkill = createSkill({
  id: 'support-case-search',
  name: 'Search Support Cases',
  description: 'Find support cases and answer customer support status, priority, and product questions.',
  instructions: [
    'Search cases before answering support questions.',
    'Restate case id, customer, priority, status, product, and summary from tool results.',
    'Do not create or mutate tickets for read-only questions.',
  ].join(' '),
  activationExamples: [
    'what is open for Riverside Clinic?',
    'find urgent checkout support cases',
    'show escalated admin audit issues',
  ],
  requiredTools: ['searchSupportCases'],
  policy: { needsApproval: false, riskLevel: 'low' },
  synthesis: { requiredFacts: ['case id', 'customer', 'priority', 'status', 'summary'], preferredStyle: 'explicit' },
})

export const createTicketSkill = createSkill({
  id: 'create-support-ticket',
  name: 'Create Support Ticket',
  description: 'Create a new support ticket only after the user confirms the customer, category, priority, and summary.',
  instructions: [
    'Use only when the user asks to create or file a support ticket.',
    'Ask for missing category, priority, or summary before creating the ticket.',
    'Require visible approval before execution and confirm the ticket id after creation.',
  ].join(' '),
  activationExamples: [
    'create an urgent technical ticket for Riverside',
    'file a billing ticket for Northwind',
  ],
  doNotActivateWhen: [
    'The user only asks for case status.',
    'The customer, category, priority, or summary is missing.',
  ],
  requiredTools: ['createSupportTicket'],
  policy: { needsApproval: true, riskLevel: 'medium', approvalMessage: 'Create this support ticket?' },
  synthesis: { requiredFacts: ['ticket id', 'customer', 'category', 'priority'], preferredStyle: 'explicit' },
  uiAffordances: { preferActionCards: true, suggestedFields: ['category', 'priority', 'summary'] },
})

export const supportWorkflowProfile = createMissionProfile({
  id: 'support-workflow-v1',
  mission: 'support-workflow',
  version: '1.0.0',
  systemPrompt: `You are a support workflow sidecar inside an existing SaaS app.
Search support cases before answering case questions.
For read-only answers, surface case id, customer, priority, status, product, and summary from tool results.
Never create a ticket without a visible user action or approval.
The host app owns customer data, permissions, ticket creation, telemetry, and audit.`,
  requiredTools: ['searchSupportCases', 'createSupportTicket'],
  defaults: { toolChoice: 'required', downloadPolicy: 'never' },
  synthesis: {
    requiredAttributes: ['case id', 'customer', 'priority', 'status', 'summary', 'approval boundary'],
    style: 'explicit',
  },
  policy: { needsApproval: true, riskLevel: 'medium' },
  uiAffordances: { preferActionCards: true, suggestedFields: ['category', 'priority', 'summary'] },
  meta: {
    description: 'Starter mission for support case Q&A and approval-gated ticket creation.',
    compatibility: '^0.3.0',
  },
})

export const supportTools = {
  searchSupportCases,
  createSupportTicket,
}
