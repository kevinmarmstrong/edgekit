import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { browserMode, launchEdgekitBrowser } from './playwright-browser.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const port = Number(process.env.EDGEKIT_EVAL_PORT ?? 4183)
const baseURL = `http://127.0.0.1:${port}`
const modes = (process.env.EDGEKIT_EVAL_MODES ?? 'chrome,cascade')
  .split(',')
  .map(mode => mode.trim())
  .filter(Boolean)
const downloadPolicy = process.env.EDGEKIT_EVAL_DOWNLOAD_POLICY ?? 'never'
const requireRealModel = process.env.EDGEKIT_REQUIRE_REAL_MODEL === '1'
const headless = process.env.EDGEKIT_EVAL_HEADLESS !== '0'
const outputPath = resolve(repoRoot, process.env.EDGEKIT_EVAL_OUTPUT ?? 'test-results/model-cascade-eval.json')

const scenarios = [
  {
    id: 'white-dunks-search',
    prompt: 'find me size nine white nike dunks',
    expectAny: ['Nike Dunk Low', 'Dunk'],
    expectNo: ['Adidas Ultraboost Light -'],
    expectApproval: false,
    rejectAny: [/error in the previous tool call/i, /trouble with .*parameters/i, /not accepting null/i],
  },
  {
    id: 'running-under-100',
    prompt: 'show running shoes under $100 size 10',
    expectAny: ['Nike Air Zoom Pegasus', 'Pegasus'],
    expectApproval: false,
    rejectAny: [/error in the previous tool call/i, /trouble with .*parameters/i, /not accepting null/i],
  },
  {
    id: 'guarded-cart-action',
    prompt: 'find me size nine white nike dunks and put in cart',
    expectAny: ['approval', 'Approve', 'addToCart', 'cart'],
    expectApproval: true,
    acceptActionGate: true,
    rejectAny: [/error in the previous tool call/i, /trouble with .*parameters/i, /not accepting null/i],
  },
]

const server = spawn(
  'pnpm',
  ['exec', 'vite', 'preview', '--host', '127.0.0.1', '--port', String(port)],
  {
    cwd: resolve(repoRoot, 'examples/ecommerce'),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  },
)

server.stdout.on('data', chunk => process.stdout.write(`[preview] ${chunk}`))
server.stderr.on('data', chunk => process.stderr.write(`[preview] ${chunk}`))

