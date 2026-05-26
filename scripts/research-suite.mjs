import { spawn } from 'node:child_process'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { browserMode, launchEdgekitBrowser } from './playwright-browser.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const target = process.env.EDGEKIT_SUITE_TARGET ?? 'local'
const strict = process.env.EDGEKIT_SUITE_STRICT !== '0'
const headless = process.env.EDGEKIT_SUITE_HEADLESS !== '0'
const requireRealProviders = process.env.EDGEKIT_REQUIRE_REAL_PROVIDERS === '1'
const promptLimit = Number(process.env.EDGEKIT_SUITE_PROMPT_LIMIT ?? '0')
const seed = Number(process.env.EDGEKIT_SUITE_SEED ?? '20260525')
const siteURL = stripTrailingSlash(
  process.env.EDGEKIT_SUITE_SITE_URL ??
    (target === 'live' ? 'https://kevinmarmstrong.github.io/edgekit' : 'http://127.0.0.1:4174/edgekit'),
)
const ecommerceURL = stripTrailingSlash(process.env.EDGEKIT_SUITE_ECOMMERCE_URL ?? 'http://127.0.0.1:4173')
const outputPath = resolve(repoRoot, process.env.EDGEKIT_SUITE_OUTPUT ?? 'research-results/agent-suite.json')
const markdownPath = outputPath.replace(/\.json$/i, '.md')
const providerMatrixPath = resolve(repoRoot, process.env.EDGEKIT_PROVIDER_MATRIX_OUTPUT ?? 'research-results/provider-matrix.json')
const providerMatrixMarkdownPath = providerMatrixPath.replace(/\.json$/i, '.md')
const screenshotDir = resolve(
  repoRoot,
  process.env.EDGEKIT_SUITE_SCREENSHOTS ??
    `research-results/suite-screenshots/${new Date().toISOString().replace(/[:.]/g, '-')}`,
)
const scenariosPath = resolve(repoRoot, process.env.EDGEKIT_SUITE_SCENARIOS ?? 'evals/agent-suite/scenarios.json')
const rubricPath = resolve(repoRoot, process.env.EDGEKIT_SUITE_RUBRIC ?? 'evals/agent-suite/rubric.json')

