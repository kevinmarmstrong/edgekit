import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { browserMode, launchEdgekitBrowser } from './playwright-browser.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const target = process.env.EDGEKIT_RESEARCH_TARGET ?? 'local'
const strict = process.env.EDGEKIT_RESEARCH_STRICT !== '0'
const headless = process.env.EDGEKIT_RESEARCH_HEADLESS !== '0'
const siteURL = stripTrailingSlash(
  process.env.EDGEKIT_RESEARCH_SITE_URL ??
    (target === 'live' ? 'https://kevinmarmstrong.github.io/edgekit' : 'http://127.0.0.1:4174/edgekit'),
)
const ecommerceURL = stripTrailingSlash(process.env.EDGEKIT_RESEARCH_ECOMMERCE_URL ?? 'http://127.0.0.1:4173')
const outputPath = resolve(repoRoot, process.env.EDGEKIT_RESEARCH_OUTPUT ?? 'research-results/agent-research-loop.json')
const markdownPath = outputPath.replace(/\.json$/i, '.md')
const screenshotDir = resolve(
  repoRoot,
  process.env.EDGEKIT_RESEARCH_SCREENSHOTS ??
    `research-results/screenshots/${new Date().toISOString().replace(/[:.]/g, '-')}`,
)

const ownedServers = []
const scenarios = [
  {
    id: 'public-ecommerce-catalog-answer',
    title: 'Public ecommerce external demo handoff',
    required: true,
    run: runPublicEcommerceCatalog,
  },
  {
    id: 'public-ecommerce-action-card',
    title: 'Public ecommerce external demo repo handoff',
    required: true,
    run: runPublicEcommerceActionCard,
  },
  {
    id: 'public-ecommerce-running-shoes',
    title: 'Public ecommerce local-model caveat handoff',
    required: true,
    run: runPublicEcommerceRunningShoes,
  },
  {
    id: 'standalone-ecommerce-approval',
    title: 'Standalone ecommerce guarded add-to-cart',
    required: target !== 'live',
    skipReason: target === 'live' ? 'Standalone ecommerce preview is local-only.' : '',
    run: runStandaloneEcommerceApproval,
  },
  {
    id: 'standalone-ecommerce-action-card',
    title: 'Standalone ecommerce action card',
    required: target !== 'live',
    skipReason: target === 'live' ? 'Standalone ecommerce preview is local-only.' : '',
    run: runStandaloneEcommerceActionCard,
  },
  {
    id: 'docs-qa-token-cost',
    title: 'Docs Q&A answers token-cost question',
    required: true,
    run: runDocsQa,
  },
  {
    id: 'site-assistant-demos',
    title: 'Site assistant exposes demos',
    required: true,
    run: runSiteAssistant,
  },
  {
    id: 'ag-ui-rich-components',
    title: 'AG-UI rich component loop',
    required: true,
    run: runAgUi,
  },
  {
    id: 'admin-approval-contract',
    title: 'Admin approval contract',
    required: true,
    run: runAdminApproval,
  },
  {
    id: 'admin-reject-safety',
    title: 'Admin rejection preserves state',
    required: true,
    run: runAdminReject,
  },
  {
    id: 'mission-control-observability',
    title: 'Mission control observability',
    required: true,
    run: runMissionControl,
  },
  {
    id: 'agent-readable-docs',
    title: 'Agent-readable documentation exports',
    required: true,
    run: runAgentReadableDocs,
  },
]

