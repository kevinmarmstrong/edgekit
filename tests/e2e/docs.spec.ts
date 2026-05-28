import { expect, test } from '@playwright/test'

const siteURL = 'http://127.0.0.1:4174/edgekit/'

test('homepage links into the full documentation site', async ({ page }) => {
  await page.goto(siteURL)

  await expect(page.getByRole('heading', { name: "Add an AI agent to your existing app. Don't rewrite the app." })).toBeVisible()
  await expect(page.locator('.home-summary-grid article')).toHaveCount(4)
  await expect(page.getByRole('heading', { name: 'Add agents where the work already happens.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Use local models for bounded app work.' })).toBeVisible()
  await expect(page.locator('.home-proof-grid article')).toHaveCount(3)
  await expect(page.locator('.primitive-list a')).toHaveCount(8)
  await expect(page.getByRole('heading', { name: 'Read by job, not by marketing funnel.' })).toBeVisible()
  await expect(page.locator('#doc-card-grid a.doc-card')).toHaveCount(31)
  await expect(page.locator('a.doc-card[href="/edgekit/docs/should-i-use-edgekit/"]')).toBeVisible()
  await expect(page.locator('a.doc-card[href="/edgekit/docs/framework-recipes/"]')).toBeVisible()
  await expect(page.locator('a.doc-card[href="/edgekit/docs/faq/"]')).toBeVisible()
  await expect(page.locator('a.doc-card[href="/edgekit/docs/glossary/"]')).toBeVisible()
  await expect(page.locator('a.doc-card[href="/edgekit/docs/proof-center/"]')).toBeVisible()
  await expect(page.locator('a.doc-card[href="/edgekit/docs/enterprise-evaluation/"]')).toBeVisible()
  await expect(page.locator('a.doc-card[href="/edgekit/docs/mission-profiles/"]')).toBeVisible()
  await expect(page.locator('a.doc-card[href="/edgekit/docs/skill-optimization/"]')).toBeVisible()
  await expect(page.locator('a.doc-card[href="/edgekit/docs/knowledge-access/"]')).toBeVisible()
  await expect(page.locator('a.doc-card[href="/edgekit/docs/adoption-kit/"]')).toBeVisible()
  await expect(page.locator('a.doc-card[href="/edgekit/docs/recipes/"]')).toBeVisible()
  await expect(page.locator('a.doc-card[href="/edgekit/docs/reproducibility/"]')).toBeVisible()
  await expect(page.locator('a.doc-card[href="/edgekit/docs/production/"]')).toBeVisible()
  await expect(page.locator('a.doc-card[href="/edgekit/docs/runtime-guarantees/"]')).toBeVisible()
  await expect(page.locator('a.doc-card[href="/edgekit/docs/30-minute-sidecar/"]')).toBeVisible()
  await expect(page.locator('a.doc-card[href="/edgekit/docs/outcome-quality/"]')).toBeVisible()
  await expect(page.locator('.demo-grid a.demo-card')).toHaveCount(7)
  await expect(page.locator('.site-header nav').getByRole('link', { name: 'Admin' })).toHaveCount(0)
  await expect(page.locator('edge-chat')).toHaveCount(1)
  await expect(page.locator('#site-assistant')).toBeVisible()
  await expect(page.locator('a.demo-card[href="https://edgekit-demo-ecommerce.pages.dev/"]')).toBeVisible()
  await expect(page.locator('a.demo-card[href="/edgekit/demos/operations/"]')).toBeVisible()
  await expect(page.locator('a.demo-card[href="/edgekit/demos/cascade/"]')).toBeVisible()

  await page.locator('.site-header nav').getByRole('link', { name: 'Docs' }).click()
  await expect(page).toHaveURL(/\/edgekit\/docs\/$/)
  await expect(page.getByRole('heading', { name: 'Agent-operable software' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Implementation boundary' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Runtime loop' })).toBeVisible()
  await expect(page.locator('.architecture-diagram').first()).toBeVisible()
})

