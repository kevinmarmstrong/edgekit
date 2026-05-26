import { expect, test } from '@playwright/test'

const siteURL = 'http://127.0.0.1:4174/edgekit/'

test('public ecommerce agent answers catalog questions with actionable product facts', async ({ page }) => {
  await page.goto(`${siteURL}demos/ecommerce/?cacheBust=${Date.now()}`)

  const commerce = page.locator('#ecommerce')
  await commerce.getByTestId('chat-input').fill('how much are Nike dunks and what sizes are carried?')
  await commerce.getByTestId('send-button').click()

  const messages = commerce.getByTestId('chat-messages')
  await expect(messages).toContainText('Nike Dunk Low')
  await expect(messages).toContainText('$64.99')
  await expect(messages).toContainText('sizes 9, 10, 11')
  await expect(messages).toContainText('White / Black')
  await expect(page.locator('#cart-state')).toContainText('No items yet')

  await commerce.getByTestId('chat-input').fill('show running shoes under $100 size 10')
  await commerce.getByTestId('send-button').click()

  await expect(messages).toContainText('Nike Air Zoom Pegasus')
  await expect(messages).toContainText('$89.99')
  await expect(messages).toContainText('sizes 9, 10, 10.5, 11')
})

test('public ecommerce sidecar executes generated add-to-cart action card', async ({ page }) => {
  await page.goto(`${siteURL}demos/ecommerce/?commerceAgentMode=scripted&cacheBust=${Date.now()}`)

  const commerce = page.locator('#ecommerce')
  await commerce.getByTestId('chat-input').fill('how much are Nike dunks and what sizes are carried?')
  await commerce.getByTestId('send-button').click()

  const dunkCard = commerce.getByTestId('action-card').filter({ hasText: 'Nike Dunk Low' }).first()
  await expect(dunkCard).toContainText('Add Nike Dunk Low to cart')
  await expect(dunkCard).toContainText('$64.99')
  await expect(page.locator('#cart-state')).toContainText('No items yet')

  await dunkCard.getByTestId('action-field-size').selectOption('11')
  await dunkCard.getByTestId('action-run-button').click()

  await expect(commerce.getByTestId('chat-messages')).toContainText('Added Nike Dunk Low to your cart')
  await expect(page.locator('#cart-state')).toContainText('1x Nike Dunk Low (size 11)')
})

test('standalone ecommerce scripted loop searches, renders CTA, and mutates only after user action', async ({ page }) => {
  await page.goto('/?agentMode=scripted')

  await page.getByTestId('chat-input').fill('how much are Nike dunks and what sizes are carried?')
  await page.getByTestId('send-button').click()

  await expect(page.getByTestId('chat-messages')).toContainText('Nike Dunk Low')
  await expect(page.getByTestId('action-card')).toContainText('Add Nike Dunk Low to cart')
  await expect(page.getByTestId('action-card')).toContainText('$64.99')
  await expect(page.getByTestId('approval-prompt')).toHaveCount(0)
  await expect(page.locator('#cart-state')).toContainText('No items yet')

  await page.getByTestId('action-field-size').selectOption('11')
  await page.getByTestId('action-run-button').click()

  await expect(page.getByTestId('chat-messages')).toContainText('Added Nike Dunk Low to your cart')
  await expect(page.locator('#cart-state')).toContainText('1x Nike Dunk Low (size 11)')
})

test('docs Q&A and dogfood assistant answer project questions instead of generic chat', async ({ page }) => {
  await page.goto(`${siteURL}demos/docs/?cacheBust=${Date.now()}`)

  const docsDemo = page.locator('#qa')
  await docsDemo.getByTestId('chat-input').fill('what problem does edgekit solve for token costs?')
  await docsDemo.getByTestId('send-button').click()

  const docsMessages = docsDemo.getByTestId('chat-messages')
  await expect(docsMessages).toContainText(/token|cost|cloud/i)
  await expect(docsMessages).toContainText(/edgekit|browser|local/i)

  await page.locator('#site-assistant .site-assistant-toggle').click()
  const assistant = page.locator('#site-assistant')
  await assistant.getByTestId('chat-input').fill('what demos can I try?')
  await assistant.getByTestId('send-button').click()

  const assistantMessages = assistant.getByTestId('chat-messages')
  await expect(assistantMessages).toContainText('Ecommerce retrofit')
  await expect(assistantMessages).toContainText('Field ops ERP')
  await expect(assistantMessages).toContainText('Docs Q&A')
  await expect(assistantMessages).toContainText('AG-UI event stream')
  await expect(assistantMessages).toContainText('SaaS admin workflow')
  await expect(assistantMessages).toContainText('Mission control')
})