try {
  if (target === 'local') {
    await ensureServer({
      url: `${ecommerceURL}/`,
      label: 'ecommerce',
      cwd: resolve(repoRoot, 'examples/ecommerce'),
      cmd: 'pnpm',
      args: ['exec', 'vite', 'preview', '--host', '127.0.0.1', '--port', '4173'],
    })
    await ensureServer({
      url: `${siteURL}/`,
      label: 'site',
      cwd: resolve(repoRoot, 'site'),
      cmd: 'pnpm',
      args: ['exec', 'vite', 'preview', '--host', '127.0.0.1', '--port', '4174'],
    })
  }

  const browser = await launchBrowser()
  const results = []

  for (const scenario of scenarios) {
    if (scenario.skipReason) {
      results.push({
        id: scenario.id,
        title: scenario.title,
        required: scenario.required,
        outcome: 'skipped',
        score: 0,
        durationMs: 0,
        checks: [],
        transcript: '',
        notes: scenario.skipReason,
      })
      continue
    }

    results.push(await runScenario(browser, scenario))
  }

  await browser.close()

  const summary = summarize(results)
  const payload = {
    generatedAt: new Date().toISOString(),
    target,
    siteURL,
    ecommerceURL: target === 'live' ? null : ecommerceURL,
    strict,
    browserMode: browserMode({ headless }),
    summary,
    results,
  }

  await mkdir(dirname(outputPath), { recursive: true })
  await mkdir(screenshotDir, { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`)
  await writeFile(markdownPath, renderMarkdown(payload))

  console.log(JSON.stringify(payload.summary, null, 2))
  console.log(`Wrote ${outputPath}`)
  console.log(`Wrote ${markdownPath}`)
  console.log(`Screenshots: ${screenshotDir}`)

  if (strict && summary.requiredFailed > 0) process.exitCode = 1
} finally {
  await Promise.allSettled(ownedServers.map(server => stopServer(server)))
}

async function runScenario(browser, scenario) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } })
  const startedAt = Date.now()
  const checks = []
  let transcript = ''
  let screenshot = ''
  let notes = ''

  try {
    transcript = await scenario.run(page, checks)
  } catch (error) {
    checks.push({
      category: 'runtime',
      label: 'scenario completed without throwing',
      passed: false,
      details: error instanceof Error ? error.message : String(error),
    })
    notes = error instanceof Error ? error.stack ?? error.message : String(error)
  } finally {
    screenshot = await saveScreenshot(page, scenario.id).catch(error => `screenshot failed: ${String(error)}`)
    await page.close()
  }

  const passed = checks.filter(check => check.passed).length
  const total = checks.length
  const failedRequiredCheck = checks.some(check => !check.passed && check.required !== false)
  const outcome = failedRequiredCheck ? 'failed' : 'passed'

  return {
    id: scenario.id,
    title: scenario.title,
    required: scenario.required,
    outcome,
    score: total === 0 ? 0 : round(passed / total),
    durationMs: Date.now() - startedAt,
    checks,
    transcript: compactText(transcript),
    screenshot,
    notes,
  }
}

async function runPublicEcommerceCatalog(page, checks) {
  await page.goto(withCacheBust(`${siteURL}/demos/ecommerce/`), { waitUntil: 'networkidle' })
  return checkExternalEcommerceBridge(page, checks)
}

async function runPublicEcommerceActionCard(page, checks) {
  await page.goto(withCacheBust(`${siteURL}/demos/ecommerce/?commerceAgentMode=scripted`), { waitUntil: 'networkidle' })
  return checkExternalEcommerceBridge(page, checks)
}

async function runPublicEcommerceRunningShoes(page, checks) {
  await page.goto(withCacheBust(`${siteURL}/demos/ecommerce/`), { waitUntil: 'networkidle' })
  return checkExternalEcommerceBridge(page, checks)
}

async function checkExternalEcommerceBridge(page, checks) {
  const bridge = page.locator('#ecommerce')
  await waitForContains(bridge, 'The ecommerce demo now runs outside the monorepo.')
  const text = await bridge.innerText()
  const externalLink = bridge.getByRole('link', { name: 'Open external ecommerce demo' })
  const href = await externalLink.getAttribute('href')

  addCheck(checks, 'workflowState', 'site route points to external packed-package demo', href === 'https://edgekit-demo-ecommerce.pages.dev/')
  addCheck(checks, 'transparency', 'route discloses monorepo demo retirement', /no longer hosts the duplicate ecommerce agent runtime/i.test(text))
  addCheck(checks, 'transparency', 'route discloses fallback no-model Pages limitation', /fallback\/no-model proof|COOP\/COEP/i.test(text))
  addCheck(checks, 'safety', 'retired site route no longer mounts duplicate chat runtime', (await bridge.locator('edge-chat').count()) === 0)
  return text
}

async function runStandaloneEcommerceApproval(page, checks) {
  await page.goto(`${ecommerceURL}/?agentMode=scripted`, { waitUntil: 'networkidle' })
  await sendPrompt(page, 'find me size nine white nike dunks and put in cart')
  await waitForContains(page.getByTestId('approval-prompt'), 'addToCart')
  const approval = await page.getByTestId('approval-prompt').innerText()
  addCheck(checks, 'workflowState', 'approval uses addToCart tool', /addToCart/i.test(approval))
  addCheck(checks, 'workflowState', 'approval preserved product id', /dunk/i.test(approval))
  addCheck(checks, 'workflowState', 'approval preserved requested size', /"9"|size.*9|9/i.test(approval))
  await page.getByTestId('approve-button').click()
  await waitForContains(page.locator('#cart-state'), '1x Nike Dunk Low (size 9)')
  const text = await page.getByTestId('chat-messages').innerText()
  const cart = await page.locator('#cart-state').innerText()
  addCheck(checks, 'safety', 'mutation happens after approval', /1x Nike Dunk Low \(size 9\)/i.test(cart))
  addCheck(checks, 'answerQuality', 'final answer confirms the exact approved item', /Nike Dunk Low.*size 9/i.test(text))
  return `${approval}\n\n${text}\n\nCart: ${cart}`
}

async function runStandaloneEcommerceActionCard(page, checks) {
  await page.goto(`${ecommerceURL}/?agentMode=scripted`, { waitUntil: 'networkidle' })
  await sendPrompt(page, 'how much are Nike dunks and what sizes are carried?')
  await waitForContains(page.getByTestId('action-card'), 'Add Nike Dunk Low to cart')
  const card = await page.getByTestId('action-card').innerText()
  addCheck(checks, 'generativeUi', 'renders a user-fillable action card', /Add Nike Dunk Low to cart/i.test(card))
  addCheck(checks, 'safety', 'does not ask for extra chat confirmation before showing the action', (await page.getByTestId('approval-prompt').count()) === 0)
  await page.getByTestId('action-field-size').selectOption('11')
  await page.getByTestId('action-run-button').click()
  await waitForContains(page.locator('#cart-state'), '1x Nike Dunk Low (size 11)')
  const text = await page.getByTestId('chat-messages').innerText()
  const cart = await page.locator('#cart-state').innerText()
  addCheck(checks, 'workflowState', 'selected form value drives the mutation', /size 11/i.test(cart))
  addCheck(checks, 'answerQuality', 'answer acknowledges the app-owned action result', /Added Nike Dunk Low/i.test(text))
  return `${card}\n\n${text}\n\nCart: ${cart}`
}

async function runDocsQa(page, checks) {
  await page.goto(withCacheBust(`${siteURL}/demos/docs/`), { waitUntil: 'networkidle' })
  const docsDemo = page.locator('#qa')
  await sendPrompt(docsDemo, 'what problem does edgekit solve for token costs?')
  const messages = docsDemo.getByTestId('chat-messages')
  await waitForContains(messages, /token|cost|cloud/i)
  const text = await messages.innerText()
  addCheck(checks, 'answerQuality', 'answers the token-cost question directly', /token|cost|cloud/i.test(text))
  addCheck(checks, 'answerQuality', 'connects the answer to browser/local execution', /browser|local|edge/i.test(text))
  addCheck(checks, 'transparency', 'does not pretend to be a hosted SaaS support bot', !/subscription|sales team|book a demo/i.test(text))
  return text
}

async function runSiteAssistant(page, checks) {
  await page.goto(withCacheBust(`${siteURL}/demos/docs/`), { waitUntil: 'networkidle' })
  const assistant = page.locator('#site-assistant')
  await assistant.locator('.site-assistant-toggle').click()
  await sendPrompt(assistant, 'what demos can I try?')
  const messages = assistant.getByTestId('chat-messages')
  await waitForContains(messages, 'Mission control')
  const text = await messages.innerText()
  for (const demo of ['Ecommerce retrofit', 'Docs Q&A', 'AG-UI event stream', 'SaaS admin workflow', 'Mission control']) {
    addCheck(checks, 'answerQuality', `lists ${demo}`, text.includes(demo))
  }
  addCheck(checks, 'site-assistant', 'site-wide assistant is mounted on the docs demo page', (await assistant.count()) === 1)
  return text
}

async function runAgUi(page, checks) {
  await page.goto(withCacheBust(`${siteURL}/demos/ag-ui/`), { waitUntil: 'networkidle' })
  const agui = page.locator('#agui')
  await sendPrompt(agui, 'triage the support queue')
  await waitForVisible(agui.getByText('Open support queue'))
  const triageMessages = await agui.getByTestId('chat-messages').innerText()
  addCheck(checks, 'generativeUi', 'renders support queue table/card state', await isVisible(agui.getByText('Open support queue')))
  addCheck(
    checks,
    'generativeUi',
    'renders chart/table categories',
    (await isVisible(agui.locator('span').filter({ hasText: 'Billing' }))) &&
      (await isVisible(agui.locator('span').filter({ hasText: 'Orders' }))) &&
      (await isVisible(agui.locator('span').filter({ hasText: 'Returns' }))),
  )
  addCheck(checks, 'generativeUi', 'renders a fillable follow-up action', await isVisible(agui.getByText('Create a support ticket')))

  await sendPrompt(agui, 'what other components do you have for the UI?')
  await waitForVisible(agui.getByText('EdgeView component contract'))
  const components = await agui.getByTestId('chat-messages').innerText()
  for (const component of ['Text', 'Card', 'Form', 'Table', 'Chart']) {
    addCheck(
      checks,
      'generativeUi',
      `documents ${component} component`,
      await isVisible(agui.getByRole('cell', { name: component, exact: true })),
    )
  }

  await sendPrompt(agui, 'is this hardcoded?')
  await waitForVisible(agui.getByText('scripted AG-UI event source'))
  const transparency = await agui.getByTestId('chat-messages').innerText()
  addCheck(
    checks,
    'transparency',
    'discloses scripted public Pages stream',
    await isVisible(agui.getByText('scripted AG-UI event source')),
  )
  addCheck(
    checks,
    'integration',
    'points developers to createAgUiAgent integration',
    await isVisible(agui.getByText('createAgUiAgent({ endpoint })').first()),
  )
  return `${triageMessages}\n\n${components}\n\n${transparency}`
}

async function runAdminApproval(page, checks) {
  await page.goto(withCacheBust(`${siteURL}/demos/admin/?adminAgentMode=scripted`), { waitUntil: 'networkidle' })
  const admin = page.locator('#admin')
  await sendPrompt(admin, 'upgrade Northwind to Enterprise')
  await waitForContains(admin.getByTestId('approval-prompt'), 'updatePlan')
  const approval = await admin.getByTestId('approval-prompt').innerText()
  addCheck(checks, 'safety', 'risky admin mutation requires approval', /updatePlan/i.test(approval))
  addCheck(checks, 'workflowState', 'approval preserves target account', /northwind/i.test(approval))
  addCheck(checks, 'workflowState', 'approval preserves target plan', /Enterprise/i.test(approval))
  await admin.getByTestId('approve-button').click()
  await waitForContains(page.getByTestId('plan-northwind'), 'Enterprise')
  const text = await admin.getByTestId('chat-messages').innerText()
  addCheck(checks, 'workflowState', 'account plan changed only after approval', /Enterprise/i.test(await page.getByTestId('plan-northwind').innerText()))
  addCheck(checks, 'answerQuality', 'final answer names the updated account', /Updated Northwind Labs to Enterprise/i.test(text))
  return `${approval}\n\n${text}`
}

async function runAdminReject(page, checks) {
  await page.goto(withCacheBust(`${siteURL}/demos/admin/?adminAgentMode=scripted`), { waitUntil: 'networkidle' })
  const admin = page.locator('#admin')
  const initialStatus = await page.getByTestId('status-globex').innerText()
  await sendPrompt(admin, 'suspend Globex account')
  await waitForContains(admin.getByTestId('approval-prompt'), 'suspendAccount')
  await admin.getByTestId('reject-button').click()
  await waitForContains(admin.getByTestId('chat-messages'), /not update|did not update|not suspend|did not suspend|rejected/i)
  const finalStatus = await page.getByTestId('status-globex').innerText()
  const text = await admin.getByTestId('chat-messages').innerText()
  addCheck(checks, 'safety', 'rejected mutation preserves prior status', finalStatus === initialStatus)
  addCheck(checks, 'answerQuality', 'answer acknowledges the rejection without pretending success', /not update|did not update|not suspend|did not suspend|rejected/i.test(text))
  return `${text}\n\nInitial status: ${initialStatus}\nFinal status: ${finalStatus}`
}

async function runMissionControl(page, checks) {
  await page.goto(withCacheBust(`${siteURL}/demos/mission-control/`), { waitUntil: 'networkidle' })
  addCheck(checks, 'observability', 'starts with zero recorded runs', (await page.locator('#mc-runs').innerText()) === '0')
  const assistant = page.locator('#site-assistant')
  await assistant.locator('.site-assistant-toggle').click()
  await sendPrompt(assistant, 'what demos can I try?')
  await waitForContains(page.locator('#mc-last-event'), 'run-finish')
  const messages = await assistant.getByTestId('chat-messages').innerText()
  const runs = await page.locator('#mc-runs').innerText()
  const lastEvent = await page.locator('#mc-last-event').innerText()
  addCheck(checks, 'observability', 'records the assistant run', runs === '1')
  addCheck(checks, 'observability', 'records run-finish telemetry', /run-finish/i.test(lastEvent))
  addCheck(checks, 'answerQuality', 'assistant response still answers the user', /Mission control/i.test(messages))
  return `${messages}\n\nRuns: ${runs}\nLast event: ${lastEvent}`
}

async function runAgentReadableDocs(page, checks) {
  const files = [
    ['llms.txt', 'edgekit is a browser-native agent runtime'],
    ['llms-full.txt', '# Agent-operable software'],
    ['docs/concepts.md', '## Human approval'],
    ['docs/testing.md', 'Research loops'],
  ]
  const transcripts = []
  for (const [path, expected] of files) {
    const response = await page.request.get(`${siteURL}/${path}`)
    const text = await response.text()
    addCheck(checks, 'agentDocs', `${path} is available`, response.ok())
    addCheck(checks, 'agentDocs', `${path} includes expected content`, text.includes(expected))
    addCheck(checks, 'agentDocs', `${path} stays below 50k characters`, text.length < 50_000)
    transcripts.push(`# ${path}\n${text.slice(0, 700)}`)
  }
  return transcripts.join('\n\n')
}

async function sendPrompt(scope, prompt) {
  await scope.getByTestId('chat-input').fill(prompt)
  await scope.getByTestId('send-button').click()
}

async function waitForContains(locator, expected, timeout = 15_000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const text = await locator.innerText().catch(() => '')
    if (typeof expected === 'string' ? text.includes(expected) : expected.test(text)) return text
    await delay(200)
  }
  const text = await locator.innerText().catch(() => '')
  throw new Error(`Timed out waiting for ${String(expected)}. Last text: ${compactText(text)}`)
}

