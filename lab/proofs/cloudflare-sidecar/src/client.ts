import '@kevinmarmstrong/edgekit-ui'
import {
  chromeAI,
  createCascadeReadinessController,
  tool,
  webLLM,
} from '@kevinmarmstrong/edgekit'
import { createKnowledgeSkill, type EdgeKnowledgeResult, type EdgeKnowledgeSource } from '@kevinmarmstrong/edgekit-knowledge'
import { createMissionProfile, createSkill, skillsToTools, validateMissionProfile } from '@kevinmarmstrong/edgekit-skills'
import type { EdgeCascadeWizard, EdgeChat } from '@kevinmarmstrong/edgekit-ui'
import { z } from 'zod'
import './styles.css'

const source: EdgeKnowledgeSource = {
  id: 'cloudflare-kb',
  label: 'Cloudflare-hosted knowledge',
  async search(query, context) {
    const response = await fetch('/api/edgekit/knowledge/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query,
        topK: context.topK ?? 4,
        roles: context.session.identity?.roles ?? ['visitor'],
      }),
    })
    if (!response.ok) throw new Error(`Knowledge search failed: ${response.status}`)
    const payload = await response.json() as {
      results?: Array<{
        id?: unknown
        title?: unknown
        body?: unknown
        citation?: unknown
        source?: unknown
        score?: unknown
      }>
    }
    return (payload.results ?? []).map((item): EdgeKnowledgeResult => ({
      id: String(item.id ?? crypto.randomUUID()),
      title: String(item.title ?? 'Untitled result'),
      excerpt: String(item.body ?? ''),
      source: typeof item.source === 'string' ? item.source : 'cloudflare-sidecar-worker',
      score: typeof item.score === 'number' ? item.score : undefined,
      citations: typeof item.citation === 'string'
        ? [{ id: String(item.id ?? item.citation), label: String(item.title ?? item.citation), uri: item.citation }]
        : [],
      metadata: { roles: context.session.identity?.roles ?? ['visitor'] },
    }))
  },
  freshness: () => ({ stale: false, updatedAt: new Date().toISOString() }),
}

const knowledgeSkill = createKnowledgeSkill({
  id: 'cloudflare-knowledge',
  name: 'Cloudflare Knowledge',
  description: 'Search Cloudflare-hosted Edgekit implementation and intake policy knowledge with citations.',
  source,
  toolName: 'searchCloudflareKnowledge',
  requiredFacts: ['title', 'answer', 'citation'],
})

const submitIntake = tool({
  description: 'Submit an implementation intake request after visible user approval.',
  inputSchema: z.object({
    name: z.string(),
    email: z.string(),
    topic: z.string(),
    summary: z.string(),
  }),
  execute: async input => {
    const response = await fetch('/api/edgekit/intake', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!response.ok) throw new Error(`Intake submit failed: ${response.status}`)
    return response.json()
  },
  needsApproval: true,
})

const intakeSkill = createSkill({
  id: 'cloudflare-intake',
  name: 'Cloudflare Intake',
  description: 'Collect and submit an implementation intake request only after the visitor confirms contact details, topic, and summary.',
  instructions: 'Ask for missing name, email, topic, or summary. Never submit intake without visible user approval. Confirm the intake id after submission.',
  requiredTools: ['submitIntake'],
  policy: { needsApproval: true, riskLevel: 'medium', approvalMessage: 'Submit this intake request?' },
  synthesis: { requiredFacts: ['intake id', 'name', 'email', 'topic'], preferredStyle: 'explicit' },
  uiAffordances: { preferActionCards: true, suggestedFields: ['name', 'email', 'topic', 'summary'] },
})

const profile = createMissionProfile({
  id: 'cloudflare-sidecar-v1',
  mission: 'cloudflare-sidecar-proof',
  version: '1.0.0',
  systemPrompt: [
    'You are an Edgekit sidecar hosted on Cloudflare.',
    'Search knowledge before answering implementation questions.',
    'Do not submit intake without visible approval.',
    'The Worker owns API execution, telemetry forwarding, COOP/COEP headers, and optional cloud fallback.',
  ].join(' '),
  requiredTools: ['searchCloudflareKnowledge', 'submitIntake'],
  defaults: { toolChoice: 'required', downloadPolicy: 'never' },
  synthesis: { requiredAttributes: ['citation', 'intake approval boundary', 'hosted route'], style: 'explicit' },
  policy: { needsApproval: true, riskLevel: 'medium' },
  uiAffordances: { preferActionCards: true, suggestedFields: ['name', 'email', 'topic', 'summary'] },
  meta: { description: 'Cloudflare-hosted sidecar with knowledge, intake, and explicit cloud route proof.', compatibility: '^0.3.0' },
})

const tools = {
  ...skillsToTools([knowledgeSkill]),
  submitIntake,
}
const validation = validateMissionProfile(profile, { registeredTools: tools })
if (!validation.ok) throw new Error(validation.errors.map(issue => issue.message).join('\n'))

const readiness = createCascadeReadinessController({
  providers: [chromeAI(), webLLM()],
  downloadPolicy: 'never',
  fallback: true,
  requiredCapabilities: ['tools', 'approvals', 'edgeview'],
  requiredTools: profile.requiredTools,
  tools,
  visibilityPolicy: 'show-basic-when-local-unavailable',
})

const chat = document.querySelector<EdgeChat>('edge-chat#cloudflare-agent')
const events = document.querySelector<HTMLElement>('#events')
const logEvent = (name: string, data: unknown) => {
  if (!events) return
  const row = document.createElement('div')
  row.className = 'event'
  row.textContent = `${name}: ${JSON.stringify(data).slice(0, 180)}`
  events.prepend(row)
}

chat?.configure({
  model: [chromeAI(), webLLM()],
  downloadPolicy: 'never',
  toolChoice: 'required',
  cascadeReadiness: readiness,
  telemetry: event => logEvent(event.name, event.data ?? {}),
  identityProvider: () => ({ id: 'visitor-demo', roles: ['visitor'], permissions: ['knowledge:read', 'intake:create'] }),
  stateProvider: () => ({ route: '/cloudflare-proof', summary: 'Visitor is viewing the Cloudflare architecture proof.' }),
})
chat?.applyMissionProfile(profile)
chat?.registerTools(tools)
chat?.registerActions(context => {
  if (context.toolName !== 'searchCloudflareKnowledge') return []
  return [{
    id: 'start-intake',
    label: 'Start implementation intake',
    toolName: 'submitIntake',
    description: 'Use a visible approval-gated form before the Worker records intake.',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'text', required: true },
      { name: 'topic', label: 'Topic', type: 'text', value: 'Edgekit Cloudflare sidecar', required: true },
      { name: 'summary', label: 'Summary', type: 'text', required: true },
    ],
    successMessage: output => `Created intake ${String((output as { intakeId?: string }).intakeId ?? '')}`,
  }]
})

document.querySelector<EdgeCascadeWizard>('edge-cascade-wizard#readiness')?.configure(readiness)
void readiness.check()