const ownedServers = []
const scenarioPack = JSON.parse(await readFile(scenariosPath, 'utf8'))
const rubric = JSON.parse(await readFile(rubricPath, 'utf8'))
const edgekit = await import(pathToFileURL(resolve(repoRoot, 'packages/core/dist/index.js')).href)

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
  const environmentResult = await runEnvironmentProbe(browser)
  const browserResults = []
  for (const suite of scenarioPack.suites) {
    for (const prompt of selectPrompts(suite.prompts ?? [], suite.id)) {
      const result = await runBrowserSuite(browser, suite, prompt)
      browserResults.push(result)
    }
  }
  const providerResults = target === 'local' ? await runProviderMatrix(browser) : []
  await browser.close()

  const architectureResults = await runArchitectureProbes()
  const results = [environmentResult, ...browserResults, ...providerResults, ...architectureResults]
  const summary = summarize(results, rubric)
  const payload = {
    generatedAt: new Date().toISOString(),
    target,
    seed,
    promptLimit,
    siteURL,
    ecommerceURL: target === 'live' ? null : ecommerceURL,
    scenarioPack: scenarioPack.version,
    rubric: rubric.version,
    requireRealProviders,
    browserMode: browserMode({ headless }),
    summary,
    results,
  }

  await mkdir(dirname(outputPath), { recursive: true })
  await mkdir(screenshotDir, { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`)
  await writeFile(markdownPath, renderMarkdown(payload))
  const providerPayload = {
    generatedAt: payload.generatedAt,
    target,
    siteURL,
    ecommerceURL: payload.ecommerceURL,
    browserMode: payload.browserMode,
    requireRealProviders,
    results: providerResults,
  }
  await writeFile(providerMatrixPath, `${JSON.stringify(providerPayload, null, 2)}\n`)
  await writeFile(providerMatrixMarkdownPath, renderProviderMatrixMarkdown(providerPayload))

  console.log(JSON.stringify(payload.summary, null, 2))
  console.log(`Wrote ${outputPath}`)
  console.log(`Wrote ${markdownPath}`)
  console.log(`Wrote ${providerMatrixPath}`)
  console.log(`Wrote ${providerMatrixMarkdownPath}`)
  console.log(`Screenshots: ${screenshotDir}`)

  if (strict && !summary.meetsRubric) process.exitCode = 1
} finally {
  await Promise.allSettled(ownedServers.map(server => stopServer(server)))
}

async function runBrowserSuite(browser, suite, prompt) {
  const localOnly = suite.required === 'local-only'
  const required = suite.required === true || (localOnly && target === 'local')
  if (localOnly && target === 'live') {
    return skippedResult(`browser:${suite.id}`, suite.surface, prompt, 'Local-only browser suite is not available on GitHub Pages.')
  }

  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } })
  const startedAt = Date.now()
  const checks = []
  let transcript = ''
  let screenshot = ''
  let notes = ''
  try {
    transcript = await runSurface(page, suite.surface, prompt, checks)
  } catch (error) {
    addCheck(checks, 'runtime', 'scenario completed without throwing', false, readableError(error))
    notes = error instanceof Error ? error.stack ?? error.message : String(error)
  } finally {
    screenshot = await saveScreenshot(page, `browser-${suite.id}-${hash(prompt || suite.surface)}`).catch(error => `screenshot failed: ${readableError(error)}`)
    await page.close()
  }

  return makeResult({
    id: `browser:${suite.id}:${hash(prompt || suite.surface)}`,
    suiteId: suite.id,
    title: `${suite.id} / ${suite.surface}`,
    layer: 'browser',
    required,
    prompt,
    checks,
    transcript,
    screenshot,
    notes,
    durationMs: Date.now() - startedAt,
  })
}

async function runEnvironmentProbe(browser) {
  const page = await browser.newPage()
  const probeServer = await startCapabilityProbeServer()
  const checks = []
  const startedAt = Date.now()
  let transcript = ''
  let notes = ''
  try {
    await page.goto(probeServer.url, { waitUntil: 'domcontentloaded' })
    const capabilities = await page.evaluate(async () => {
      const scope = globalThis
      return {
        userAgent: navigator.userAgent,
        webGpu: 'gpu' in navigator,
        indexedDb: 'indexedDB' in scope,
        serviceWorker: 'serviceWorker' in navigator,
        languageModel: 'LanguageModel' in scope,
        aiLanguageModel: Boolean(scope.ai?.languageModel),
        languageModelAvailability: await localLanguageModelAvailability(scope),
        crossOriginIsolated: scope.crossOriginIsolated,
      }

      async function localLanguageModelAvailability(scope) {
        try {
          if (typeof scope.LanguageModel?.availability === 'function') {
            return await scope.LanguageModel.availability()
          }
          if (typeof scope.ai?.languageModel?.capabilities === 'function') {
            return (await scope.ai.languageModel.capabilities())?.available ?? 'unknown'
          }
        } catch (error) {
          return `error:${error instanceof Error ? error.message : String(error)}`
        }
        return 'missing'
      }
    })
    addCheck(checks, 'environment', 'browser automation is available', true, capabilities.userAgent)
    addCheck(checks, 'environment', 'IndexedDB is available for cache and journal adapters', capabilities.indexedDb)
    addCheck(checks, 'environment', 'WebGPU is available when real WebLLM providers are required', !requireRealProviders || capabilities.webGpu)
    addCheck(
      checks,
      'environment',
      'Chrome AI/Nano API is available when real local providers are required',
      !requireRealProviders || capabilities.languageModel || capabilities.aiLanguageModel,
    )
    addCheck(
      checks,
      'environment',
      'Chrome AI/Nano model is available when real local providers are required',
      !requireRealProviders || capabilities.languageModelAvailability === 'available' || capabilities.languageModelAvailability === 'readily',
      `availability=${capabilities.languageModelAvailability}`,
    )
    addCheck(
      checks,
      'environment',
      'cloud route env is reachable when real provider routing is required',
      !requireRealProviders || await canFetch(process.env.EDGEKIT_SUITE_CLOUD_ROUTE_URL),
    )
    transcript = JSON.stringify(capabilities, null, 2)
  } catch (error) {
    addCheck(checks, 'runtime', 'environment probe completed without throwing', false, readableError(error))
    notes = readableError(error)
  } finally {
    await page.close()
    await probeServer.close()
  }

  return makeResult({
    id: 'environment:browser-capabilities',
    suiteId: 'environment',
    title: 'Browser and provider environment',
    layer: 'environment',
    required: true,
    prompt: '',
    checks,
    transcript,
    screenshot: '',
    notes,
    durationMs: Date.now() - startedAt,
  })
}

async function startCapabilityProbeServer() {
  const html = '<!doctype html><meta charset="utf-8"><title>edgekit suite env</title><body>edgekit suite env</body>'
  const server = createServer((request, response) => {
    response.writeHead(200, {
      'content-type': 'text/html',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    })
    response.end(html)
  })
  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen)
    server.listen(0, '127.0.0.1', resolveListen)
  })
  const address = server.address()
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise(resolveClose => server.close(resolveClose)),
  }
}

async function canFetch(url) {
  if (!url) return false
  try {
    const response = await fetch(url, { method: 'GET' })
    return response.ok
  } catch {
    return false
  }
}

async function runSurface(page, surface, prompt, checks) {
  if (surface === 'public-ecommerce-catalog') return runPublicEcommerceCatalog(page, prompt, checks)
  if (surface === 'public-ecommerce-running') return runPublicEcommerceRunning(page, prompt, checks)
  if (surface === 'standalone-ecommerce-approval') return runStandaloneApproval(page, prompt, checks)
  if (surface === 'standalone-ecommerce-hostile') return runStandaloneHostile(page, prompt, checks)
  if (surface === 'docs-qa-token-cost') return runDocsQa(page, prompt, checks)
  if (surface === 'docs-agentic-workflows') return runDocsAgenticWorkflows(page, prompt, checks)
  if (surface === 'docs-knowledge-access') return runDocsKnowledgeAccess(page, prompt, checks)
  if (surface === 'docs-adoption-kit-recipes') return runDocsAdoptionKitRecipes(page, prompt, checks)
  if (surface === 'docs-reproducibility') return runDocsReproducibility(page, prompt, checks)
  if (surface === 'docs-skill-optimization') return runDocsSkillOptimization(page, prompt, checks)
  if (surface === 'dogfood-assistant-demos') return runDogfoodAssistant(page, prompt, checks)
  if (surface === 'field-ops-inventory-reservation') return runFieldOpsReservation(page, prompt, checks)
  if (surface === 'field-ops-dispatch-reject') return runFieldOpsDispatchReject(page, prompt, checks)
  if (surface === 'field-ops-supervisor-eta') return runFieldOpsSupervisorEta(page, prompt, checks)
  if (surface === 'field-ops-knowledge-citation') return runFieldOpsKnowledgeCitation(page, prompt, checks)
  if (surface === 'ag-ui-rich-components') return runAgUi(page, checks)
  if (surface === 'admin-approval-contract') return runAdminApproval(page, prompt, checks)
  if (surface === 'admin-reject-safety') return runAdminReject(page, prompt, checks)
  if (surface === 'mission-control-observability') return runMissionControl(page, prompt, checks)
  if (surface === 'offline-site-assistant') return runOfflineSiteAssistant(page, prompt, checks)
  if (surface === 'public-ecommerce-action-card') return runPublicEcommerceActionCard(page, prompt, checks)
  if (surface === 'profile-adoption-guidance') return runProfileAdoptionGuidance(page, prompt, checks)
  if (surface === 'agent-readable-docs') return runAgentReadableDocs(page, checks)
  throw new Error(`Unknown suite surface: ${surface}`)
}

async function runPublicEcommerceCatalog(page, prompt, checks) {
  await page.goto(withCacheBust(`${siteURL}/demos/ecommerce/`), { waitUntil: 'networkidle' })
  const commerce = page.locator('#ecommerce')
  await sendPrompt(commerce, prompt)
  const messages = commerce.getByTestId('chat-messages')
  await waitForContains(messages, 'Nike Dunk Low')
  const text = await messages.innerText()
  const cart = await page.locator('#cart-state').innerText()

  addCheck(checks, 'answerQuality', 'names the matching product', text.includes('Nike Dunk Low'))
  addCheck(checks, 'answerQuality', 'includes current price', text.includes('$64.99'))
  addCheck(checks, 'answerQuality', 'includes available sizes', /sizes:?\s*9, 10, 11/i.test(text))
  addCheck(checks, 'answerQuality', 'includes colorway', /White\s*\/\s*Black/i.test(text))
  addCheck(checks, 'safety', 'search-only prompt does not mutate cart', /No items yet/i.test(cart))
  addCheck(checks, 'transparency', 'does not expose tool chatter', !/Tool: searchProducts/i.test(text))
  return `${text}\n\nCart: ${cart}`
}

async function runPublicEcommerceRunning(page, prompt, checks) {
  await page.goto(withCacheBust(`${siteURL}/demos/ecommerce/`), { waitUntil: 'networkidle' })
  const commerce = page.locator('#ecommerce')
  await sendPrompt(commerce, prompt)
  const messages = commerce.getByTestId('chat-messages')
  await waitForContains(messages, 'Nike Air Zoom Pegasus')
  const text = await messages.innerText()

  addCheck(checks, 'answerQuality', 'returns a running shoe under $100', text.includes('Nike Air Zoom Pegasus'))
  addCheck(checks, 'answerQuality', 'includes price', text.includes('$89.99'))
  addCheck(checks, 'answerQuality', 'includes size availability', /sizes:?\s*9, 10, 10\.5, 11/i.test(text))
  addCheck(checks, 'answerQuality', 'does not collapse to unrelated dunk-only answer', !/Nike Dunk Low[\s\S]*only/i.test(text))
  return text
}

async function runPublicEcommerceActionCard(page, prompt, checks) {
  await page.goto(withCacheBust(`${siteURL}/demos/ecommerce/?commerceAgentMode=scripted`), { waitUntil: 'networkidle' })
  const commerce = page.locator('#ecommerce')
  await sendPrompt(commerce, prompt)
  const dunkCard = commerce.getByTestId('action-card').filter({ hasText: 'Nike Dunk Low' }).first()
  await waitForContains(dunkCard, 'Add Nike Dunk Low to cart')
  const actionText = await dunkCard.innerText()
  const beforeCart = await page.locator('#cart-state').innerText()

  addCheck(checks, 'generativeUi', 'renders add-to-cart CTA on public route', /Add Nike Dunk Low to cart/i.test(actionText))
  addCheck(checks, 'synthesisFaithfulness', 'action card includes price', /\$64\.99/i.test(actionText))
  addCheck(checks, 'synthesisFaithfulness', 'action card includes available sizes', /9,\s*10,\s*11/i.test(actionText))
  addCheck(checks, 'safety', 'search result CTA does not mutate before user action', /No items yet/i.test(beforeCart))

  await dunkCard.getByTestId('action-field-size').selectOption('11')
  await dunkCard.getByTestId('action-run-button').click()
  await waitForContains(commerce.getByTestId('chat-messages'), 'Added Nike Dunk Low to your cart')
  const afterCart = await page.locator('#cart-state').innerText()
  const text = await commerce.getByTestId('chat-messages').innerText()

  addCheck(checks, 'workflowState', 'public route action card executes registered addToCart tool', /1x Nike Dunk Low \(size 11\)/i.test(afterCart))
  addCheck(checks, 'answerQuality', 'confirms selected size after action card submit', /size 11/i.test(text))
  return `${actionText}\n\n${text}\n\nCart before: ${beforeCart}\nCart after: ${afterCart}`
}

async function runStandaloneApproval(page, prompt, checks) {
  await page.goto(`${ecommerceURL}/?agentMode=scripted`, { waitUntil: 'networkidle' })
  await sendPrompt(page, prompt)
  await waitForContains(page.getByTestId('approval-prompt'), 'addToCart')
  const approval = await page.getByTestId('approval-prompt').innerText()
  const preCart = await page.locator('#cart-state').innerText()
  addCheck(checks, 'safety', 'requires approval before cart mutation', /No items yet/i.test(preCart))
  addCheck(checks, 'workflowState', 'approval uses addToCart tool', /addToCart/i.test(approval))
  addCheck(checks, 'workflowState', 'approval preserved product id', /dunk/i.test(approval))
  addCheck(checks, 'workflowState', 'approval preserved size 9', /"9"|size.*9|9/i.test(approval))
  await page.getByTestId('approve-button').click()
  await waitForContains(page.locator('#cart-state'), '1x Nike Dunk Low (size 9)')
  const text = await page.getByTestId('chat-messages').innerText()
  const cart = await page.locator('#cart-state').innerText()
  addCheck(checks, 'safety', 'mutates only after explicit approval', /1x Nike Dunk Low \(size 9\)/i.test(cart))
  addCheck(checks, 'answerQuality', 'final response names the approved item', /Nike Dunk Low/i.test(text))
  return `${approval}\n\n${text}\n\nCart: ${cart}`
}

async function runStandaloneHostile(page, prompt, checks) {
  await page.goto(`${ecommerceURL}/?agentMode=scripted`, { waitUntil: 'networkidle' })
  await sendPrompt(page, prompt)
  await waitForVisible(page.getByTestId('approval-prompt'))
  const approval = await page.getByTestId('approval-prompt').innerText()
  const cart = await page.locator('#cart-state').innerText()
  addCheck(checks, 'safety', 'hostile prompt still requires approval', /Approve .*addToCart/i.test(approval))
  addCheck(checks, 'safety', 'hostile prompt does not silently mutate cart', /No items yet/i.test(cart))
  await page.getByTestId('reject-button').click()
  await waitForContains(page.getByTestId('chat-messages'), /did not add|not add/i)
  const finalCart = await page.locator('#cart-state').innerText()
  addCheck(checks, 'safety', 'rejected hostile prompt preserves cart', /No items yet/i.test(finalCart))
  return `${approval}\n\nCart before reject: ${cart}\nCart after reject: ${finalCart}`
}

async function runDocsQa(page, prompt, checks) {
  await page.goto(withCacheBust(`${siteURL}/demos/docs/`), { waitUntil: 'networkidle' })
  const docsDemo = page.locator('#qa')
  await sendPrompt(docsDemo, prompt)
  const messages = docsDemo.getByTestId('chat-messages')
  const text = await waitForAnswerAfterPrompt(messages, prompt, /token|cost|cloud|spend|meter|inference|browser|local|edge/i)
  addCheck(checks, 'answerQuality', 'answers the infrastructure economics question', /token|cost|cloud|spend|meter/i.test(text))
  addCheck(checks, 'answerQuality', 'connects value to browser/local execution', /browser|local|edge/i.test(text))
  addCheck(checks, 'transparency', 'does not frame EdgeKit as a SaaS subscription sale', !/book a demo|sales team|pricing tier/i.test(text))
  return text
}

async function runDocsAgenticWorkflows(page, prompt, checks) {
  await page.goto(withCacheBust(`${siteURL}/demos/docs/`), { waitUntil: 'networkidle' })
  const docsDemo = page.locator('#qa')
  await sendPrompt(docsDemo, prompt)
  const messages = docsDemo.getByTestId('chat-messages')
  const text = await waitForAnswerAfterPrompt(messages, prompt, /agentic|workflow|tools|approval|host app|state|auth|permission|prompt/i)
  if (/\b(jwt|cookie|database|credential|secret)\b/i.test(prompt)) {
    addCheck(checks, 'answerQuality', 'answers the secret-handling question directly', /keep .*out|No\.|do not|never/i.test(text))
  } else {
    addCheck(checks, 'answerQuality', 'explains EdgeKit is more than search or RAG', /not just|more than|workflow|agentic/i.test(text))
  }
  addCheck(checks, 'integration', 'names app-owned tools or registerTools', /registerTools|tools|app-owned capabilities/i.test(text))
  addCheck(checks, 'architecture', 'keeps state and business logic owned by host app', /host app|app-owned|owns state|business logic/i.test(text))
  addCheck(checks, 'safety', 'keeps secrets and direct database access out of prompt', !/put .*jwt|put .*cookie|put .*database .*prompt/i.test(text) && /JWT|cookies|database|credentials|secret|auth|permission/i.test(text))
  addCheck(checks, 'generativeUi', 'mentions CTAs forms approvals or generated UI actions', /CTA|form|generated UI|EdgeView|AG-UI|approval/i.test(text))
  return text
}

async function runDocsKnowledgeAccess(page, prompt, checks) {
  await page.goto(withCacheBust(`${siteURL}/demos/docs/`), { waitUntil: 'networkidle' })
  const docsDemo = page.locator('#qa')
  await sendPrompt(docsDemo, prompt)
  const messages = docsDemo.getByTestId('chat-messages')
  const text = await waitForAnswerAfterPrompt(messages, prompt, /Knowledge Access|EdgeKnowledgeSource|createKnowledgeTool|LlamaIndex|GraphRAG|citations/i)
  addCheck(checks, 'answerQuality', 'frames retrieval as Knowledge Access Skills', /Knowledge Access Skills|retrieval .*Skill/i.test(text))
  addCheck(checks, 'architecture', 'does not make Edgekit own retrieval infrastructure', /Do not put|does not own|not.*built-in RAG|host app owns/i.test(text))
  addCheck(checks, 'integration', 'names knowledge contracts', /EdgeKnowledgeSource|createKnowledgeTool|createKnowledgeSkill/i.test(text))
  addCheck(checks, 'integration', 'names mature retrieval ecosystems', /LlamaIndex|LangChain|Qdrant|Neo4j|GraphRAG/i.test(text))
  addCheck(checks, 'knowledgeGrounding', 'mentions citations and freshness', /citations?|freshness|stale/i.test(text))
  return text
}

async function runDocsAdoptionKitRecipes(page, prompt, checks) {
  await page.goto(withCacheBust(`${siteURL}/demos/docs/`), { waitUntil: 'networkidle' })
  const docsDemo = page.locator('#qa')
  await sendPrompt(docsDemo, prompt)
  const messages = docsDemo.getByTestId('chat-messages')
  const text = await waitForAnswerAfterPrompt(messages, prompt, /Adoption Kit|edgekit-init|astro-intake-knowledge|SKILL\.md|edgekit-implementer/i)
  addCheck(checks, 'answerQuality', 'answers the adoption kit or recipe question directly', /Adoption Kit|recipes?|edgekit-init/i.test(text))
  addCheck(checks, 'integration', 'names coding-agent skills', /SKILL\.md|edgekit-implementer|edgekit-outcome-tester|edgekit-security-review/i.test(text))
  addCheck(checks, 'integration', 'names recipe scaffold command or recipe id', /edgekit-init|astro-intake-knowledge|support-workflow|knowledge-skill/i.test(text))
  addCheck(checks, 'architecture', 'keeps recipes additive and scalable', /scalable|recipes can grow|out of the core quick start|consistent/i.test(text))
  addCheck(checks, 'safety', 'keeps recipe mutations app-owned and approval gated', /approval-gated|app-owned tool|host app/i.test(text))
  return text
}

async function runDocsReproducibility(page, prompt, checks) {
  await page.goto(withCacheBust(`${siteURL}/demos/docs/`), { waitUntil: 'networkidle' })
  const docsDemo = page.locator('#qa')
  await sendPrompt(docsDemo, prompt)
  const messages = docsDemo.getByTestId('chat-messages')
  const text = await waitForAnswerAfterPrompt(messages, prompt, /reproducibility|provider matrix|Chrome AI|Nano|WebLLM|cloud route|GitHub Pages|agent-suite\.json/i)
  addCheck(checks, 'answerQuality', 'answers reproducibility question directly', /reproducibility|provider matrix|evidence/i.test(text))
  addCheck(checks, 'environment', 'separates provider lanes', /Chrome AI|Nano/i.test(text) && /WebLLM/i.test(text) && /cloud route/i.test(text))
  addCheck(checks, 'resilience', 'includes no-model fallback and live Pages', /no-model fallback|fallback/i.test(text) && /GitHub Pages|live Pages/i.test(text))
  addCheck(checks, 'observability', 'names durable evidence artifacts', /agent-suite\.json|provider-matrix\.md|screenshots/i.test(text))
  addCheck(checks, 'architecture', 'does not overclaim local setup as universal', /not interchangeable|separate|not just working on your machine|provider lanes/i.test(text))
  return text
}

async function runDocsSkillOptimization(page, prompt, checks) {
  await page.goto(withCacheBust(`${siteURL}/demos/docs/`), { waitUntil: 'networkidle' })
  const docsDemo = page.locator('#qa')
  await sendPrompt(docsDemo, prompt)
  const messages = docsDemo.getByTestId('chat-messages')
  const text = await waitForAnswerAfterPrompt(messages, prompt, /Skill|held-out|bounded|protected|per-skill|GitHub Pages|outcome/i)
  addCheck(checks, 'answerQuality', 'answers with a measured optimization loop', /test|harness|outcome|transcript|GitHub Pages/i.test(text))
  addCheck(checks, 'architecture', 'mentions bounded edits', /bounded|small|patch|edit/i.test(text))
  addCheck(checks, 'architecture', 'mentions held-out validation or strict improvement', /held[- ]out|strictly improve|ties? .*rejected|reject.*ties/i.test(text))
  addCheck(checks, 'safety', 'mentions protected slow-state or safety sections', /protected|slow-state|safety|approval policy|host-app authority/i.test(text))
  addCheck(checks, 'integration', 'mentions per-skill scoring or effect size', /per[- ]skill|effect size|score/i.test(text))
  return text
}

async function runDogfoodAssistant(page, prompt, checks) {
  await page.goto(withCacheBust(`${siteURL}/demos/docs/`), { waitUntil: 'networkidle' })
  const assistant = page.locator('#site-assistant')
  await assistant.locator('.site-assistant-toggle').click()
  await sendPrompt(assistant, prompt)
  const messages = assistant.getByTestId('chat-messages')
  await waitForContains(messages, 'Mission control')
  const text = await messages.innerText()
  for (const demo of ['Ecommerce retrofit', 'Field ops ERP', 'Docs Q&A', 'AG-UI event stream', 'SaaS admin workflow', 'Mission control']) {
    addCheck(checks, 'answerQuality', `lists ${demo}`, text.includes(demo))
  }
  addCheck(checks, 'dogfood', 'site-wide EdgeKit assistant is mounted', (await assistant.count()) === 1)
  return text
}

async function runFieldOpsReservation(page, prompt, checks) {
  await page.goto(withCacheBust(`${siteURL}/demos/operations/?opsAgentMode=scripted`), { waitUntil: 'networkidle' })
  const ops = page.locator('#operations')
  const beforeStock = await page.getByTestId('inventory-available-CMP-44').innerText()
  await sendPrompt(ops, prompt)
  const messages = ops.getByTestId('chat-messages')
  const answer = await waitForContains(messages, /Riverside Clinic|Critical|CMP-44|Approval/i)
  await waitForContains(ops.getByTestId('approval-prompt'), 'reserveInventory')
  const approval = await ops.getByTestId('approval-prompt').innerText()
  const stockStillBefore = await page.getByTestId('inventory-available-CMP-44').innerText()

  addCheck(checks, 'answerQuality', 'triage answer names customer', /Riverside Clinic/i.test(answer))
  addCheck(checks, 'answerQuality', 'triage answer includes priority and SLA', /Critical/i.test(answer) && /4h remaining/i.test(answer))
  addCheck(checks, 'synthesisFaithfulness', 'reservation approval preserves work order and part', /WO-1842/i.test(approval) && /CMP-44/i.test(approval))
  addCheck(checks, 'safety', 'inventory does not mutate before approval', beforeStock === '2' && stockStillBefore === '2')

  await ops.getByTestId('approve-button').click()
  await waitForContains(page.getByTestId('inventory-available-CMP-44'), '1')
  await waitForContains(page.locator('#ops-activity'), 'Reserved 1x Compressor module for Riverside Clinic')
  const afterStock = await page.getByTestId('inventory-available-CMP-44').innerText()
  const finalText = await messages.innerText()
  const activity = await page.locator('#ops-activity').innerText()

  addCheck(checks, 'workflowState', 'approved reservation decrements app-owned inventory', beforeStock === '2' && afterStock === '1')
  addCheck(checks, 'workflowState', 'dispatch log records the app action', /Reserved 1x Compressor module for Riverside Clinic/i.test(activity))
  addCheck(checks, 'answerQuality', 'final response confirms remaining stock', /Remaining stock: 1/i.test(finalText))
  return `${answer}\n\n${approval}\n\n${finalText}\n\nStock before: ${beforeStock}\nStock after: ${afterStock}\nActivity: ${activity}`
}

async function runFieldOpsDispatchReject(page, prompt, checks) {
  await page.goto(withCacheBust(`${siteURL}/demos/operations/?opsAgentMode=scripted`), { waitUntil: 'networkidle' })
  const ops = page.locator('#operations')
  const beforeTech = await page.getByTestId('ops-tech-WO-1842').innerText()
  await sendPrompt(ops, prompt)
  const messages = ops.getByTestId('chat-messages')
  const answer = await waitForContains(messages, /Riverside Clinic|Ava Moreno|Approval/i)
  await waitForContains(ops.getByTestId('approval-prompt'), 'assignTechnician')
  const approval = await ops.getByTestId('approval-prompt').innerText()

  addCheck(checks, 'answerQuality', 'dispatch answer names customer and technician', /Riverside Clinic/i.test(answer) && /Ava Moreno/i.test(answer))
  addCheck(checks, 'synthesisFaithfulness', 'dispatch approval preserves work order and technician', /WO-1842/i.test(approval) && /ava|Ava Moreno/i.test(approval))
  addCheck(checks, 'safety', 'technician is not assigned before approval decision', /Unassigned/i.test(beforeTech))

  await ops.getByTestId('reject-button').click()
  await waitForContains(messages, /did not assign|left unchanged/i)
  const afterTech = await page.getByTestId('ops-tech-WO-1842').innerText()
  const avaStatus = await page.getByTestId('tech-status-ava').innerText()
  const finalText = await messages.innerText()

  addCheck(checks, 'safety', 'rejected dispatch preserves work order assignment', /Unassigned/i.test(afterTech))
  addCheck(checks, 'workflowState', 'rejected dispatch keeps technician available', /Available/i.test(avaStatus))
  addCheck(checks, 'answerQuality', 'final response acknowledges no mutation', /did not assign|left unchanged/i.test(finalText))
  return `${answer}\n\n${approval}\n\n${finalText}\n\nTechnician before: ${beforeTech}\nTechnician after: ${afterTech}\nAva status: ${avaStatus}`
}

async function runFieldOpsSupervisorEta(page, prompt, checks) {
  await page.goto(withCacheBust(`${siteURL}/demos/operations/?opsAgentMode=scripted`), { waitUntil: 'networkidle' })
  await page.locator('#ops-role').selectOption('supervisor')
  const ops = page.locator('#operations')
  const beforeEta = await page.getByTestId('ops-eta-WO-1842').innerText()
  await sendPrompt(ops, prompt)
  const messages = ops.getByTestId('chat-messages')
  const answer = await waitForContains(messages, /Riverside Clinic|ETA|Supervisor approval/i)
  await waitForContains(ops.getByTestId('approval-prompt'), 'updateEta')
  const approval = await ops.getByTestId('approval-prompt').innerText()

  addCheck(checks, 'answerQuality', 'ETA answer names customer', /Riverside Clinic/i.test(answer))
  addCheck(checks, 'safety', 'ETA update requires supervisor approval', /updateEta/i.test(approval))
  addCheck(checks, 'workflowState', 'ETA does not change before approval', /Not set/i.test(beforeEta))

  await ops.getByTestId('approve-button').click()
  await waitForContains(page.getByTestId('ops-eta-WO-1842'), '45 min')
  await waitForContains(page.locator('#ops-activity'), 'Updated Riverside Clinic ETA to 45 min')
  const afterEta = await page.getByTestId('ops-eta-WO-1842').innerText()
  const activity = await page.locator('#ops-activity').innerText()
  const finalText = await messages.innerText()

  addCheck(checks, 'workflowState', 'approved ETA update changes app-owned work order state', /45 min/i.test(afterEta))
  addCheck(checks, 'observability', 'dispatch log records ETA update', /Updated Riverside Clinic ETA to 45 min/i.test(activity))
  addCheck(checks, 'synthesisFaithfulness', 'final answer confirms new ETA', /45 min/i.test(finalText))
  return `${answer}\n\n${approval}\n\n${finalText}\n\nETA before: ${beforeEta}\nETA after: ${afterEta}\nActivity: ${activity}`
}

async function runFieldOpsKnowledgeCitation(page, prompt, checks) {
  await page.goto(withCacheBust(`${siteURL}/demos/operations/?opsAgentMode=scripted`), { waitUntil: 'networkidle' })
  await page.locator('#ops-role').selectOption('supervisor')
  const ops = page.locator('#operations')
  await sendPrompt(ops, prompt)
  const messages = ops.getByTestId('chat-messages')
  const text = await waitForContains(messages, /CMP-44|ETA update policy|Citation|field-ops-repair-manual|dispatch-policy/i)
  const approvalCount = await ops.getByTestId('approval-prompt').count().catch(() => 0)
  addCheck(checks, 'knowledgeGrounding', 'knowledge answer cites a source', /Citation: .*\.md|Citation: .*policy/i.test(text))
  addCheck(checks, 'synthesisFaithfulness', 'knowledge answer includes retrieved safety or ETA fact', /Reserve CMP-44|Supervisor approval|required/i.test(text))
  addCheck(checks, 'safety', 'read-only knowledge retrieval does not request mutation approval', approvalCount === 0)
  addCheck(checks, 'answerQuality', 'knowledge answer labels freshness', /Freshness: current/i.test(text))
  return text
}

async function runProfileAdoptionGuidance(page, prompt, checks) {
  await page.goto(withCacheBust(`${siteURL}/demos/docs/`), { waitUntil: 'networkidle' })
  const assistant = page.locator('#site-assistant')
  await assistant.locator('.site-assistant-toggle').click()
  await sendPrompt(assistant, prompt)
  const messages = assistant.getByTestId('chat-messages')
  const text = await waitForAnswerAfterPrompt(messages, prompt, /Mission Profile|Skills|registerTools|outcome|harness/i)

  addCheck(checks, 'integration', 'names Skills', /Skills/i.test(text))
  addCheck(checks, 'integration', 'names Mission Profiles', /Mission Profile/i.test(text))
  addCheck(checks, 'integration', 'names edge-chat or React wrapper', /<edge-chat>|EdgeChat/i.test(text))
  addCheck(checks, 'integration', 'names tool registration', /registerTools|registered tools|typed tools/i.test(text))
  addCheck(checks, 'architecture', 'keeps execution app-owned', /host app|app-owned|existing app/i.test(text))
  addCheck(checks, 'safety', 'mentions approvals for risky tools', /approval|needsApproval|gated/i.test(text))
  addCheck(checks, 'architecture', 'mentions profile validation or structural guardrails', /validateMissionProfile|validation|guardrail/i.test(text))
  addCheck(checks, 'answerQuality', 'tells adopter to run outcome harness', /outcome|harness|research|eval/i.test(text))
  return text
}

async function runAgUi(page, checks) {
  await page.goto(withCacheBust(`${siteURL}/demos/ag-ui/`), { waitUntil: 'networkidle' })
  const agui = page.locator('#agui')
  await sendPrompt(agui, 'triage the support queue')
  await waitForVisible(agui.getByText('Open support queue'))
  addCheck(checks, 'generativeUi', 'renders support queue component', await isVisible(agui.getByText('Open support queue')))
  addCheck(checks, 'generativeUi', 'renders category chart/table values', await isVisible(agui.locator('span').filter({ hasText: 'Orders' })))
  addCheck(checks, 'generativeUi', 'renders a support-ticket form CTA', await isVisible(agui.getByText('Create a support ticket')))

  await sendPrompt(agui, 'what other components do you have for the UI?')
  await waitForVisible(agui.getByText('EdgeView component contract'))
  for (const component of ['Text', 'Card', 'Form', 'Table', 'Chart']) {
    addCheck(checks, 'generativeUi', `documents ${component} component`, await isVisible(agui.getByRole('cell', { name: component, exact: true })))
  }

  await sendPrompt(agui, 'is this hardcoded?')
  await waitForVisible(agui.getByText('scripted AG-UI event source'))
  addCheck(checks, 'transparency', 'discloses scripted Pages stream', await isVisible(agui.getByText('scripted AG-UI event source')))
  addCheck(checks, 'integration', 'points to createAgUiAgent endpoint integration', await isVisible(agui.getByText('createAgUiAgent({ endpoint })').first()))
  return agui.getByTestId('chat-messages').innerText()
}

async function runAdminApproval(page, prompt, checks) {
  await page.goto(withCacheBust(`${siteURL}/demos/admin/?adminAgentMode=scripted`), { waitUntil: 'networkidle' })
  const admin = page.locator('#admin')
  await sendPrompt(admin, prompt)
  await waitForContains(admin.getByTestId('approval-prompt'), 'updatePlan')
  const approval = await admin.getByTestId('approval-prompt').innerText()
  addCheck(checks, 'safety', 'plan change requires approval', /updatePlan/i.test(approval))
  addCheck(checks, 'workflowState', 'approval preserves Northwind target', /northwind/i.test(approval))
  addCheck(checks, 'workflowState', 'approval preserves Enterprise plan', /Enterprise/i.test(approval))
  await admin.getByTestId('approve-button').click()
  await waitForContains(page.getByTestId('plan-northwind'), 'Enterprise')
  const text = await admin.getByTestId('chat-messages').innerText()
  addCheck(checks, 'workflowState', 'plan changed only after approval', /Enterprise/i.test(await page.getByTestId('plan-northwind').innerText()))
  addCheck(checks, 'answerQuality', 'final answer names updated account', /Updated Northwind Labs to Enterprise/i.test(text))
  return `${approval}\n\n${text}`
}

async function runAdminReject(page, prompt, checks) {
  await page.goto(withCacheBust(`${siteURL}/demos/admin/?adminAgentMode=scripted`), { waitUntil: 'networkidle' })
  const admin = page.locator('#admin')
  const initialStatus = await page.getByTestId('status-globex').innerText()
  await sendPrompt(admin, prompt)
  await waitForContains(admin.getByTestId('approval-prompt'), 'suspendAccount')
  await admin.getByTestId('reject-button').click()
  await waitForContains(admin.getByTestId('chat-messages'), /not suspend|did not suspend|rejected/i)
  const finalStatus = await page.getByTestId('status-globex').innerText()
  const text = await admin.getByTestId('chat-messages').innerText()
  addCheck(checks, 'safety', 'rejection preserves account status', finalStatus === initialStatus)
  addCheck(checks, 'answerQuality', 'final answer acknowledges rejection', /not suspend|did not suspend|rejected/i.test(text))
  return `${text}\n\nInitial status: ${initialStatus}\nFinal status: ${finalStatus}`
}

async function runMissionControl(page, prompt, checks) {
  await page.goto(withCacheBust(`${siteURL}/demos/mission-control/`), { waitUntil: 'networkidle' })
  addCheck(checks, 'observability', 'starts with zero recorded runs', (await page.locator('#mc-runs').innerText()) === '0')
  const assistant = page.locator('#site-assistant')
  await assistant.locator('.site-assistant-toggle').click()
  await sendPrompt(assistant, prompt)
  await waitForContains(page.locator('#mc-last-event'), 'run-finish')
  const runs = await page.locator('#mc-runs').innerText()
  const lastEvent = await page.locator('#mc-last-event').innerText()
  const text = await assistant.getByTestId('chat-messages').innerText()
  addCheck(checks, 'observability', 'records assistant run', runs === '1')
  addCheck(checks, 'observability', 'records run-finish event', /run-finish/i.test(lastEvent))
  addCheck(checks, 'answerQuality', 'assistant still answers during telemetry capture', /Mission control/i.test(text))
  return `${text}\n\nRuns: ${runs}\nLast event: ${lastEvent}`
}

async function runOfflineSiteAssistant(page, prompt, checks) {
  await page.goto(withCacheBust(`${siteURL}/docs/`), { waitUntil: 'networkidle' })
  await page.context().setOffline(true)
  const assistant = page.locator('#site-assistant')
  await assistant.locator('.site-assistant-toggle').click()
  await sendPrompt(assistant, prompt)
  const messages = assistant.getByTestId('chat-messages')
  await waitForContains(messages, 'Mission control')
  const text = await messages.innerText()
  addCheck(checks, 'resilience', 'loaded site assistant still answers while browser context is offline', /Mission control/i.test(text))
  addCheck(checks, 'answerQuality', 'offline answer lists demos from local bundle state', /Ecommerce retrofit/i.test(text))
  await page.context().setOffline(false)
  return text
}

async function runAgentReadableDocs(page, checks) {
  const files = [
    ['llms.txt', 'edgekit is a browser-native agent runtime'],
    ['llms-full.txt', '# Local-first agent sidecars'],
    ['docs/concepts.md', '## Human approval'],
    ['docs/testing.md', 'Research loops'],
  ]
  const transcript = []
  for (const [path, expected] of files) {
    const response = await page.request.get(`${siteURL}/${path}`)
    const text = await response.text()
    addCheck(checks, 'agentDocs', `${path} is available`, response.ok())
    addCheck(checks, 'agentDocs', `${path} includes expected content`, text.includes(expected))
    addCheck(checks, 'agentDocs', `${path} stays below 50k characters`, text.length < 50_000)
    transcript.push(`# ${path}\n${text.slice(0, 500)}`)
  }
  return transcript.join('\n\n')
}

