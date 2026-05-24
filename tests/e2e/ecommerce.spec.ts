import { expect, test } from '@playwright/test'

test('ecommerce demo renders catalog and answers in basic mode when local model is unavailable', async ({ page }) => {
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

  await expect(page.getByTestId('agent-status')).toContainText(/Basic mode|Chrome AI is ready/i, {
    timeout: 10_000,
  })
  await expect(page.getByTestId('chat-messages')).toContainText(/Nike Air Zoom Pegasus|Chrome AI/i)
  await expect(page.getByTestId('download-prompt')).toHaveCount(0)
})
