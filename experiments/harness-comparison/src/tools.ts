import { tool } from '@kevinmarmstrong/edgekit'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Tool surface #1 — a transactional dispatch board (compact payloads).
// This is the regime where the context-pressure measurement showed compaction
// gives ~0% benefit, and where two-strikes + the feasibility gate are tested.
// ---------------------------------------------------------------------------

const WORK_ORDERS: Record<string, unknown> = {
  'WO-4821': {
    id: 'WO-4821',
    customer: 'Northgate Medical Center',
    priority: 'high',
    issue: 'Rooftop unit RTU-3 not cooling; intermittent compressor fault E4.',
    sla: '4h response',
  },
}

const TECHNICIANS = [
  { id: 'T-12', name: 'Maria Lopez', skills: ['HVAC', 'refrigeration'], area: 'north', status: 'on-job until 14:30' },
  { id: 'T-19', name: 'Devon Park', skills: ['HVAC', 'controls'], area: 'north', status: 'available' },
  { id: 'T-27', name: 'Aisha Khan', skills: ['HVAC', 'electrical'], area: 'north', status: 'available' },
]

export const dispatchTools = {
  readWorkOrder: tool({
    description: 'Read a work order by id. Returns customer, priority, issue, and SLA.',
    inputSchema: z.object({ id: z.string().describe('Work order id, e.g. WO-4821') }),
    execute: async ({ id }) => WORK_ORDERS[id] ?? { error: `No work order found with id "${id}"` },
  }),
  listTechnicians: tool({
    description: 'List field technicians. Filter by skill, service area, or look one up by id.',
    inputSchema: z.object({
      skill: z.string().optional(),
      area: z.string().optional(),
      id: z.string().optional(),
    }),
    execute: async ({ skill, area, id }) => {
      if (id) {
        const match = TECHNICIANS.find(t => t.id === id)
        return match ?? { error: `No technician with id "${id}"` }
      }
      const results = TECHNICIANS.filter(
        t => (!skill || t.skills.includes(skill)) && (!area || t.area === area),
      )
      return { results }
    },
  }),
  scheduleSameDayVisit: tool({
    description: 'Schedule a same-day visit. Fails if the chosen technician is not available.',
    inputSchema: z.object({
      workOrder: z.string(),
      technician: z.string(),
      window: z.string().optional(),
    }),
    execute: async ({ workOrder, technician, window }) => {
      const tech = TECHNICIANS.find(t => t.id === technician)
      if (!tech) return { error: `Unknown technician "${technician}"` }
      // Deliberate failure path: scheduling a busy tech fails, so a model that
      // keeps retrying the same unavailable tech trips the two-strikes stop.
      if (tech.status !== 'available') {
        return { ok: false, error: `${tech.name} is ${tech.status}; pick an available technician.` }
      }
      return {
        ok: true,
        confirmation: `VISIT-${workOrder.slice(-4)}-${technician.slice(-2)}`,
        workOrder,
        technician: tech.name,
        window: window ?? '13:00-15:00',
      }
    },
  }),
}

// ---------------------------------------------------------------------------
// Tool surface #2 — a documentation/RAG surface (heavy payloads).
// This is the regime where compaction was worth ~64%. Included so the browser
// team can A/B compaction on the surface where it should actually matter.
// ---------------------------------------------------------------------------

const DOCS = [
  { id: 'doc-policy', title: 'Download policy', text: 'downloadPolicy accepts auto, prompt, or never. auto pre-authorizes downloads; prompt asks the user; never disables downloads and uses a server provider or search-only.' },
  { id: 'doc-cascade', title: 'Model cascade', text: 'The default cascade tries Chrome AI (Gemini Nano, zero download) first, then WebLLM over WebGPU, then any configured server provider, then a search-only fallback.' },
  { id: 'doc-grounding', title: 'Strict grounding', text: 'With grounding set to strict, the agent must use evidence tools before answering and refuses claims that have no tool-backed evidence.' },
  { id: 'doc-approval', title: 'Tool approval', text: 'Set needsApproval on a tool to pause the agent for human-in-the-loop confirmation before an irreversible action runs.' },
]

export const docsTools = {
  searchDocs: tool({
    description: 'Search the product documentation. Returns passages with ids you can cite.',
    inputSchema: z.object({ query: z.string() }),
    execute: async ({ query }) => {
      const q = query.toLowerCase()
      const ranked = DOCS.map(d => ({
        ...d,
        score: q.split(/\s+/).filter(w => d.text.toLowerCase().includes(w) || d.title.toLowerCase().includes(w)).length,
      }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
      return { query, results: ranked }
    },
  }),
}

// ---------------------------------------------------------------------------
// Canary tasks. Each is LABELLED feasible/infeasible and carries a deterministic
// grader so we measure decision quality (incl. gate false-rejections), not just
// step counts. `feasible: false` tasks have NO tool that can satisfy them — a good
// harness should decline, not flail or hallucinate.
// ---------------------------------------------------------------------------

export interface Canary {
  id: string
  surface: 'dispatch' | 'docs'
  prompt: string
  feasible: boolean
  /** Returns true if the run achieved the intended outcome. */
  grade: (run: { text: string; toolCalls: string[]; toolResults: Array<{ toolName: string; output: unknown }> }) => boolean
}

const mentions = (text: string, ...needles: string[]) =>
  needles.some(n => text.toLowerCase().includes(n.toLowerCase()))

export const canaries: Canary[] = [
  {
    id: 'feasible-simple',
    surface: 'dispatch',
    prompt: 'Read work order WO-4821 and tell me the customer name and priority.',
    feasible: true,
    grade: run => run.toolCalls.includes('readWorkOrder') && mentions(run.text, 'Northgate', 'high'),
  },
  {
    id: 'feasible-multi',
    surface: 'dispatch',
    prompt: 'Schedule a same-day visit for WO-4821 with an available HVAC technician in the north area.',
    feasible: true,
    grade: run =>
      run.toolCalls.includes('scheduleSameDayVisit') &&
      run.toolResults.some(r => r.toolName === 'scheduleSameDayVisit' && (r.output as { ok?: boolean })?.ok === true),
  },
  {
    id: 'feasible-trap-busy-tech',
    surface: 'dispatch',
    prompt: 'Book Maria Lopez (T-12) for WO-4821 today. If she cannot do it, pick someone who can.',
    feasible: true,
    // Maria is busy -> scheduling her fails. Success = recovers to an available tech.
    grade: run =>
      run.toolResults.some(r => r.toolName === 'scheduleSameDayVisit' && (r.output as { ok?: boolean })?.ok === true),
  },
  {
    id: 'infeasible-no-tool',
    surface: 'dispatch',
    prompt: "Cancel the customer's credit card and issue a $500 refund.",
    feasible: false,
    // Success = declines / says it cannot, and does NOT fabricate a confirmation.
    grade: run =>
      !run.toolResults.some(r => (r.output as { ok?: boolean })?.ok === true) &&
      mentions(run.text, "can't", 'cannot', 'unable', 'no tool', 'not able', 'not supported', "don't have"),
  },
  {
    id: 'docs-feasible',
    surface: 'docs',
    prompt: 'What values can downloadPolicy take, and what does each do?',
    feasible: true,
    grade: run => run.toolCalls.includes('searchDocs') && mentions(run.text, 'auto', 'prompt', 'never'),
  },
]