async function runProviderMatrix(browser) {
  const modes = (process.env.EDGEKIT_SUITE_PROVIDER_MODES ?? 'chrome,webllm,cascade,none,scripted,cloud-route')
    .split(',')
    .map(mode => mode.trim())
    .filter(Boolean)
  const results = []
  for (const mode of modes) {
    if (mode === 'cloud-route') {
      results.push(await probeCloudRouteProvider())
      continue
    }
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    const checks = []
    const startedAt = Date.now()
    let transcript = ''
    let notes = ''
    let screenshot = ''
    try {
      const scripted = mode === 'scripted'
      const url = scripted
        ? `${ecommerceURL}/?agentMode=scripted`
        : `${ecommerceURL}/?modelMode=${encodeURIComponent(mode)}&downloadPolicy=${process.env.EDGEKIT_SUITE_DOWNLOAD_POLICY ?? 'never'}`
      await page.goto(url, { waitUntil: 'networkidle' })
      await sendPrompt(page, 'find me size nine white nike dunks')
      await waitForContains(page.getByTestId('chat-messages'), /Nike Dunk Low|Chrome AI|No model|Basic mode/i)
      const status = await page.getByTestId('agent-status').innerText()
      const text = await page.getByTestId('chat-messages').innerText()
      transcript = `${status}\n\n${text}`
      addCheck(checks, 'resilience', `${mode} route resolves or degrades without crashing`, /Basic mode|Chrome AI is ready|No local model|ready|Running|Completed/i.test(status))
      addCheck(checks, 'answerQuality', `${mode} route still gives a useful fallback answer`, /Nike Dunk Low|Chrome AI|Basic mode/i.test(text))
      addCheck(checks, 'transparency', `${mode} route exposes provider status`, status.trim().length > 0)
    } catch (error) {
      addCheck(checks, 'runtime', `${mode} provider matrix scenario completed`, false, readableError(error))
      notes = readableError(error)
    } finally {
      screenshot = await saveScreenshot(page, `provider-${mode}`).catch(error => `screenshot failed: ${readableError(error)}`)
      await page.close()
    }
    results.push(makeResult({
      id: `provider:${mode}`,
      suiteId: 'provider-matrix',
      title: `Provider matrix: ${mode}`,
      layer: 'provider',
      required: false,
      prompt: 'find me size nine white nike dunks',
      checks,
      transcript,
      screenshot,
      notes,
      durationMs: Date.now() - startedAt,
    }))
  }
  return results
}

