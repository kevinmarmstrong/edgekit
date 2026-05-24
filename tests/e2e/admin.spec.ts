import { expect, test } from '@playwright/test'

const siteURL = 'http://127.0.0.1:4174/edgekit/'

test('public site exposes the SaaS admin workflow demo', async ({ page }) => {
  await page.goto(siteURL)

  await expect(page.getByText('SaaS admin workflow demo.')).toBeVisible()
  await expect(page.getByTestId('account-row')).toHaveCount(3)
  await expect(page.getByTestId('plan-northwind')).toContainText('Pro')
})

test('admin scripted workflow upgrades an account after approval', async ({ page }) => {
  await page.goto(`${siteURL}?adminAgentMode=scripted#admin`)

  const admin = page.locator('#admin')
  await admin.locator('[data-testid="chat-input"]').fill('upgrade Northwind to Enterprise')
  await admin.locator('[data-testid="send-button"]').click()

  await expect(admin.locator('[data-testid="approval-prompt"]')).toBeVisible()
  await expect(admin.locator('[data-testid="approval-prompt"]')).toContainText('updatePlan')

  await admin.locator('[data-testid="approve-button"]').click()

  await expect(admin.locator('[data-testid="chat-messages"]')).toContainText('Updated Northwind Labs to Enterprise')
  await expect(page.getByTestId('plan-northwind')).toContainText('Enterprise')
  await expect(page.locator('#admin-activity')).toContainText('Updated Northwind Labs to Enterprise')
})

test('admin scripted workflow can reject account suspension', async ({ page }) => {
  await page.goto(`${siteURL}?adminAgentMode=scripted#admin`)

  const admin = page.locator('#admin')
  await admin.locator('[data-testid="chat-input"]').fill('suspend Globex account')
  await admin.locator('[data-testid="send-button"]').click()
  await expect(admin.locator('[data-testid="approval-prompt"]')).toBeVisible()
  await expect(admin.locator('[data-testid="approval-prompt"]')).toContainText('suspendAccount')

  await admin.locator('[data-testid="reject-button"]').click()

  await expect(admin.locator('[data-testid="chat-messages"]')).toContainText('I did not suspend Globex Retail')
  await expect(page.getByTestId('status-globex')).toContainText('At risk')
  await expect(page.locator('#admin-activity')).toContainText('No workflow actions yet')
})