test('field ops ERP demo gates inventory reservation and dispatch actions', async ({ page }) => {
  await page.goto(`${siteURL}demos/operations/?opsAgentMode=scripted&cacheBust=${Date.now()}`)

  const ops = page.locator('#operations')
  await expect(page.getByTestId('inventory-available-CMP-44')).toHaveText('2')
  await expect(page.locator('#ops-role-scope')).toContainText('Dispatcher can search work orders')
  await expect(page.locator('#ops-risk-state')).toContainText('Mutations require approval')

  await ops.getByTestId('chat-input').fill('reserve a compressor for Riverside')
  await ops.getByTestId('send-button').click()

  await expect(ops.getByTestId('chat-messages')).toContainText('Riverside Clinic')
  await expect(ops.getByTestId('chat-messages')).toContainText('Critical')
  await expect(ops.getByTestId('approval-prompt')).toContainText('reserveInventory')
  await expect(page.getByTestId('inventory-available-CMP-44')).toHaveText('2')

  await ops.getByTestId('approve-button').click()
  await expect(page.getByTestId('inventory-available-CMP-44')).toHaveText('1')
  await expect(page.locator('#ops-cmp-stock')).toHaveText('1')
  await expect(page.locator('#ops-available-techs')).toHaveText('2')
  await expect(page.locator('#ops-activity')).toContainText('Reserved 1x Compressor module for Riverside Clinic')
  await expect(page.locator('#ops-audit')).toContainText('Approved reserveInventory')
  await expect(ops.getByTestId('chat-messages')).toContainText('Remaining stock: 1')

  await page.goto(`${siteURL}demos/operations/?opsAgentMode=scripted&cacheBust=${Date.now()}`)
  const rejectOps = page.locator('#operations')
  await expect(page.getByTestId('ops-tech-WO-1842')).toContainText('Unassigned')

  await rejectOps.getByTestId('chat-input').fill('assign Ava to Riverside')
  await rejectOps.getByTestId('send-button').click()

  await expect(rejectOps.getByTestId('chat-messages')).toContainText('Ava Moreno')
  await expect(rejectOps.getByTestId('approval-prompt')).toContainText('assignTechnician')
  await rejectOps.getByTestId('reject-button').click()

  await expect(rejectOps.getByTestId('chat-messages')).toContainText(/did not assign|left unchanged/i)
  await expect(page.getByTestId('ops-tech-WO-1842')).toContainText('Unassigned')
  await expect(page.getByTestId('tech-status-ava')).toHaveText('Available')
  await expect(page.locator('#ops-audit')).toContainText('Rejected assignTechnician')

  await page.goto(`${siteURL}demos/operations/?opsAgentMode=scripted&cacheBust=${Date.now()}`)
  await page.locator('#ops-role').selectOption('viewer')
  await expect(page.locator('#ops-activity')).toContainText('Role changed to viewer')
  await expect(page.locator('#ops-role-scope')).toContainText('Viewer can search and inspect')
  await page.locator('#ops-role').selectOption('supervisor')
  await expect(page.locator('#ops-role-scope')).toContainText('Supervisor can search')

  const supervisorOps = page.locator('#operations')
  await supervisorOps.getByTestId('chat-input').fill('update Riverside ETA to 45 min because traffic delay')
  await supervisorOps.getByTestId('send-button').click()
  await expect(supervisorOps.getByTestId('approval-prompt')).toContainText('updateEta')
  await expect(page.getByTestId('ops-eta-WO-1842')).toContainText('Not set')
  await supervisorOps.getByTestId('approve-button').click()

  await expect(page.getByTestId('ops-eta-WO-1842')).toContainText('45 min')
  await expect(page.locator('#ops-activity')).toContainText('Updated Riverside Clinic ETA to 45 min')
  await expect(page.locator('#ops-audit')).toContainText('Approved updateEta')
})