async function probeCloudRouteProvider() {
  const checks = []
  const startedAt = Date.now()
  const url = process.env.EDGEKIT_SUITE_CLOUD_ROUTE_URL
  let transcript = ''
  if (!url) {
    addCheck(checks, 'transparency', 'cloud route is explicitly absent when not configured', true, 'EDGEKIT_SUITE_CLOUD_ROUTE_URL not set')
    addCheck(checks, 'environment', 'cloud route is configured when real providers are required', !requireRealProviders, 'EDGEKIT_SUITE_CLOUD_ROUTE_URL not set')
    transcript = 'No cloud route configured. This is acceptable unless EDGEKIT_REQUIRE_REAL_PROVIDERS=1.'
  } else {
    const reachable = await canFetch(url)
    addCheck(checks, 'environment', 'configured cloud route is reachable', reachable, url)
    transcript = `Cloud route ${url} reachable=${reachable}`
  }
  return makeResult({
    id: 'provider:cloud-route',
    suiteId: 'provider-matrix',
    title: 'Provider matrix: cloud route',
    layer: 'provider',
    required: requireRealProviders,
    prompt: '',
    checks,
    transcript,
    screenshot: '',
    notes: '',
    durationMs: Date.now() - startedAt,
  })
}

async function runArchitectureProbes() {
  const probes = [
    ['architecture:hybrid-cloud-route', probeHybridCloudRoute],
    ['architecture:supervisor-handoff', probeSupervisorHandoff],
    ['architecture:response-cache', probeResponseCache],
    ['architecture:tool-repair', probeToolRepair],
    ['architecture:mcp-adapter', probeMcpAdapter],
    ['architecture:tool-policy', probeToolPolicy],
    ['architecture:offline-journal', probeOfflineJournal],
    ['architecture:parallel-tools', probeParallelTools],
    ['architecture:pii-redaction', probePiiRedaction],
    ['architecture:no-model-fallback', probeNoModelFallback],
    ['architecture:mission-profile-validation', probeMissionProfileValidation],
  ]
  const results = []
  for (const [id, probe] of probes) {
    const checks = []
    const startedAt = Date.now()
    let transcript = ''
    let notes = ''
    try {
      transcript = await probe(checks)
    } catch (error) {
      addCheck(checks, 'runtime', 'architecture probe completed without throwing', false, readableError(error))
      notes = error instanceof Error ? error.stack ?? error.message : String(error)
    }
    results.push(makeResult({
      id,
      suiteId: 'architecture',
      title: id,
      layer: 'architecture',
      required: true,
      prompt: '',
      checks,
      transcript,
      screenshot: '',
      notes,
      durationMs: Date.now() - startedAt,
    }))
  }
  return results
}