test('agent-readable documentation exports are available', async ({ page }) => {
  const llms = await page.request.get(`${siteURL}llms.txt`)
  expect(llms.ok()).toBeTruthy()
  await expect(llms.text()).resolves.toContain('Edgekit helps teams add agents to existing web apps')
  const llmsText = await llms.text()
  expect(llmsText).toContain('(/edgekit/llms-full.txt)')
  expect(llmsText).toContain('(/edgekit/llms-maintainers.txt)')
  expect(llmsText).toContain('(/edgekit/docs/should-i-use-edgekit.md)')
  expect(llmsText).toContain('(/edgekit/docs/framework-recipes.md)')
  expect(llmsText).toContain('(/edgekit/docs/knowledge-access.md)')
  expect(llmsText).not.toContain('](/docs/')
  expect(llmsText).not.toContain('](/demos/')

  const full = await page.request.get(`${siteURL}llms-full.txt`)
  expect(full.ok()).toBeTruthy()
  await expect(full.text()).resolves.toContain('# edgekit adopter implementation export')
  await expect(full.text()).resolves.toContain('# Agent-operable software')
  await expect(full.text()).resolves.toContain('# Framework recipes')
  const fullText = await full.text()
  expect(fullText.length).toBeLessThan(50_000)
  expect(fullText).not.toContain('# Reproducibility and provider evidence')

  const maintainers = await page.request.get(`${siteURL}llms-maintainers.txt`)
  expect(maintainers.ok()).toBeTruthy()
  await expect(maintainers.text()).resolves.toContain('# edgekit maintainer and release evidence export')
  await expect(maintainers.text()).resolves.toContain('# Maintainer reproducibility guide')

  const advanced = await page.request.get(`${siteURL}docs/advanced.md`)
  expect(advanced.ok()).toBeTruthy()
  await expect(advanced.text()).resolves.toContain('## Offline mutation journal')

  const reproducibility = await page.request.get(`${siteURL}docs/reproducibility.md`)
  expect(reproducibility.ok()).toBeTruthy()
  await expect(reproducibility.text()).resolves.toContain('## Provider matrix')
})

test('mission control dashboard aggregates public demo telemetry', async ({ page }) => {
  await page.goto(`${siteURL}demos/mission-control/?cacheBust=${Date.now()}`)

  await expect(page.locator('#mc-runs')).toHaveText('0')
  await page.locator('#site-assistant .site-assistant-toggle').click()
  const assistant = page.locator('#site-assistant')
  await assistant.getByTestId('chat-input').fill('what demos can I try?')
  await assistant.getByTestId('send-button').click()

  await expect(page.locator('#mc-runs')).toHaveText('1')
  await expect(page.locator('#mc-last-event')).toContainText('run-finish')
})

test('public site renders AG-UI compatible declarative UI demo', async ({ page }) => {
  await page.goto(`${siteURL}demos/ag-ui/?cacheBust=${Date.now()}`)

  const agui = page.locator('#agui')
  await expect(agui).toContainText('AG-UI ecosystem demo')
  await agui.getByTestId('chat-input').fill('triage the support queue')
  await agui.getByTestId('send-button').click()

  await expect(agui.getByText('Open support queue')).toBeVisible()
  await expect(agui.getByText('Create a support ticket')).toBeVisible()
  await agui.getByTestId('action-field-category').selectOption('orders')
  await agui.getByTestId('action-field-priority').selectOption('urgent')
  await agui.getByTestId('action-run-button').click()

  await expect(agui.getByTestId('chat-messages')).toContainText('Created a urgent orders support ticket')
})

test('public AG-UI demo discloses the scripted stream and shows component variants', async ({ page }) => {
  await page.goto(`${siteURL}demos/ag-ui/?cacheBust=${Date.now()}`)

  const agui = page.locator('#agui')
  await expect(agui).toContainText('scripted AG-UI-compatible event source')

  await agui.getByTestId('chat-input').fill('what other components do you have for the UI?')
  await agui.getByTestId('send-button').click()

  await expect(agui.getByText('EdgeView component contract')).toBeVisible()
  await expect(agui.getByRole('cell', { name: 'Text', exact: true })).toBeVisible()
  await expect(agui.getByRole('cell', { name: 'Card', exact: true })).toBeVisible()
  await expect(agui.getByRole('cell', { name: 'Form', exact: true })).toBeVisible()
  await expect(agui.getByRole('cell', { name: 'Table', exact: true })).toBeVisible()
  await expect(agui.getByRole('cell', { name: 'Chart', exact: true })).toBeVisible()

  await agui.getByTestId('chat-input').fill('is this hard coded?')
  await agui.getByTestId('send-button').click()

  await expect(agui.getByText('Yes. This public Pages demo uses a local scripted AG-UI event source')).toBeVisible()
  await expect(agui.getByText('What is scripted here')).toBeVisible()
})

