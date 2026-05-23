import { expect, test } from '@playwright/test'

test('ecommerce demo renders catalog and handles unavailable local model gracefully', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(/edgekit ecommerce demo/)
  await expect(page.getByText('Northstar Running Co.')).toBeVisible()
  await expect(page.getByTestId('product-card')).toHaveCount(5)

  await page.getByTestId('chat-input').fill('find running shoes under $100 in size 10')
  await page.getByTestId('send-button').click()

  const prompt = page.getByTestId('download-prompt')
  if (await prompt.isVisible().catch(() => false)) {
    await prompt.getByRole('button', { name: 'Not now' }).click()
  }

  await expect(page.getByTestId('agent-status')).toContainText(/No local model|not available/i, {
    timeout: 10_000,
  })
  await expect(page.getByTestId('chat-messages')).toContainText(/AI is not available/i)
  await expect(page.getByTestId('download-prompt')).toHaveCount(0)
})