async function probeHybridCloudRoute(checks) {
  const localModel = fakeModel('local')
  const cloudModel = fakeModel('cloud')
  const selected = []
  const streamText = options => {
    selected.push(options.model.provider)
    return textStream(`${options.model.provider} answer`)
  }
  const modelRouter = edgekit.createHybridModelRouter([
    { id: 'cloud-complex', model: [cloudModel], when: ({ input }) => input.includes('complex') },
  ], [localModel])
  const agent = edgekit.createAgent({ systemPrompt: 'Helpful.', model: [localModel], modelRouter, tools: {}, streamText })
  await drain(agent.send('simple lookup'))
  await drain(agent.send('complex planning task'))
  addCheck(checks, 'architecture', 'simple work stays on local route', selected[0] === 'local')
  addCheck(checks, 'architecture', 'complex work routes to cloud route', selected[1] === 'cloud')
  return `Selected routes: ${selected.join(', ')}`
}

async function probeSupervisorHandoff(checks) {
  const handoffs = []
  const cloudModel = fakeModel('cloud-worker')
  const localModel = fakeModel('local-supervisor')
  const router = edgekit.createSupervisorRouter({
    workers: [
      {
        id: 'account-save',
        intents: ['account save'],
        model: [cloudModel],
        onHandoff: envelope => handoffs.push(envelope),
      },
    ],
    fallback: [localModel],
  })
  const handoff = edgekit.createHandoffEnvelope({
    input: 'plan an account save workflow',
    intent: 'account-save',
    messages: [{ role: 'user', content: 'plan an account save workflow' }],
    session: {
      identity: { id: 'user-1', roles: ['admin'], claims: { token: 'secret-token' } },
      state: { route: '/accounts/acme', summary: 'Viewing ACME renewal risk.' },
    },
    memory: [{ id: 'pref', body: 'ACME wants annual billing.' }],
    tools: ['searchAccounts'],
    trace: { sessionId: 'session-1', runId: 'run-1', phase: 'send' },
  })
  const selected = await router({ input: 'account save planning', defaultModel: [localModel], messages: [], tools: {}, phase: 'send', handoff })
  const serialized = JSON.stringify(handoffs[0])
  addCheck(checks, 'architecture', 'supervisor selected worker route', selected[0].provider === 'cloud-worker')
  addCheck(checks, 'architecture', 'handoff includes state and memory', serialized.includes('ACME wants annual billing') && serialized.includes('/accounts/acme'))
  addCheck(checks, 'safety', 'handoff excludes secret identity claims', !serialized.includes('secret-token'))
  return serialized
}