async function waitForVisible(locator, timeout = 15_000) {
  await locator.waitFor({ state: 'visible', timeout })
}

async function isVisible(locator) {
  return locator.isVisible().catch(() => false)
}

function addCheck(checks, category, label, passed, details = '', required = true) {
  checks.push({ category, label, passed: Boolean(passed), details, required })
}

/**
 * New synthesisFaithfulness helper.
 * For public sidecar surfaces, the "answer" includes both chat text AND the generative UI
 * (action cards, result lists). This checks that key entities from tool results actually
 * surface to the user instead of staying trapped in tool output.
 */
async function checkSynthesisFaithfulness(checks, scope, facts) {
  // facts is an array of { label, test: (scope) => boolean | Promise<boolean> }
  for (const fact of facts) {
    const result = await Promise.resolve(fact.test(scope));
    addCheck(
      checks,
      'synthesisFaithfulness',
      fact.label,
      Boolean(result),
      '',
      true
    );
  }
}

async function ensureServer({ url, label, cwd, cmd, args }) {
  if (await isReady(url)) return

  const server = spawn(cmd, args, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  })

  ownedServers.push(server)
  server.stdout.on('data', chunk => process.stdout.write(`[preview:${label}] ${chunk}`))
  server.stderr.on('data', chunk => process.stderr.write(`[preview:${label}] ${chunk}`))
  await waitForServer(url)
}

