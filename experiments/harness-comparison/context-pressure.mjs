// Non-circular, no-browser measurement: how fast does the executor transcript grow
// against the small-model context budgets edgekit targets (DESIGN.md cites "2K-8K tokens")?
// Uses the exact estimateTokens formula from packages/core/src/shared.ts (ceil(len/4)).
// Run: node context-pressure.mjs
const estimateTokens = (v) => Math.max(1, Math.ceil((typeof v === 'string' ? v : JSON.stringify(v)).length / 4))
const B_LO = 2000, B_HI = 8000, THRESHOLD = 2000

function session({ system, turns, summaryTokens, withCompaction }) {
  let history = []
  const perTurn = []
  for (const t of turns) {
    if (withCompaction && estimateTokens(history) > THRESHOLD) {
      history = [{ role: 'system', content: '<<rolling summary>>', __tok: summaryTokens }]
    }
    history.push({ role: 'user', content: t.user })
    for (const s of t.steps ?? []) {
      if (s.call) history.push({ role: 'assistant', content: [{ type: 'tool-call', toolName: s.call[0], input: s.call[1] }] })
      if (s.result) history.push({ role: 'tool', content: [{ type: 'tool-result', output: s.result }] })
    }
    history.push({ role: 'assistant', content: [{ type: 'text', text: t.assistant }] })
    const tok = history.reduce((a, m) => a + (m.__tok ?? estimateTokens(m)), 0)
    perTurn.push(estimateTokens(system) + tok)
  }
  return perTurn
}

function report(label, system, turns, summaryTokens) {
  const base = session({ system, turns, summaryTokens, withCompaction: false })
  const comp = session({ system, turns, summaryTokens, withCompaction: true })
  console.log(`\n=== ${label} ===`)
  console.log('turn | no-compaction | with-compaction | over 2K budget?')
  base.forEach((b, i) => {
    console.log(`  ${i + 1}  |   ${String(b).padStart(6)}      |    ${String(comp[i]).padStart(6)}       | ${b > B_LO ? 'OVER' : 'ok'}`)
  })
  const red = Math.round((1 - comp.at(-1) / base.at(-1)) * 100)
  console.log(`final: no-compaction=${base.at(-1)} tok, with-compaction=${comp.at(-1)} tok -> ${red}% reduction`)
  console.log(`crosses 2K at turn ${base.findIndex(t => t > B_LO) + 1 || 'never'}, 8K at turn ${base.findIndex(t => t > B_HI) + 1 || 'never'} (no-compaction)`)
}

// --- Surface A: transactional dispatch board (compact payloads). ---
const wo = { id: 'WO-4821', customer: 'Northgate Medical', priority: 'high', issue: 'RTU-3 no cooling, fault E4', sla: '4h' }
const techs = { results: Array.from({ length: 6 }, (_, i) => ({ id: `T-${i}`, name: `Tech ${i}`, skills: ['HVAC'], status: i % 2 ? 'available' : 'on-job', loc: `${i}.${i}mi` })) }
const dispatch = [
  { user: 'Schedule a same-day visit for WO-4821.', steps: [{ call: ['readWorkOrder', { id: 'WO-4821' }], result: wo }, { call: ['listTechnicians', { skill: 'HVAC' }], result: techs }], assistant: 'WO-4821 is high priority (4h SLA). Devon (T-1) is available now — book the 13:00-15:00 window?' },
  { user: 'Is anyone closer?', steps: [{ call: ['listTechnicians', { id: 'T-3' }], result: { id: 'T-3', status: 'available', loc: '1.1mi' } }], assistant: 'T-3 is 1.1mi and available; want T-3 instead?' },
  { user: 'Yes, book T-3.', steps: [{ call: ['scheduleSameDayVisit', { workOrder: 'WO-4821', technician: 'T-3' }], result: { ok: true, confirmation: 'VISIT-1' } }], assistant: 'Booked T-3, confirmation VISIT-1. Customer notified.' },
  { user: 'Does T-3 carry the E4 parts?', steps: [{ call: ['listTechnicians', { id: 'T-3', detail: 'inventory' }], result: { van: 'stocked', parts: ['capacitor', 'contactor'], missing: ['compressor module'] } }], assistant: 'Stocked for most E4 faults; missing the compressor module. Flag a parts run?' },
  { user: 'Flag it and add a backup.', steps: [{ call: ['scheduleSameDayVisit', { workOrder: 'WO-4821', technician: 'T-5', role: 'backup' }], result: { ok: true, confirmation: 'VISIT-2' } }], assistant: 'Backup T-5 on standby (VISIT-2); parts run flagged.' },
  { user: 'Summarize for handoff.', steps: [], assistant: 'WO-4821: primary T-3 13:00-15:00 (VISIT-1), backup T-5 (VISIT-2), parts run flagged. Within SLA.' },
]
report('Surface A — dispatch board (compact payloads)', 'You are a dispatch assistant. Use tools; confirm from results.', dispatch, 120)

// --- Surface B: documentation / RAG (heavy payloads). ---
const chunk = (n) => ({ id: `doc-${n}`, title: `Section ${n}`, text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo. '.repeat(2) })
const search = (q) => ({ query: q, results: [chunk(1), chunk(2), chunk(3), chunk(4), chunk(5)] })
const rag = ['download policy', 'model cascade', 'strict grounding', 'server fallback', 'tool approval', 'no model available'].map((q) => ({
  user: `How does ${q} work?`,
  steps: [{ call: ['searchDocs', { query: q }], result: search(q) }],
  assistant: `Based on retrieved sections, here is the answer about ${q} [doc-1][doc-2].`,
}))
report('Surface B — docs/RAG (heavy payloads)', 'You are a docs assistant. Use searchDocs; cite passages.', rag, 140)

console.log('\nTakeaway: compaction is ~0% on compact transactional surfaces and decisive only when tool OUTPUTS are large.')