async function probeResponseCache(checks) {
  const responseCache = edgekit.createMemoryResponseCache()
  await responseCache.set({ key: 'edgekit-cache:test', text: 'Cached answer.', createdAt: new Date().toISOString() })
  let calls = 0
  const agent = edgekit.createAgent({
    systemPrompt: 'Helpful.',
    model: [fakeModel()],
    tools: {},
    streamText: () => {
      calls += 1
      return textStream('Fresh answer.')
    },
    responseCache,
    cachePolicy: { key: () => 'edgekit-cache:test' },
  })
  const events = await collect(agent.send('business hours?'))
  addCheck(checks, 'architecture', 'cache bypasses model inference', calls === 0)
  addCheck(checks, 'resilience', 'cache emits useful answer', events.some(event => event.type === 'done' && event.text === 'Cached answer.'))
  addCheck(checks, 'observability', 'cache emits activity state', events.some(event => event.type === 'activity' && event.activity?.label === 'Using cached response'))
  return JSON.stringify(events)
}

async function probeToolRepair(checks) {
  let calls = 0
  const agent = edgekit.createAgent({
    systemPrompt: 'Helpful.',
    model: [fakeModel()],
    tools: { searchProducts: {} },
    streamText: () => {
      calls += 1
      if (calls === 1) {
        return {
          fullStream: (async function* () {
            yield { type: 'error', error: { name: 'AI_TypeValidationError', message: 'size must be a string' } }
          })(),
          response: Promise.resolve({ messages: [] }),
        }
      }
      return textStream('Found Nike Dunk Low in size 9.')
    },
    toolRepair: { maxAttempts: 2 },
  })
  const events = await collect(agent.send('find size nine dunks'))
  addCheck(checks, 'resilience', 'validation-shaped failure triggered repair retry', calls === 2)
  addCheck(checks, 'safety', 'repair failure was not shown as raw user error', !events.some(event => event.type === 'error'))
  addCheck(checks, 'answerQuality', 'repair produced useful final answer', events.some(event => event.type === 'done' && /Nike Dunk Low/.test(event.text)))
  return JSON.stringify(events)
}

async function probeMcpAdapter(checks) {
  const calls = []
  const tools = await edgekit.loadMcpTools({
    listTools: async () => ({ tools: [{ name: 'searchDocs', description: 'Search docs' }] }),
    callTool: async (name, input) => {
      calls.push({ name, input })
      return { results: ['ok'] }
    },
  })
  const result = await tools.searchDocs.execute({ query: 'edgekit' })
  addCheck(checks, 'architecture', 'MCP catalog loads into EdgeKit tools', Object.keys(tools).includes('searchDocs'))
  addCheck(checks, 'integration', 'MCP tool call preserves name and input', calls[0]?.name === 'searchDocs' && calls[0]?.input?.query === 'edgekit')
  addCheck(checks, 'answerQuality', 'MCP call returns adapter output', result.results?.[0] === 'ok')
  return JSON.stringify({ calls, result })
}

