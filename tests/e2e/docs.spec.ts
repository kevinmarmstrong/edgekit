import { expect, test } from '@playwright/test'

const siteURL = 'http://127.0.0.1:4174/edgekit/'

test('homepage links into the full documentation site', async ({ page }) => {
  await page.goto(siteURL)

  await expect(page.getByRole('heading', { name: 'Full documentation, not just a demo page.' })).toBeVisible()
  await expect(page.locator('#doc-card-grid a.doc-card')).toHaveCount(11)
  await expect(page.locator('.site-header nav').getByRole('link', { name: 'Admin' })).toHaveCount(0)
  await expect(page.locator('edge-chat')).toHaveCount(3)

  await page.getByRole('link', { name: 'Read the docs' }).click()
  await expect(page).toHaveURL(/\/edgekit\/docs\/$/)
  await expect(page.getByRole('heading', { name: 'What edgekit is' })).toBeVisible()
})

test('docs pages expose core documentation sections and navigation', async ({ page }) => {
  await page.goto(`${siteURL}docs/api/`)

  await expect(page.getByRole('heading', { name: 'Core runtime API' })).toBeVisible()
  await expect(page.getByText('createAgent(options)')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Approval resume' })).toBeVisible()

  await page.getByRole('link', { name: 'Testing' }).click()
  await expect(page).toHaveURL(/\/edgekit\/docs\/testing\/$/)
  await expect(page.getByRole('heading', { name: 'Testing agent workflows' })).toBeVisible()
  await expect(page.locator('pre code').filter({ hasText: 'pnpm eval:models' })).toBeVisible()
})