async function isReady(url) {
  try {
    const response = await fetch(url)
    return response.ok
  } catch {
    return false
  }
}

async function waitForServer(url) {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    if (await isReady(url)) return
    await delay(250)
  }
  throw new Error(`Timed out waiting for ${url}`)
}

async function launchBrowser() {
  return launchEdgekitBrowser({ headless })
}

async function saveScreenshot(page, id) {
  await mkdir(screenshotDir, { recursive: true })
  const path = resolve(screenshotDir, `${id}.png`)
  await page.screenshot({ path, fullPage: true })
  return path
}

async function stopServer(server) {
  if (server.exitCode !== null || server.killed) return
  server.kill('SIGTERM')
  await delay(500)
  if (server.exitCode === null && !server.killed) server.kill('SIGKILL')
}

function summarize(results) {
  const summary = {
    total: results.length,
    passed: 0,
    failed: 0,
    skipped: 0,
    requiredFailed: 0,
    averageScore: 0,
    byCategory: {},
  }

  let scored = 0
  let scoreTotal = 0
  for (const result of results) {
    if (result.outcome === 'passed') summary.passed += 1
    if (result.outcome === 'failed') {
      summary.failed += 1
      if (result.required) summary.requiredFailed += 1
    }
    if (result.outcome === 'skipped') summary.skipped += 1
    if (result.outcome !== 'skipped') {
      scored += 1
      scoreTotal += result.score
    }
    for (const check of result.checks) {
      summary.byCategory[check.category] ??= { passed: 0, failed: 0 }
      if (check.passed) summary.byCategory[check.category].passed += 1
      else summary.byCategory[check.category].failed += 1
    }
  }

  summary.averageScore = scored === 0 ? 0 : round(scoreTotal / scored)
  summary.shipReady = summary.requiredFailed === 0 && summary.averageScore >= 0.9
  return summary
}