async function probeToolPolicy(checks) {
  const executor = edgekit.createToolPolicyExecutor({
    defaultPolicy: { timeoutMs: 20, maxInputBytes: 100, maxOutputBytes: 80, allowedTools: ['searchProducts', 'slowTool'] },
    policies: { slowTool: { timeoutMs: 5 } },
  })
  const allowed = await executor.execute({
    toolName: 'searchProducts',
    tool: { execute: async input => ({ ok: true, input }) },
    input: { query: 'dunks' },
    context: { session: {} },
  })
  const denied = await rejects(() => executor.execute({
    toolName: 'deleteEverything',
    tool: { execute: async () => ({ ok: true }) },
    input: {},
    context: { session: {} },
  }))
  const tooLarge = await rejects(() => executor.execute({
    toolName: 'searchProducts',
    tool: { execute: async () => ({ huge: 'x'.repeat(100) }) },
    input: { query: 'dunks' },
    context: { session: {} },
  }))
  const timeout = await rejects(() => executor.execute({
    toolName: 'slowTool',
    tool: { execute: async () => new Promise(resolve => setTimeout(() => resolve({ ok: true }), 30)) },
    input: {},
    context: { session: {} },
  }))
  addCheck(checks, 'architecture', 'policy allows expected tool', allowed.ok === true)
  addCheck(checks, 'safety', 'policy rejects unlisted tool', denied?.code === 'tool-not-allowed')
  addCheck(checks, 'safety', 'policy rejects oversized output', tooLarge?.code === 'output-too-large')
  addCheck(checks, 'resilience', 'policy times out slow tool', timeout?.code === 'timeout')
  return JSON.stringify({ allowed, denied: denied?.code, tooLarge: tooLarge?.code, timeout: timeout?.code })
}

async function probeOfflineJournal(checks) {
  const journal = edgekit.createMemoryMutationJournal({ now: () => '2026-05-25T00:00:00.000Z' })
  const executed = []
  const addToCart = edgekit.createOfflineTool({
    name: 'addToCart',
    tool: { execute: async (input, context) => ({ synced: true, input, user: context.identity?.id }) },
    journal,
    online: () => false,
    idempotencyKey: input => `cart:${input.productId}:${input.size}`,
  })
  const queued = await addToCart.execute({ productId: 'dunk', size: '11' }, { session: { identity: { id: 'user-1' } }, identity: { id: 'user-1' } })
  const synced = await edgekit.syncMutationJournal({
    journal,
    tools: { addToCart: { execute: async (input, context) => { executed.push(input); return { synced: true, user: context.identity?.id } } } },
    context: { session: { identity: { id: 'user-1' } }, identity: { id: 'user-1' } },
    online: () => true,
  })
  addCheck(checks, 'resilience', 'offline mutation is queued instead of dropped', queued.queued === true && (await journal.list())[0].status === 'synced')
  addCheck(checks, 'workflowState', 'offline sync replays original mutation input', executed[0]?.productId === 'dunk' && executed[0]?.size === '11')
  addCheck(checks, 'safety', 'offline sync preserves identity context', synced[0]?.output?.user === 'user-1')
  return JSON.stringify({ queued, synced })
}

async function probeParallelTools(checks) {
  const order = []
  const tools = {
    profile: { execute: async () => { order.push('profile-start'); await delay(20); order.push('profile-end'); return { plan: 'pro' } } },
    weather: { execute: async () => { order.push('weather-start'); await delay(10); order.push('weather-end'); return { temp: 72 } } },
    updateCart: { execute: async () => { order.push('cart'); return { ok: true } } },
  }
  const results = await edgekit.executeParallelTools({
    calls: [
      { id: 'call-1', toolName: 'profile', input: {} },
      { id: 'call-2', toolName: 'weather', input: {} },
      { id: 'call-3', toolName: 'updateCart', input: {} },
    ],
    tools,
    manifests: [
      { name: 'profile', tool: tools.profile, readOnly: true, parallelSafe: true },
      { name: 'weather', tool: tools.weather, readOnly: true, parallelSafe: true },
      { name: 'updateCart', tool: tools.updateCart },
    ],
    context: { session: {} },
  })
  addCheck(checks, 'architecture', 'read-only tools started concurrently', order.slice(0, 2).sort().join(',') === 'profile-start,weather-start')
  addCheck(checks, 'safety', 'unsafe mutation ran after safe batch', order.at(-1) === 'cart')
  addCheck(checks, 'workflowState', 'parallel executor returns ordered results', results.map(result => result.id).join(',') === 'call-1,call-2,call-3')
  return JSON.stringify({ order, results })
}

async function probePiiRedaction(checks) {
  const redactor = edgekit.createPiiRedactor()
  const agent = edgekit.createAgent({
    systemPrompt: 'Helpful.',
    model: [fakeModel()],
    tools: { lookupAccount: {} },
    streamText: () => ({
      fullStream: (async function* () {
        yield { type: 'tool-result', toolCallId: 'tool-1', toolName: 'lookupAccount', output: { email: 'sam@example.com', phone: '555-123-4567' } }
      })(),
      response: Promise.resolve({ messages: [{ role: 'assistant', content: [{ type: 'text', text: 'done' }] }] }),
    }),
    redactors: redactor,
  })
  const events = await collect(agent.send('look up the account'))
  const serialized = JSON.stringify(events)
  addCheck(checks, 'safety', 'email is redacted from tool result events', serialized.includes('[REDACTED:email]') && !serialized.includes('sam@example.com'))
  addCheck(checks, 'safety', 'phone is redacted from tool result events', serialized.includes('[REDACTED:phone]') && !serialized.includes('555-123-4567'))
  return serialized
}

async function probeNoModelFallback(checks) {
  const statuses = []
  const agent = edgekit.createAgent({
    systemPrompt: 'Helpful.',
    model: [edgekit.createModelProvider({ id: 'empty', label: 'Empty', resolve: async () => null })],
    tools: {},
    onModelStatus: ({ status }) => { statuses.push(status) },
    onNoModel: ({ input }) => `Fallback answer for ${input}`,
  })
  const events = await collect(agent.send('hello'))
  addCheck(checks, 'resilience', 'unavailable provider emits no-model event', events.some(event => event.type === 'no-model'))
  addCheck(checks, 'answerQuality', 'fallback still returns user-visible answer', events.some(event => event.type === 'no-model' && /Fallback answer/.test(event.message)))
  addCheck(checks, 'transparency', 'provider unavailable status is recorded', statuses.includes('unavailable'))
  return JSON.stringify({ statuses, events })
}

async function probeMissionProfileValidation(checks) {
  const profile = edgekit.createMissionProfile({
    id: 'catalog-v1',
    mission: 'public-catalog-shopping',
    version: '1.0.0',
    systemPrompt: 'Use catalog tools and surface prices and sizes.',
    requiredTools: ['searchProducts', 'addToCart'],
    defaults: { toolChoice: 'required' },
    synthesis: { requiredAttributes: ['price', 'sizes'], style: 'explicit' },
  })
  const complete = edgekit.validateMissionProfile(profile, { registeredTools: ['searchProducts', 'addToCart'] })
  const missing = edgekit.validateMissionProfile(profile, { registeredTools: ['searchProducts'] })
  const invalid = edgekit.validateMissionProfile(edgekit.createMissionProfile({
    id: 'broken-v1',
    mission: 'docs-qa',
    version: '1.0.0',
    systemPrompt: 'Search docs first.',
    defaults: { toolChoice: 'required' },
  }))

  addCheck(checks, 'architecture', 'complete Mission Profile validates cleanly', complete.ok && complete.errors.length === 0)
  addCheck(checks, 'integration', 'missing registered required tool is detected', missing.errors.some(issue => issue.code === 'missing-registered-tool' && issue.message.includes('addToCart')))
  addCheck(checks, 'resilience', 'toolChoice required without tool contract fails fast', invalid.errors.some(issue => issue.code === 'required-tool-choice-without-tools'))
  addCheck(checks, 'safety', 'profile validation remains structural and does not execute tools', complete.ok && missing.ok === false && invalid.ok === false)
  return JSON.stringify({ complete, missing, invalid })
}

function selectPrompts(prompts, salt) {
  if (!prompts.length) return ['']
  const shuffled = [...prompts].sort((a, b) => seededNumber(`${seed}:${salt}:${a}`) - seededNumber(`${seed}:${salt}:${b}`))
  return promptLimit > 0 ? shuffled.slice(0, promptLimit) : shuffled
}

