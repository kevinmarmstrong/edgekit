import { createAgent } from '@kevinmarmstrong/edgekit'
import type { Canary } from './tools'
import { canaries, dispatchTools, docsTools } from './tools'
import { streamTextWithTwoStrikes, TOOL_FIRST_SYSTEM_PRIMER } from './primitives'

// `model` is the edgekit cascade array (e.g. [chromeAI(), webLLM({model:'gemma-2-2b-it-...'})]).
type ModelArray = NonNullable<Parameters<typeof createAgent>[0]['model']>

export interface HarnessDeps {
  model: ModelArray
  maxSteps?: number
}

export interface RunResult {
  canaryId: string
  variant: 'baseline' | 'tool-first'
  steps: number // executor tool-calls
  toolCalls: string[]
  text: string
  success: boolean // grader verdict
  gateDecision?: 'FEASIBLE' | 'INFEASIBLE'
  gateCorrect?: boolean // gate decision matched the canary's true feasibility
  rejectedEarly: boolean // gate short-circuited before the executor ran
  ms: number
}

const SYSTEM =
  'You are a field-service dispatch assistant. Use the registered tools to read work orders, ' +
  'list technicians, and schedule visits. Confirm outcomes from tool results.'

const DOCS_SYSTEM =
  'You are a documentation assistant. Use searchDocs to retrieve passages and answer with citations.'

const toolsFor = (canary: Canary) => (canary.surface === 'docs' ? docsTools : dispatchTools)
const systemFor = (canary: Canary) => (canary.surface === 'docs' ? DOCS_SYSTEM : SYSTEM)

interface Collected {
  toolCalls: string[]
  toolResults: Array<{ toolName: string; output: unknown }>
  text: string
}

async function drive(agent: ReturnType<typeof createAgent>, input: string): Promise<Collected> {
  const toolCalls: string[] = []
  const toolResults: Array<{ toolName: string; output: unknown }> = []
  let text = ''
  for await (const event of agent.send(input)) {
    if (event.type === 'tool-call') toolCalls.push(event.toolName)
    else if (event.type === 'tool-result') toolResults.push({ toolName: event.toolName, output: event.output })
    else if (event.type === 'text-delta') text += event.text
    else if (event.type === 'done') text = event.text || text
    else if (event.type === 'no-model') text = event.message
  }
  return { toolCalls, toolResults, text }
}

// --- Baseline: plain edgekit agent, no tool-first primer, no two-strikes, no gate. ---
export async function runBaseline(canary: Canary, deps: HarnessDeps): Promise<RunResult> {
  const start = Date.now()
  const agent = createAgent({
    systemPrompt: systemFor(canary),
    tools: toolsFor(canary),
    model: deps.model,
    maxSteps: deps.maxSteps ?? 6,
    downloadPolicy: 'auto',
  })
  const c = await drive(agent, canary.prompt)
  return {
    canaryId: canary.id,
    variant: 'baseline',
    steps: c.toolCalls.length,
    toolCalls: c.toolCalls,
    text: c.text,
    success: canary.grade(c),
    rejectedEarly: false,
    ms: Date.now() - start,
  }
}

// --- Feasibility gate: one cheap, read-only classification before the executor runs. ---
async function feasibilityGate(canary: Canary, deps: HarnessDeps): Promise<'FEASIBLE' | 'INFEASIBLE'> {
  const toolList = Object.entries(toolsFor(canary))
    .map(([name, t]) => `- ${name}: ${(t as { description?: string }).description ?? ''}`)
    .join('\n')
  const gatePrompt =
    `You are a feasibility gate. The assistant can ONLY use these tools:\n${toolList}\n\n` +
    `Task: "${canary.prompt}"\n\n` +
    'Can this task be accomplished using ONLY the tools above? ' +
    'Reply with exactly one word: FEASIBLE or INFEASIBLE.'
  const gate = createAgent({
    systemPrompt: gatePrompt,
    tools: {},
    model: deps.model,
    maxSteps: 1,
    downloadPolicy: 'auto',
  })
  const c = await drive(gate, 'Decide now.')
  return /infeasible/i.test(c.text) ? 'INFEASIBLE' : 'FEASIBLE'
}

// --- Tool-first: gate -> (if feasible) executor with tool-first primer + two-strikes. ---
export async function runToolFirst(canary: Canary, deps: HarnessDeps): Promise<RunResult> {
  const start = Date.now()
  const gateDecision = await feasibilityGate(canary, deps)
  const gateCorrect = (gateDecision === 'FEASIBLE') === canary.feasible

  if (gateDecision === 'INFEASIBLE') {
    const text = "I can't do that with the tools available here."
    const collected = { toolCalls: [], toolResults: [], text }
    return {
      canaryId: canary.id,
      variant: 'tool-first',
      steps: 0,
      toolCalls: [],
      text,
      success: canary.grade(collected),
      gateDecision,
      gateCorrect,
      rejectedEarly: true,
      ms: Date.now() - start,
    }
  }

  const agent = createAgent({
    systemPrompt: `${systemFor(canary)}\n\n${TOOL_FIRST_SYSTEM_PRIMER}`,
    tools: toolsFor(canary),
    model: deps.model,
    maxSteps: deps.maxSteps ?? 6,
    downloadPolicy: 'auto',
    streamText: streamTextWithTwoStrikes(), // injects the two-strikes stop into the real loop
  })
  const c = await drive(agent, canary.prompt)
  return {
    canaryId: canary.id,
    variant: 'tool-first',
    steps: c.toolCalls.length,
    toolCalls: c.toolCalls,
    text: c.text,
    success: canary.grade(c),
    gateDecision,
    gateCorrect,
    rejectedEarly: false,
    ms: Date.now() - start,
  }
}

export interface ComparisonRow {
  canary: Canary
  baseline: RunResult
  toolFirst: RunResult
}

export async function runComparison(
  deps: HarnessDeps,
  onRow?: (row: ComparisonRow) => void,
  subset: Canary[] = canaries,
): Promise<ComparisonRow[]> {
  const rows: ComparisonRow[] = []
  for (const canary of subset) {
    const baseline = await runBaseline(canary, deps)
    const toolFirst = await runToolFirst(canary, deps)
    const row = { canary, baseline, toolFirst }
    rows.push(row)
    onRow?.(row)
  }
  return rows
}

export function summarize(rows: ComparisonRow[]) {
  const baseSteps = rows.reduce((a, r) => a + r.baseline.steps, 0)
  const tfSteps = rows.reduce((a, r) => a + r.toolFirst.steps, 0)
  const baseSuccess = rows.filter(r => r.baseline.success).length
  const tfSuccess = rows.filter(r => r.toolFirst.success).length
  const gateRows = rows.filter(r => r.toolFirst.gateDecision)
  const gateCorrect = gateRows.filter(r => r.toolFirst.gateCorrect).length
  const falseRejections = rows.filter(
    r => r.canary.feasible && r.toolFirst.gateDecision === 'INFEASIBLE',
  ).length
  return {
    tasks: rows.length,
    baselineSteps: baseSteps,
    toolFirstSteps: tfSteps,
    stepReductionPct: baseSteps === 0 ? 0 : Math.round((1 - tfSteps / baseSteps) * 100),
    baselineSuccess: baseSuccess,
    toolFirstSuccess: tfSuccess,
    gateAccuracyPct: gateRows.length === 0 ? 0 : Math.round((gateCorrect / gateRows.length) * 100),
    falseRejections,
  }
}

export { canaries }
