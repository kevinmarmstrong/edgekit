import { spawn } from 'node:child_process'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { browserMode, launchEdgekitBrowser } from './playwright-browser.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const strict = process.env.EDGEKIT_ADOPTION_STRICT !== '0'
const headless = process.env.EDGEKIT_ADOPTION_HEADLESS !== '0'
const target = process.env.EDGEKIT_ADOPTION_TARGET ?? 'local'
const siteURL = stripTrailingSlash(
  process.env.EDGEKIT_ADOPTION_SITE_URL ??
    (target === 'live' ? 'https://kevinmarmstrong.github.io/edgekit' : 'http://127.0.0.1:4174/edgekit'),
)
const scenariosPath = resolve(repoRoot, process.env.EDGEKIT_ADOPTION_SCENARIOS ?? 'evals/adoption-quality/scenarios.json')
const rubricPath = resolve(repoRoot, process.env.EDGEKIT_ADOPTION_RUBRIC ?? 'evals/adoption-quality/rubric.json')
const outputPath = resolve(repoRoot, process.env.EDGEKIT_ADOPTION_OUTPUT ?? 'research-results/adoption-quality.json')
const markdownPath = outputPath.replace(/\.json$/i, '.md')
const screenshotDir = resolve(
  repoRoot,
  process.env.EDGEKIT_ADOPTION_SCREENSHOTS ??
    `research-results/adoption-screenshots/${new Date().toISOString().replace(/[:.]/g, '-')}`,
)

const ownedServers = []
const scenarioPack = JSON.parse(await readFile(scenariosPath, 'utf8'))
const rubric = JSON.parse(await readFile(rubricPath, 'utf8'))