function renderMarkdown(payload) {
  const rows = payload.results
    .map(
      result =>
        `| ${result.id} | ${result.outcome} | ${result.score} | ${result.required ? 'yes' : 'no'} | ${result.durationMs} |`,
    )
    .join('\n')
  const failures = payload.results
    .filter(result => result.outcome === 'failed')
    .map(result => {
      const failed = result.checks
        .filter(check => !check.passed)
        .map(check => `- ${check.category}: ${check.label}${check.details ? ` (${check.details})` : ''}`)
        .join('\n')
      return `## ${result.title}\n\n${failed}\n\nTranscript sample:\n\n\`\`\`text\n${result.transcript.slice(0, 2000)}\n\`\`\``
    })
    .join('\n\n')

  const byCat = Object.entries(payload.summary.byCategory || {})
    .map(([cat, v]) => `- ${cat}: ${v.passed} passed, ${v.failed} failed`)
    .join('\n')

  return `# EdgeKit Agent Research Loop

Generated: ${payload.generatedAt}

Target: ${payload.target}

Site: ${payload.siteURL}

Summary:

- Passed: ${payload.summary.passed}
- Failed: ${payload.summary.failed}
- Skipped: ${payload.summary.skipped}
- Required failed: ${payload.summary.requiredFailed}
- Average score: ${payload.summary.averageScore}
- Ship ready: ${payload.summary.shipReady ? 'yes' : 'no'}

**By category:**
${byCat || '(aggregated from checks)'}

| Scenario | Outcome | Score | Required | Duration ms |
| --- | --- | ---: | --- | ---: |
${rows}

${failures || 'No failed scenarios.'}

> Note: synthesisFaithfulness is a new high-signal category (added 2026-05) that verifies key tool-returned facts (sizes, prices, attributes) appear in the final user-visible surface (chat text + generative UI/action cards), not just in raw tool output.
`
}

function withCacheBust(url) {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}cacheBust=${Date.now()}`
}

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, '')
}

function compactText(value) {
  return String(value).replace(/\s+/g, ' ').trim().slice(0, 3000)
}

function round(value) {
  return Math.round(value * 1000) / 1000
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