test('field ops ERP demo retrieves cited knowledge without mutating state', async ({ page }) => {
  await page.goto(`${siteURL}demos/operations/?opsAgentMode=scripted&cacheBust=${Date.now()}`)
  await page.locator('#ops-role').selectOption('supervisor')

  const ops = page.locator('#operations')
  await expect(page.getByTestId('inventory-available-CMP-44')).toHaveText('2')
  await ops.getByTestId('chat-input').fill('cite the safety rule for CMP-44')
  await ops.getByTestId('send-button').click()

  const messages = ops.getByTestId('chat-messages')
  await expect(messages).toContainText('CMP-44 compressor replacement safety')
  await expect(messages).toContainText('field-ops-repair-manual.md')
  await expect(messages).toContainText('Freshness: current')
  await expect(ops.getByTestId('approval-prompt')).toHaveCount(0)
  await expect(page.getByTestId('inventory-available-CMP-44')).toHaveText('2')
})

test('AG-UI demo loop explains scripted boundary and renders form, table, and chart states', async ({ page }) => {
  await page.goto(`${siteURL}demos/ag-ui/?cacheBust=${Date.now()}`)

  const agui = page.locator('#agui')
  await agui.getByTestId('chat-input').fill('triage the support queue')
  await agui.getByTestId('send-button').click()

  await expect(agui.getByText('Open support queue')).toBeVisible()
  await expect(agui.locator('span').filter({ hasText: 'Billing' })).toBeVisible()
  await expect(agui.locator('span').filter({ hasText: 'Orders' })).toBeVisible()
  await expect(agui.getByText('Create a support ticket')).toBeVisible()

  await agui.getByTestId('chat-input').fill('what other components do you have for the UI?')
  await agui.getByTestId('send-button').click()
  await expect(agui.getByText('EdgeView component contract')).toBeVisible()
  await expect(agui.getByRole('cell', { name: 'Chart', exact: true })).toBeVisible()

  await agui.getByTestId('chat-input').fill('is this hardcoded?')
  await agui.getByTestId('send-button').click()
  await expect(agui.getByText('Yes. This public Pages demo uses a local scripted AG-UI event source')).toBeVisible()
  await expect(agui.getByText('createAgUiAgent({ endpoint })').first()).toBeVisible()
})

test('admin and mission-control loops keep risky work observable and gated', async ({ page }) => {
  await page.goto(`${siteURL}demos/admin/?adminAgentMode=scripted&cacheBust=${Date.now()}`)

  const admin = page.locator('#admin')
  await admin.getByTestId('chat-input').fill('upgrade Northwind to Enterprise')
  await admin.getByTestId('send-button').click()

  await expect(admin.getByTestId('chat-messages')).toContainText('Approval is required')
  await expect(admin.getByTestId('approval-prompt')).toContainText('updatePlan')
  await admin.getByTestId('approve-button').click()
  await expect(admin.getByTestId('chat-messages')).toContainText('Updated Northwind Labs to Enterprise')
  await expect(page.getByTestId('plan-northwind')).toContainText('Enterprise')

  await page.goto(`${siteURL}demos/mission-control/?cacheBust=${Date.now()}`)
  await expect(page.locator('#mc-runs')).toHaveText('0')
  await page.locator('#site-assistant .site-assistant-toggle').click()
  const assistant = page.locator('#site-assistant')
  await assistant.getByTestId('chat-input').fill('what demos can I try?')
  await assistant.getByTestId('send-button').click()

  await expect(page.locator('#mc-runs')).toHaveText('1')
  await expect(page.locator('#mc-last-event')).toContainText('run-finish')
  await expect(assistant.getByTestId('chat-messages')).toContainText('Mission control')
})
