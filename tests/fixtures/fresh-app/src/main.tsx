import React from 'react'
import { createRoot } from 'react-dom/client'
import '@kevinmarmstrong/edgekit-ui'
import { chromeAI, modelOptional, tool } from '@kevinmarmstrong/edgekit'
import { createMissionProfile, createSkill, validateMissionProfile } from '@kevinmarmstrong/edgekit-skills'
import { createKnowledgeSkill, createKnowledgeTool } from '@kevinmarmstrong/edgekit-knowledge'
import { createMemoryMutationJournal, createPiiRedactor } from '@kevinmarmstrong/edgekit-governance'
import { mcpToolsFromDefinitions } from '@kevinmarmstrong/edgekit-mcp'
import { agUiEventToAgentEvents } from '@kevinmarmstrong/edgekit-agui'
import type { EdgeChat as EdgeChatElement } from '@kevinmarmstrong/edgekit-ui'
import { EdgeChat } from '@kevinmarmstrong/edgekit-react'
import { z } from 'zod'

const searchCases = tool({
  description: 'Search support cases',
  inputSchema: z.object({
    query: z.string(),
    priority: modelOptional(z.enum(['Normal', 'High', 'Urgent'])),
  }),
  execute: async ({ query, priority }) => ({
    results: [{ id: 'CASE-1', query, priority: priority ?? 'Normal', customer: 'Riverside Clinic' }],
  }),
})

const createTicket = tool({
  description: 'Create a support ticket after approval',
  inputSchema: z.object({
    customer: z.string(),
    summary: z.string(),
  }),
  execute: async input => ({ success: true, ticketId: 'TICKET-1', ...input }),
  needsApproval: true,
})

createSkill({
  id: 'support-search',
  name: 'Support Search',
  description: 'Search support cases and surface case facts.',
  requiredTools: ['searchCases'],
})

const supportProfile = createMissionProfile({
  id: 'fresh-support-v1',
  mission: 'support-workflow',
  version: '1.0.0',
  systemPrompt: 'Search support cases before answering. Ask for approval before ticket creation.',
  requiredTools: ['searchCases', 'createTicket'],
  defaults: { toolChoice: 'required', downloadPolicy: 'never' },
  synthesis: { requiredAttributes: ['case id', 'customer', 'priority'], style: 'explicit' },
})

const tools = { searchCases, createTicket }
const knowledgeTool = createKnowledgeTool({
  name: 'searchSupportKnowledge',
  source: {
    id: 'support-docs',
    search: async () => [{ id: 'k1', title: 'SLA', excerpt: 'Urgent cases require a 15 minute response.' }],
  },
})
const knowledgeSkill = createKnowledgeSkill({
  id: 'support-knowledge',
  name: 'Support Knowledge',
  description: 'Search support knowledge with citations.',
  source: {
    id: 'support-docs',
    search: async () => [{ id: 'k1', title: 'SLA', excerpt: 'Urgent cases require a 15 minute response.' }],
  },
})
const journal = createMemoryMutationJournal({ createId: () => 'mutation-1' })
const redactor = createPiiRedactor()
const mcpTools = mcpToolsFromDefinitions([{ name: 'lookupPolicy', description: 'Look up policy.' }], {
  callTool: async () => ({ content: [{ type: 'text', text: 'Policy found.' }] }),
})
const aguiEvents = agUiEventToAgentEvents({ type: 'TEXT_MESSAGE_CONTENT', delta: 'AG-UI ready.' })

if (!(knowledgeSkill.requiredTools ?? []).includes('searchSupportKnowledge')) throw new Error('Knowledge skill did not expose its search tool')
if (!Object.keys(knowledgeTool).includes('searchSupportKnowledge')) throw new Error('Knowledge tool was not created')
if (!Object.keys(mcpTools).includes('lookupPolicy')) throw new Error('MCP tool was not created')
if (aguiEvents[0]?.type !== 'text-delta') throw new Error('AG-UI event mapper did not emit text')

const validation = validateMissionProfile(supportProfile, { registeredTools: tools })
if (!validation.ok) throw new Error(validation.errors.map(issue => issue.message).join('\n'))
Promise.resolve(journal.enqueue({ toolName: 'createTicket', input: { customer: 'Riverside Clinic' } })).catch((error: unknown) => {
  throw error
})
Promise.resolve(redactor('email sam@example.com', { session: {} })).catch((error: unknown) => {
  throw error
})

const chat = document.querySelector<EdgeChatElement>('edge-chat')
chat?.configure({ model: [chromeAI()] })
chat?.applyMissionProfile(supportProfile)
chat?.registerTools(tools)

createRoot(document.querySelector('#root')!).render(
  <React.StrictMode>
    <EdgeChat missionProfile={supportProfile} />
  </React.StrictMode>,
)