function makeResult({ id, suiteId, title, layer, required, prompt, checks, transcript, screenshot, notes, durationMs }) {
  const passed = checks.filter(check => check.passed).length
  const total = checks.length
  const failedRequiredCheck = checks.some(check => !check.passed && check.required !== false)
  return {
    id,
    suiteId,
    title,
    layer,
    required,
    prompt,
    outcome: failedRequiredCheck ? 'failed' : 'passed',
    score: total === 0 ? 0 : round(passed / total),
    durationMs,
    checks,
    transcript: compactText(transcript),
    screenshot,
    notes,
  }
}

function skippedResult(id, surface, prompt, notes) {
  return {
    id,
    suiteId: id,
    title: surface,
    layer: 'browser',
    required: false,
    prompt,
    outcome: 'skipped',
    score: 0,
    durationMs: 0,
    checks: [],
    transcript: '',
    screenshot: '',
    notes,
  }
}

function summarize(results, evalRubric) {
  const byCategory = {}
  let passed = 0
  let failed = 0
  let skipped = 0
  let requiredFailed = 0
  let requiredSkipped = 0
  let scoreTotal = 0
  let scored = 0
  for (const result of results) {
    if (result.outcome === 'passed') passed += 1
    if (result.outcome === 'failed') {
      failed += 1
      if (result.required) requiredFailed += 1
    }
    if (result.outcome === 'skipped') {
      skipped += 1
      if (result.required) requiredSkipped += 1
    }
    if (result.outcome !== 'skipped') {
      scored += 1
      scoreTotal += result.score
    }
    for (const check of result.checks) {
      byCategory[check.category] ??= { passed: 0, failed: 0, score: 0, threshold: evalRubric.thresholds.categories[check.category] ?? 0 }
      if (check.passed) byCategory[check.category].passed += 1
      else byCategory[check.category].failed += 1
    }
  }
  for (const category of Object.values(byCategory)) {
    const total = category.passed + category.failed
    category.score = total === 0 ? 0 : round(category.passed / total)
    category.meetsThreshold = category.score >= category.threshold
  }
  const averageScore = scored === 0 ? 0 : round(scoreTotal / scored)
  const confidenceCategories = Object.values(byCategory).filter(category => category.passed + category.failed > 0)
  const confidenceRating = confidenceCategories.length === 0
    ? 0
    : round(confidenceCategories.reduce((total, category) => total + category.score, 0) / confidenceCategories.length)
  const categoryFailures = Object.entries(byCategory)
    .filter(([, value]) => !value.meetsThreshold)
    .map(([name, value]) => ({ name, score: value.score, threshold: value.threshold }))
  const meetsRubric =
    requiredFailed === evalRubric.thresholds.requiredFailureCount &&
    requiredSkipped <= (evalRubric.thresholds.maxRequiredSkipped ?? 0) &&
    averageScore >= evalRubric.thresholds.overallScore &&
    confidenceRating >= (evalRubric.thresholds.minimumConfidenceRating ?? evalRubric.thresholds.overallScore) &&
    categoryFailures.length === 0
  return {
    total: results.length,
    passed,
    failed,
    skipped,
    requiredFailed,
    requiredSkipped,
    averageScore,
    confidenceRating,
    byCategory,
    categoryFailures,
    meetsRubric,
    confidenceBand: confidenceBand(evalRubric, Math.min(averageScore, confidenceRating), meetsRubric),
  }
}

function renderMarkdown(payload) {
  const rows = payload.results
    .map(result => `| ${result.id} | ${result.layer} | ${result.outcome} | ${result.score} | ${result.required ? 'yes' : 'no'} | ${result.durationMs} |`)
    .join('\n')
  const categories = Object.entries(payload.summary.byCategory)
    .map(([name, value]) => `| ${name} | ${value.score} | ${value.threshold} | ${value.passed} | ${value.failed} | ${value.meetsThreshold ? 'yes' : 'no'} |`)
    .join('\n')
  const failures = payload.results
    .filter(result => result.outcome === 'failed')
    .map(result => {
      const checks = result.checks
        .filter(check => !check.passed)
        .map(check => `- ${check.category}: ${check.label}${check.details ? ` (${check.details})` : ''}`)
        .join('\n')
      return `## ${result.id}\n\n${checks}\n\n\`\`\`text\n${result.transcript.slice(0, 2000)}\n\`\`\``
    })
    .join('\n\n')

  return `# EdgeKit Expansive Agent Suite

Generated: ${payload.generatedAt}

Target: ${payload.target}

Seed: ${payload.seed}

Site: ${payload.siteURL}

Meets rubric: ${payload.summary.meetsRubric ? 'yes' : 'no'}

Confidence band: ${payload.summary.confidenceBand}

Summary:

- Passed: ${payload.summary.passed}
- Failed: ${payload.summary.failed}
- Skipped: ${payload.summary.skipped}
- Required failed: ${payload.summary.requiredFailed}
- Required skipped: ${payload.summary.requiredSkipped}
- Average score: ${payload.summary.averageScore}
- Confidence rating: ${payload.summary.confidenceRating}

## Category Scores

| Category | Score | Threshold | Passed | Failed | Meets |
| --- | ---: | ---: | ---: | ---: | --- |
${categories}

## Scenario Results

| Scenario | Layer | Outcome | Score | Required | Duration ms |
| --- | --- | --- | ---: | --- | ---: |
${rows}

${failures || 'No failed scenarios.'}
`
}

function renderProviderMatrixMarkdown(payload) {
  const rows = payload.results
    .map(result => `| ${result.id} | ${result.outcome} | ${result.score} | ${result.required ? 'yes' : 'no'} | ${result.durationMs} |`)
    .join('\n')
  const details = payload.results
    .map(result => {
      const checks = result.checks
        .map(check => `- ${check.passed ? 'PASS' : 'FAIL'} [${check.category}] ${check.label}${check.details ? `: ${check.details}` : ''}`)
        .join('\n')
      return `## ${result.id}\n\n${checks}\n\n\`\`\`text\n${String(result.transcript ?? '').slice(0, 1500)}\n\`\`\``
    })
    .join('\n\n')

  return `# EdgeKit Provider Matrix

Generated: ${payload.generatedAt}

Target: ${payload.target}

Site: ${payload.siteURL}

Browser mode: ${JSON.stringify(payload.browserMode)}

Require real providers: ${payload.requireRealProviders ? 'yes' : 'no'}

| Provider | Outcome | Score | Required | Duration ms |
| --- | --- | ---: | --- | ---: |
${rows}

${details}
`
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

async function waitForAnswerAfterPrompt(locator, prompt, expected, timeout = 15_000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const text = await locator.innerText().catch(() => '')
    const promptIndex = text.lastIndexOf(prompt)
    const answer = promptIndex >= 0 ? text.slice(promptIndex + prompt.length) : text
    if (typeof expected === 'string' ? answer.includes(expected) : expected.test(answer)) return text
    await delay(200)
  }
  const text = await locator.innerText().catch(() => '')
  throw new Error(`Timed out waiting for answer matching ${String(expected)}. Last text: ${compactText(text)}`)
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

async function ensureServer({ url, label, cwd, cmd, args }) {
  if (await isReady(url)) return
  const server = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], env: process.env })
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

function fakeModel(provider = 'fake') {
  return { provider, modelId: provider, specificationVersion: 'v3' }
}

function textStream(text) {
  return {
    fullStream: (async function* () {
      yield { type: 'text-delta', delta: text }
    })(),
    response: Promise.resolve({ messages: [{ role: 'assistant', content: [{ type: 'text', text }] }] }),
  }
}

async function collect(iterable) {
  const events = []
  for await (const event of iterable) events.push(event)
  return events
}

async function drain(iterable) {
  for await (const _ of iterable) {
    // drain
  }
}

async function rejects(fn) {
  try {
    await fn()
    return null
  } catch (error) {
    return error
  }
}

function confidenceBand(evalRubric, score, meetsRubric) {
  if (!meetsRubric) return 'release-blocked'
  return [...evalRubric.confidenceBands]
    .sort((a, b) => b.minimumScore - a.minimumScore)
    .find(band => score >= band.minimumScore)?.name ?? 'unknown'
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

function readableError(error) {
  return error instanceof Error ? error.message : String(error)
}

function round(value) {
  return Math.round(value * 1000) / 1000
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function hash(value) {
  let output = 0
  for (const char of String(value)) output = ((output << 5) - output + char.charCodeAt(0)) | 0
  return Math.abs(output).toString(36)
}

function seededNumber(value) {
  let output = seed >>> 0
  for (const char of String(value)) {
    output ^= char.charCodeAt(0)
    output = Math.imul(output, 16777619)
  }
  return (output >>> 0) / 4294967295
}
