import { chromeAI, webLLM } from '@kevinmarmstrong/edgekit'
import { canaries, runComparison, summarize, type ComparisonRow } from './harnesses'

const GEMMA_WEBLLM = 'gemma-2-2b-it-q4f16_1-MLC' // ~1.4GB, verified in @mlc-ai/web-llm 0.2.83 registry

const $ = (id: string) => document.getElementById(id)!
const statusEl = $('status')
const resultsEl = $('results')
const summaryEl = $('summary')

function setStatus(html: string) {
  statusEl.innerHTML = html
}

async function detectCapabilities() {
  let chrome = false
  let webgpu = false
  try {
    const { doesBrowserSupportBrowserAI } = await import('@browser-ai/core')
    chrome = doesBrowserSupportBrowserAI()
  } catch {
    /* not installed in this context */
  }
  try {
    const { doesBrowserSupportWebLLM } = await import('@browser-ai/web-llm')
    webgpu = doesBrowserSupportWebLLM()
  } catch {
    /* ignore */
  }
  return { chrome, webgpu }
}

function modelArray(prefer: 'chrome' | 'webllm') {
  const gemmaWebLLM = webLLM({ model: GEMMA_WEBLLM, modelSize: '~1.4 GB' })
  // Chrome AI (Gemini Nano) is Gemma-family and downloads on first gesture.
  return prefer === 'chrome' ? [chromeAI(), gemmaWebLLM] : [gemmaWebLLM]
}

function cell(ok: boolean | undefined, text: string) {
  const color = ok === undefined ? '#888' : ok ? '#1a7f37' : '#cf222e'
  return `<span style="color:${color};font-weight:600">${text}</span>`
}

function renderRow(row: ComparisonRow) {
  const { canary, baseline, toolFirst } = row
  const div = document.createElement('div')
  div.className = 'row'
  div.innerHTML = `
    <h3>${canary.id} <small>(${canary.feasible ? 'feasible' : 'infeasible'} · ${canary.surface})</small></h3>
    <div class="prompt">${canary.prompt}</div>
    <div class="cols">
      <div class="col">
        <strong>Baseline</strong><br>
        steps: ${baseline.steps} · ${cell(baseline.success, baseline.success ? 'PASS' : 'FAIL')} · ${baseline.ms}ms<br>
        <code>${baseline.toolCalls.join(' → ') || '(no tools)'}</code>
        <div class="text">${baseline.text.slice(0, 240)}</div>
      </div>
      <div class="col">
        <strong>Tool-first</strong><br>
        gate: ${cell(toolFirst.gateCorrect, toolFirst.gateDecision ?? '—')}${toolFirst.rejectedEarly ? ' (early reject)' : ''}<br>
        steps: ${toolFirst.steps} · ${cell(toolFirst.success, toolFirst.success ? 'PASS' : 'FAIL')} · ${toolFirst.ms}ms<br>
        <code>${toolFirst.toolCalls.join(' → ') || '(no tools)'}</code>
        <div class="text">${toolFirst.text.slice(0, 240)}</div>
      </div>
    </div>`
  resultsEl.appendChild(div)
}

function renderSummary(rows: ComparisonRow[]) {
  const s = summarize(rows)
  summaryEl.innerHTML = `
    <h2>Summary (${s.tasks} tasks)</h2>
    <ul>
      <li>Steps: baseline ${s.baselineSteps} → tool-first ${s.toolFirstSteps}
          (<strong>${s.stepReductionPct}% reduction</strong>)</li>
      <li>Success: baseline ${s.baselineSuccess}/${s.tasks} → tool-first ${s.toolFirstSuccess}/${s.tasks}</li>
      <li>Feasibility gate accuracy: <strong>${s.gateAccuracyPct}%</strong></li>
      <li>False rejections (gate blocked a feasible task): ${cell(s.falseRejections === 0, String(s.falseRejections))}</li>
    </ul>
    <p class="decide">Decision criterion: promote a primitive to core if step reduction ≥15%
       <em>and</em> false rejections == 0 <em>and</em> success does not regress.</p>`
}

async function run() {
  resultsEl.innerHTML = ''
  summaryEl.innerHTML = ''
  const prefer = (document.querySelector('input[name="provider"]:checked') as HTMLInputElement)?.value as
    | 'chrome'
    | 'webllm'
  setStatus(`Loading model (${prefer === 'chrome' ? 'Chrome AI / Gemini Nano, else WebLLM Gemma' : `WebLLM ${GEMMA_WEBLLM}`})… first run downloads weights and can take minutes.`)
  try {
    const rows = await runComparison(
      { model: modelArray(prefer), maxSteps: 6 },
      row => renderRow(row),
    )
    renderSummary(rows)
    setStatus('Done.')
  } catch (err) {
    setStatus(`<span style="color:#cf222e">Run failed: ${(err as Error).message}</span>`)
    throw err
  }
}

async function init() {
  const caps = await detectCapabilities()
  setStatus(
    `Chrome AI (Gemini Nano): ${cell(caps.chrome, caps.chrome ? 'available' : 'not detected')} · ` +
      `WebGPU (WebLLM): ${cell(caps.webgpu, caps.webgpu ? 'available' : 'not detected')}` +
      (!caps.chrome && !caps.webgpu
        ? '<br><strong style="color:#cf222e">No local model backend detected — open in Chrome with WebGPU / Chrome AI enabled.</strong>'
        : ''),
  )
  $('runBtn').addEventListener('click', () => void run())
  // Pre-select whichever backend is available.
  if (!caps.chrome && caps.webgpu) (document.querySelector('input[value="webllm"]') as HTMLInputElement).checked = true
  $('taskCount').textContent = String(canaries.length)
}

void init()