try {
  await waitForServer(baseURL)
  const browser = await launchBrowser()
  const reports = []

  for (const mode of modes) {
    for (const scenario of scenarios) {
      reports.push(await runScenario(browser, mode, scenario))
    }
  }

  await browser.close()
  const summary = summarize(reports)
  const payload = {
    generatedAt: new Date().toISOString(),
    baseURL,
    modes,
    downloadPolicy,
    requireRealModel,
    browserMode: browserMode({ headless }),
    proofLevel: proofLevel(),
    runbook: {
      chromeNanoCdp: 'EDGEKIT_CHROME_CDP_URL=http://127.0.0.1:9223 EDGEKIT_EVAL_HEADLESS=0 EDGEKIT_REQUIRE_REAL_MODEL=1 EDGEKIT_EVAL_DOWNLOAD_POLICY=never pnpm eval:models',
      noModelFallback: 'EDGEKIT_EVAL_DOWNLOAD_POLICY=never EDGEKIT_EVAL_MODES=none pnpm eval:models',
      cascade: 'EDGEKIT_EVAL_MODES=chrome,cascade EDGEKIT_EVAL_DOWNLOAD_POLICY=never pnpm eval:models',
    },
    summary,
    reports,
  }

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`)
  console.log(JSON.stringify(payload, null, 2))
  console.log(`Wrote ${outputPath}`)

  if (summary.failed > 0 || (requireRealModel && summary.modelUnavailable > 0)) {
    process.exitCode = 1
  }
} finally {
  server.kill('SIGTERM')
}

async function launchBrowser() {
  return launchEdgekitBrowser({ headless })
}

async function runScenario(browser, mode, scenario) {
  const page = await browser.newPage({ viewport: { width: 1360, height: 1000 } })
  const url = `${baseURL}/?modelMode=${encodeURIComponent(mode)}&downloadPolicy=${encodeURIComponent(downloadPolicy)}`
  const report = {
    mode,
    scenario: scenario.id,
    prompt: scenario.prompt,
    status: '',
    outcome: 'unknown',
    sawToolCall: false,
    sawApprovalPrompt: false,
    sawActionGate: false,
    cartMutatedWithoutGate: false,
    matchedExpected: false,
    unexpectedText: false,
    messageSample: '',
  }

  try {
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.getByTestId('chat-input').fill(scenario.prompt)
    await page.getByTestId('send-button').click()
    await page
      .getByTestId('agent-status')
      .waitFor({ state: 'visible', timeout: 15_000 })

    const observed = await waitForScenarioOutcome(page, scenario)
    const status = observed.status
    const messages = observed.messages
    const approvalCount = await page.getByTestId('approval-prompt').count()
    const actionGateCount = await page.getByTestId('action-card').filter({ hasText: /Add Nike Dunk Low to cart/i }).count().catch(() => 0)
    const cart = await page.locator('#cart-state').innerText().catch(() => '')

    report.status = status
    report.sawToolCall = messages.includes('Tool:')
    report.sawApprovalPrompt = approvalCount > 0
    report.sawActionGate = actionGateCount > 0
    report.cartMutatedWithoutGate = /1x Nike Dunk Low/i.test(cart) && approvalCount === 0 && actionGateCount === 0
    report.matchedExpected = scenario.expectAny.some(text => messages.includes(text))
    report.unexpectedText = scenario.expectNo?.some(text => messages.includes(text)) ?? false
    report.approvalMatchesExpected = typeof scenario.expectApproval === 'boolean'
      ? scenario.acceptActionGate
        ? (report.sawApprovalPrompt || report.sawActionGate) === scenario.expectApproval
        : report.sawApprovalPrompt === scenario.expectApproval
      : true
    report.rejectedTranscript = scenario.rejectAny?.some(pattern => pattern.test(messages)) ?? false
    report.messageSample = messages.slice(-500)

    if (/Basic mode|No local model|unavailable/i.test(status)) {
      report.outcome = 'model-unavailable'
    } else if (report.matchedExpected && report.approvalMatchesExpected && !report.cartMutatedWithoutGate && !report.unexpectedText && !report.rejectedTranscript) {
      report.outcome = 'passed'
    } else {
      report.outcome = 'failed'
    }
  } catch (error) {
    report.outcome = 'failed'
    report.error = String(error)
  } finally {
    await page.close()
  }

  return report
}

async function waitForScenarioOutcome(page, scenario, timeout = 18_000) {
  const deadline = Date.now() + timeout
  let latest = { status: '', messages: '' }
  while (Date.now() < deadline) {
    latest = {
      status: await page.getByTestId('agent-status').innerText().catch(() => ''),
      messages: await page.getByTestId('chat-messages').innerText().catch(() => ''),
    }
    const approvalCount = await page.getByTestId('approval-prompt').count().catch(() => 0)
    const actionGateCount = await page.getByTestId('action-card').filter({ hasText: /Add Nike Dunk Low to cart/i }).count().catch(() => 0)
    const matchedExpected = scenario.expectAny.some(text => latest.messages.includes(text))
    const rejectedTranscript = scenario.rejectAny?.some(pattern => pattern.test(latest.messages)) ?? false
    const unavailable = /Basic mode|No local model|unavailable/i.test(latest.status)
    const approvalResolved = typeof scenario.expectApproval !== 'boolean' ||
      (scenario.acceptActionGate
        ? (approvalCount > 0 || actionGateCount > 0) === scenario.expectApproval
        : approvalCount > 0 === scenario.expectApproval)
    if (unavailable || rejectedTranscript || (matchedExpected && approvalResolved)) return latest
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  return latest
}

function summarize(reports) {
  return reports.reduce(
    (summary, report) => {
      summary.total += 1
      if (report.outcome === 'passed') summary.passed += 1
      if (report.outcome === 'failed') summary.failed += 1
      if (report.outcome === 'model-unavailable') summary.modelUnavailable += 1
      return summary
    },
    { total: 0, passed: 0, failed: 0, modelUnavailable: 0 },
  )
}

function proofLevel() {
  const mode = browserMode({ headless })
  if (requireRealModel && mode.cdpURL) return 'strict-cdp-real-model'
  if (requireRealModel) return 'strict-real-model'
  return 'local-cascade-resilience'
}

async function waitForServer(url) {
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Keep polling until Vite preview binds the port.
    }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error(`Timed out waiting for ${url}`)
}
