import { expect, test } from '@playwright/test'

const siteURL = 'http://127.0.0.1:4174/edgekit/'

test('homepage links into the full documentation site', async ({ page }) => {
  await page.goto(siteURL)

  await expect(page.getByRole('heading', { name: 'Add an agent to your app without handing every interaction to a cloud meter.' })).toBeVisible()
  await expect(page.locator('.value-matrix article')).toHaveCount(8)
  await expect(page.getByRole('heading', { name: 'Token costs become an open-ended liability.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Sensitive app context crosses the wrong boundary.' })).toBeVisible()
  await expect(page.locator('.primitive-list a')).toHaveCount(8)
  await expect(page.getByRole('heading', { name: 'Start with the thesis, then jump to the implementation surface.' })).toBeVisible()
  await expect(page.locator('#doc-card-grid a.doc-card')).toHaveCount(10)
  await expect(page.locator('.demo-grid a.demo-card')).toHaveCount(5)
  await expect(page.locator('.site-header nav').getByRole('link', { name: 'Admin' })).toHaveCount(0)
  await expect(page.locator('edge-chat')).toHaveCount(1)
  await expect(page.locator('#site-assistant')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Live ecommerce Product search and guarded add-to-cart' })).toHaveAttribute(
    'href',
    'demos/ecommerce/',
  )

  await page.getByRole('link', { name: 'Read the docs' }).click()
  await expect(page).toHaveURL(/\/edgekit\/docs\/$/)
  await expect(page.getByRole('heading', { name: 'Local-first agent sidecars' })).toBeVisible()
})

test('agent-readable documentation exports are available', async ({ page }) => {
  const llms = await page.request.get(`${siteURL}llms.txt`)
  expect(llms.ok()).toBeTruthy()
  await expect(llms.text()).resolves.toContain('edgekit is a browser-native agent runtime')

  const full = await page.request.get(`${siteURL}llms-full.txt`)
  expect(full.ok()).toBeTruthy()
  await expect(full.text()).resolves.toContain('# Local-first agent sidecars')

  const advanced = await page.request.get(`${siteURL}docs/advanced.md`)
  expect(advanced.ok()).toBeTruthy()
  await expect(advanced.text()).resolves.toContain('## Offline mutation journal')
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

  await page.getByRole('link', { name: 'Testing' }).click()
  await expect(page).toHaveURL(/\/edgekit\/docs\/testing\/$/)
  await expect(page.getByRole('heading', { name: 'Testing agent workflows' })).toBeVisible()
  await expect(page.locator('pre code').filter({ hasText: 'pnpm eval:models' })).toBeVisible()

  await page.getByRole('link', { name: 'Enterprise' }).click()
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

test('dogfood assistant is mounted across docs and demo pages', async ({ page }) => {
  await page.goto(`${siteURL}docs/`)
  await expect(page.locator('#site-assistant')).toBeVisible()
  await page.locator('#site-assistant .site-assistant-toggle').click()
  await expect(page.locator('#site-assistant edge-chat')).toBeVisible()

  await page.goto(`${siteURL}demos/docs/`)
  await expect(page.getByRole('heading', { name: 'Docs Q&A demo' })).toBeVisible()
  await expect(page.locator('#site-assistant')).toBeVisible()
  await expect(page.locator('#qa edge-chat#docs-chat')).toBeVisible()
})
