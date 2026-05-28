import { expect, test } from '@playwright/test'

const siteURL = 'http://127.0.0.1:4174/edgekit/'

test('public site hands the SaaS admin workflow to the external demo', async ({ page }) => {
  await page.goto(`${siteURL}demos/admin/`)

  await expect(page.getByRole('heading', { name: 'The SaaS admin workflow now runs outside the monorepo.' })).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Production notes' })).toBeVisible()
  await expect(page.getByText('Use the external repo when testing the adopter install path.')).toBeVisible()
  await expect(page.locator('a[href="https://edgekit-demo-admin.pages.dev/"]')).toBeVisible()
  await expect(page.locator('a[href="https://github.com/kevinmarmstrong/edgekit-demo-admin"]')).toBeVisible()
  await expect(page.locator('#admin edge-chat')).toHaveCount(0)
})