test('public AG-UI demo can render a requested fillable form', async ({ page }) => {
  await page.goto(`${siteURL}demos/ag-ui/?cacheBust=${Date.now()}`)

  const agui = page.locator('#agui')
  await agui.getByTestId('chat-input').fill('Create a form for me to fill in')
  await agui.getByTestId('send-button').click()

  await expect(agui.getByText('Sample intake form')).toBeVisible()
  await agui.getByTestId('action-field-name').fill('Kevin')
  await agui.getByTestId('action-field-useCase').selectOption('shopping')
  await agui.getByTestId('action-field-urgency').selectOption('urgent')
  await agui.getByTestId('action-run-button').click()

  await expect(agui.getByTestId('chat-messages')).toContainText('Submitted urgent shopping request for Kevin')
})

test('docs pages expose core documentation sections and navigation', async ({ page }) => {
  await page.goto(`${siteURL}docs/api/`)

  await expect(page.getByRole('heading', { name: 'API reference' })).toBeVisible()
  await expect(page.getByText('createAgent(options)')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Approval resume' })).toBeVisible()

  await page.goto(`${siteURL}docs/testing/`)
  await expect(page).toHaveURL(/\/edgekit\/docs\/testing\/$/)
  await expect(page.getByRole('heading', { name: 'Maintainer testing loops' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Maintainer deterministic workflow tests' })).toBeVisible()
  await expect(page.locator('pre code').filter({ hasText: 'pnpm eval:models' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Research loops' })).toBeVisible()
  await expect(page.locator('pre code').filter({ hasText: 'pnpm research:agents' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Expansive outcome suite' })).toBeVisible()
  await expect(page.locator('pre code').filter({ hasText: 'pnpm research:suite' })).toBeVisible()
  await expect(page.locator('pre code').filter({ hasText: 'pnpm research:full' })).toBeVisible()

  await page.goto(`${siteURL}docs/framework-recipes/`)
  await expect(page.getByRole('heading', { name: 'Framework recipes' })).toBeVisible()
  await expect(page.locator('.docs-article edge-chat')).toHaveCount(0)
  await expect(page.locator('.docs-article code').filter({ hasText: '<edge-chat>' }).first()).toBeVisible()

  await page.goto(`${siteURL}docs/should-i-use-edgekit/`)
  await expect(page.locator('.docs-next').getByRole('link', { name: /Next: Quick Start/ })).toBeVisible()

  await page.getByRole('link', { name: 'Enterprise', exact: true }).click()
  await expect(page).toHaveURL(/\/edgekit\/docs\/advanced\/$/)
  await expect(page.getByRole('heading', { name: 'Enterprise controls' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Identity and session context' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Hybrid routing' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Markdown memory stores' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Memory compaction' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Supervisor routing' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Cross-agent handoffs' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tool repair loop' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Streaming activity states' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Edge response cache' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Parallel-safe tools' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Offline mutation journal' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Guarded tool execution' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Roadmap' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'PII/PHI redaction' })).toBeVisible()

  await page.locator('.docs-sidebar').getByRole('link', { name: 'Ecosystem', exact: true }).click()
  await expect(page).toHaveURL(/\/edgekit\/docs\/ecosystem\/$/)
  await expect(page.getByRole('heading', { name: 'Ecosystem and integrations' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'MCP adapters' })).toBeVisible()

  await page.locator('.docs-sidebar').getByRole('link', { name: 'Interface', exact: true }).click()
  await expect(page).toHaveURL(/\/edgekit\/docs\/ui\/$/)
  await expect(page.getByRole('heading', { name: 'React wrapper' })).toBeVisible()
})

test('site assistant is mounted across docs and demo pages', async ({ page }) => {
  await page.goto(`${siteURL}docs/`)
  await expect(page.locator('#site-assistant')).toBeVisible()
  await page.locator('#site-assistant .site-assistant-toggle').click()
  await expect(page.locator('#site-assistant edge-chat')).toBeVisible()

  await page.goto(`${siteURL}demos/docs/`)
  await expect(page.getByRole('heading', { name: 'Docs Q&A demo' })).toBeVisible()
  await expect(page.locator('#site-assistant')).toBeVisible()
  await expect(page.locator('#qa edge-chat#docs-chat')).toBeVisible()
})

test('public demos expose cascade readiness without forcing model downloads', async ({ page }) => {
  await page.goto(`${siteURL}demos/docs/?cacheBust=${Date.now()}`)
  const docsWizard = page.locator('#qa edge-cascade-wizard').getByTestId('cascade-wizard')
  await expect(docsWizard).toBeVisible()
  await expect(docsWizard).toContainText(/Cascade readiness/)
  await expect(docsWizard).toContainText(/Chrome AI|basic mode|fallback|unavailable/i)
  await expect(page.getByTestId('download-prompt')).toHaveCount(0)

  await page.goto(`${siteURL}demos/ecommerce/?cacheBust=${Date.now()}`)
  await expect(page.getByRole('heading', { name: 'The ecommerce demo now runs outside the monorepo.' })).toBeVisible()
  await expect(page.locator('#ecommerce edge-cascade-wizard')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Open external ecommerce demo' })).toHaveAttribute(
    'href',
    'https://edgekit-demo-ecommerce.pages.dev/',
  )
})

test('cascade and permission lab exercises model, permission, validation, fallback, and reset flows', async ({ page }) => {
  await page.goto(`${siteURL}demos/cascade/?cacheBust=${Date.now()}`)

  await expect(page.getByRole('heading', { name: 'Cascade and permission lab' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'What a user would actually see.' })).toBeVisible()
  await page.locator('#cascade-live-check').click()
  await expect(page.locator('#cascade-live-decision')).not.toHaveText('Waiting for check')
  await expect(page.locator('#cascade-live-providers')).toContainText(/Chrome AI|WebLLM|No provider/)
  if (await page.locator('#cascade-live-basic').isVisible()) {
    await page.locator('#cascade-live-basic').click()
    await expect(page.locator('#cascade-live-decision')).toHaveText('Show transparent basic mode')
    await expect(page.locator('#cascade-live-preference')).toContainText('basic mode')
  }
  await page.locator('#cascade-live-hide').click()
  await expect(page.locator('#cascade-live-decision')).toHaveText('Hide assistant entry point')
  await page.locator('#cascade-live-reset').click()
  await expect(page.locator('#cascade-live-decision')).toHaveText('Waiting for check')

  await page.locator('#cascade-run').click()

  await expect(page.locator('#cascade-action')).toHaveText('Use local agent')
  await expect(page.locator('#cascade-feature-state')).toHaveText('Full agent')
  await expect(page.locator('#cascade-providers')).toContainText('Chrome AI / Nano: ready')
  await expect(page.locator('#cascade-validation')).toContainText('warning')

  await page.locator('#cascade-browser').selectOption('nano-downloadable')
  await page.locator('#cascade-download-policy').selectOption('prompt')
  await page.locator('#cascade-run').click()
  await expect(page.locator('#cascade-action')).toHaveText('Enable local AI')
  await expect(page.locator('#cascade-message')).toContainText('consent')
  await page.locator('#cascade-accept-download').click()
  await expect(page.locator('#cascade-action')).toHaveText('Use local agent')

  await page.locator('#cascade-workflow').selectOption('shopping')
  await page.locator('#cascade-role').selectOption('visitor')
  await page.locator('#cascade-run').click()
  await expect(page.locator('#cascade-feature-state')).toHaveText('Needs setup')
  await expect(page.locator('#cascade-validation-message')).toContainText('addToCart')
  await expect(page.locator('#cascade-copy')).toContainText('Do not enable the full agent')

  await page.locator('#cascade-role').selectOption('customer')
  await page.locator('#cascade-approvals').uncheck()
  await page.locator('#cascade-run').click()
  await expect(page.locator('#cascade-capabilities')).toContainText('Missing: approvals')
  await expect(page.locator('#cascade-action')).toHaveText('Complete setup')

  await page.locator('#cascade-browser').selectOption('unsupported')
  await page.locator('#cascade-fallback').check()
  await page.locator('#cascade-approvals').check()
  await page.locator('#cascade-workflow').selectOption('docs')
  await page.locator('#cascade-role').selectOption('visitor')
  await page.locator('#cascade-run').click()
  await expect(page.locator('#cascade-feature-state')).toHaveText('Basic mode available')
  await page.locator('#cascade-hide').click()
  await expect(page.locator('#cascade-feature-state')).toHaveText('Hidden')

  await page.locator('#cascade-reset').click()
  await expect(page.locator('#cascade-feature-state')).toHaveText('Full agent')
  await expect(page.locator('#cascade-json')).toContainText('"browser": "chrome-ready"')
})