try {
  if (target === 'local') {
    await ensureServer({
      url: `${siteURL}/`,
      label: 'site',
      cwd: resolve(repoRoot, 'site'),
      cmd: 'pnpm',
      args: ['exec', 'vite', 'preview', '--host', '127.0.0.1', '--port', '4174'],
    })
  }

  const browser = await launchEdgekitBrowser({ headless })
  const results = []
  for (const scenario of scenarioPack.scenarios) {
    results.push(await runScenario(browser, scenario))
  }
  await browser.close()

  const summary = summarize(results, rubric)
  const payload = {
    generatedAt: new Date().toISOString(),
    target,
    siteURL,
    scenarioPack: scenarioPack.version,
    rubric: rubric.version,
    browserMode: browserMode({ headless }),
    summary,
    results,
  }

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`)
  await writeFile(markdownPath, renderMarkdown(payload))

  console.log(JSON.stringify(summary, null, 2))
  console.log(`Wrote ${outputPath}`)
  console.log(`Wrote ${markdownPath}`)
  console.log(`Screenshots: ${screenshotDir}`)

  if (strict && !summary.meetsRubric) process.exitCode = 1
} finally {
  await Promise.allSettled(ownedServers.map(server => stopServer(server)))
}

async function runScenario(browser, scenario) {
  const page = await browser.newPage({ viewport: { width: 1360, height: 960 } })
  const startedAt = Date.now()
  const checks = []
  let transcript = ''
  let screenshot = ''
  let notes = ''

  try {
    transcript = await runSurface(page, scenario)
    for (const check of scenario.required ?? []) {
      addCheck(checks, check.category, check.label, new RegExp(check.pattern, 'im').test(transcript), check.pattern)
    }
    for (const check of scenario.forbidden ?? []) {
      addCheck(checks, check.category, check.label, !new RegExp(check.pattern, 'im').test(transcript), check.pattern)
    }
    addCheck(checks, 'directness', 'does not look like concatenated docs search snippets', !looksLikeSnippetDump(transcript))
    addCheck(checks, 'directness', 'is concise enough to be usable in the chat UI', transcript.length > 80 && transcript.length < 2400, `${transcript.length} chars`)
  } catch (error) {
    addCheck(checks, 'runtime', 'scenario completed without throwing', false, readableError(error))
    notes = error instanceof Error ? error.stack ?? error.message : String(error)
  } finally {
    screenshot = await saveScreenshot(page, `adoption-${scenario.id}`).catch(error => `screenshot failed: ${readableError(error)}`)
    await page.close()
  }

  return makeResult({
    id: scenario.id,
    surface: scenario.surface,
    prompt: scenario.prompt,
    transcript,
    checks,
    screenshot,
    notes,
    durationMs: Date.now() - startedAt,
  })
}

async function runSurface(page, scenario) {
  if (scenario.surface === 'docs-qa') {
    await page.goto(withCacheBust(`${siteURL}/demos/docs/`), { waitUntil: 'networkidle' })
    const scope = page.locator('#qa')
    if (await scope.getByTestId('chat-input').count().catch(() => 0) === 0) {
      return runSiteAssistantSurface(page, scenario.prompt)
    }
    await sendPrompt(scope, scenario.prompt)
    return waitForAnswer(scope.getByTestId('chat-messages'), scenario.prompt)
  }

  if (scenario.surface === 'site-assistant') {
    return runSiteAssistantSurface(page, scenario.prompt)
  }

  throw new Error(`Unknown adoption-quality surface: ${scenario.surface}`)
}

async function runSiteAssistantSurface(page, prompt) {
  await page.goto(withCacheBust(`${siteURL}/docs/`), { waitUntil: 'networkidle' })
  const scope = page.locator('#site-assistant')
  await scope.locator('.site-assistant-toggle').click()
  await sendPrompt(scope, prompt)
  return waitForAnswer(scope.getByTestId('chat-messages'), prompt)
}

async function sendPrompt(scope, prompt) {
  await scope.getByTestId('chat-input').fill(prompt)
  await scope.getByTestId('send-button').click()
}

async function waitForAnswer(locator, prompt, timeout = 15_000) {
  const deadline = Date.now() + timeout
  let previous = ''
  let stableSince = 0
  while (Date.now() < deadline) {
    const text = await locator.innerText().catch(() => '')
    const answer = extractAnswer(text, prompt)
    if (answer.length > 40 && !/thinking|ready\./i.test(answer)) {
      if (answer === previous) {
        stableSince += 200
        if (stableSince >= 600) return answer.trim()
      } else {
        previous = answer
        stableSince = 0
      }
    }
    await delay(200)
  }
  const text = await locator.innerText().catch(() => '')
  throw new Error(`Timed out waiting for answer. Last text: ${compactText(text)}`)
}

function extractAnswer(text, prompt) {
  const index = text.lastIndexOf(prompt)
  const answer = index >= 0 ? text.slice(index + prompt.length) : text
  return answer
    .replace(/^Completed\s+\w+/gim, '')
    .replace(/^Tool:\s+\w+/gim, '')
    .trim()
}

function looksLikeSnippetDump(text) {
  const titleLines = text
    .split('\n')
    .filter(line => /^(North Star|Problem to Solution Matrix|Predictable Economics|Privacy and Data Boundary|Agent UX Inside Existing Apps|Latency and Resilience|Workflow Harness|Packages|Use Libraries|Identity Bridge|RBAC Tool Manifests):/.test(line.trim()))
  return titleLines.length >= 2
}

function addCheck(checks, category, label, passed, details = '') {
  checks.push({ category, label, passed: Boolean(passed), details, required: true })
}

function makeResult({ id, surface, prompt, transcript, checks, screenshot, notes, durationMs }) {
  const failed = checks.filter(check => !check.passed)
  return {
    id,
    surface,
    prompt,
    outcome: failed.length === 0 ? 'passed' : 'failed',
    score: checks.length === 0 ? 0 : round(checks.filter(check => check.passed).length / checks.length),
    checks,
    transcript,
    screenshot,
    notes,
    durationMs,
  }
}

function summarize(results, rubric) {
  const checks = results.flatMap(result => result.checks)
  const failed = checks.filter(check => !check.passed)
  const categoryScores = {}
  for (const category of new Set(checks.map(check => check.category))) {
    const group = checks.filter(check => check.category === category)
    categoryScores[category] = {
      score: round(group.filter(check => check.passed).length / group.length),
      passed: group.filter(check => check.passed).length,
      failed: group.filter(check => !check.passed).length,
      threshold: rubric.thresholds.categories[category] ?? 0,
    }
  }
  const averageScore = checks.length === 0 ? 0 : round(checks.filter(check => check.passed).length / checks.length)
  const requiredFailed = failed.length
  const categoryFailures = Object.entries(categoryScores).filter(([, score]) => score.score < score.threshold)
  return {
    scenarios: results.length,
    passed: checks.filter(check => check.passed).length,
    failed: failed.length,
    requiredFailed,
    averageScore,
    meetsRubric:
      averageScore >= rubric.thresholds.overallScore &&
      requiredFailed <= rubric.thresholds.requiredFailureCount &&
      categoryFailures.length === 0,
    categoryScores,
  }
}

function renderMarkdown(payload) {
  const rows = payload.results
    .map(result => `| ${result.id} | ${result.surface} | ${result.outcome} | ${result.score} | ${result.durationMs} |`)
    .join('\n')
  const failures = payload.results
    .filter(result => result.outcome !== 'passed')
    .map(result => {
      const failedChecks = result.checks
        .filter(check => !check.passed)
        .map(check => `- [${check.category}] ${check.label}: \`${check.details}\``)
        .join('\n')
      return `### ${result.id}\n\nPrompt: ${result.prompt}\n\n${failedChecks}\n\nTranscript:\n\n\`\`\`text\n${result.transcript}\n\`\`\``
    })
    .join('\n\n')
  const transcripts = payload.results
    .map(
      result => `### ${result.id}

Prompt: ${result.prompt}

\`\`\`text
${result.transcript}
\`\`\``,
    )
    .join('\n\n')

  return `# EdgeKit Adoption Quality Eval

Generated: ${payload.generatedAt}

Target: ${payload.target}

Site: ${payload.siteURL}

Meets rubric: ${payload.summary.meetsRubric ? 'yes' : 'no'}

- Passed checks: ${payload.summary.passed}
- Failed checks: ${payload.summary.failed}
- Average score: ${payload.summary.averageScore}

| Scenario | Surface | Outcome | Score | Duration ms |
| --- | --- | --- | ---: | ---: |
${rows}

${failures || 'No failed scenarios.'}

## Transcripts

${transcripts}
`
}

async function ensureServer({ url, label, cwd, cmd, args }) {
  if (await isReady(url)) return
  const server = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], env: process.env })
  ownedServers.push(server)
  server.stdout.on('data', chunk => process.stdout.write(`[preview:${label}] ${chunk}`))
  server.stderr.on('data', chunk => process.stderr.write(`[preview:${label}] ${chunk}`))
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    if (await isReady(url)) return
    await delay(250)
  }
  throw new Error(`Timed out waiting for ${url}`)
}

async function isReady(url) {
  try {
    return (await fetch(url)).ok
  } catch {
    return false
  }
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

function withCacheBust(url) {
  return `${url}${url.includes('?') ? '&' : '?'}cacheBust=${Date.now()}`
}

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, '')
}

function readableError(error) {
  return error instanceof Error ? error.message : String(error)
}

function compactText(text) {
  return text.replace(/\s+/g, ' ').slice(0, 500)
}

function round(value) {
  return Math.round(value * 1000) / 1000
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
