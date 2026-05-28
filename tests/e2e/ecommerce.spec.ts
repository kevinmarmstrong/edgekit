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

test('basic fallback narrows a white nike dunk request to matching products', async ({ page }) => {
  await page.goto('/')

  await page.getByTestId('chat-input').fill('find me size nine white nike dunks')
  await page.getByTestId('send-button').click()

  await expect(page.getByTestId('agent-status')).toContainText(/Basic mode|Chrome AI is ready/i, {
    timeout: 10_000,
  })
  await expect(page.getByTestId('chat-messages')).toContainText('Nike Dunk Low')
  await expect(page.getByTestId('chat-messages')).not.toContainText('Adidas Ultraboost Light -')
})

test('scripted search renders a fillable product action instead of a chat confirmation step', async ({ page }) => {
  await page.goto('/?agentMode=scripted')

  await page.getByTestId('chat-input').fill('how much are Nike dunks and what sizes are carried?')
  await page.getByTestId('send-button').click()

  await expect(page.getByTestId('chat-messages')).toContainText('Nike Dunk Low')
  await expect(page.getByTestId('chat-messages')).not.toContainText('Tool: searchProducts')
  await expect(page.getByTestId('action-card')).toBeVisible()
  await expect(page.getByTestId('action-card')).toContainText('Add Nike Dunk Low to cart')

  await page.getByTestId('action-field-size').selectOption('11')
  await page.getByTestId('action-run-button').click()

  await expect(page.getByTestId('chat-messages')).toContainText('Added Nike Dunk Low to your cart')
  await expect(page.locator('#cart-state')).toContainText('1x Nike Dunk Low (size 11)')
  await expect(page.getByTestId('approval-prompt')).toHaveCount(0)
})

test('scripted workflow searches size nine white nike dunks and adds to cart after approval', async ({ page }) => {
  await page.goto('/?agentMode=scripted')

  await page.getByTestId('chat-input').fill('find me size nine white nike dunks and put in cart')
  await page.getByTestId('send-button').click()

  await expect(page.getByTestId('agent-status')).toContainText(/Scripted agent is ready|Waiting for approval/)
  await expect(page.getByTestId('approval-prompt')).toBeVisible()
  await expect(page.getByTestId('approval-prompt')).toContainText('addToCart')
  await expect(page.getByTestId('approval-prompt')).toContainText('dunk')

  await page.getByTestId('approve-button').click()

  await expect(page.getByTestId('chat-messages')).toContainText('Added Nike Dunk Low to your cart (size 9)')
  await expect(page.locator('#cart-state')).toContainText('1x Nike Dunk Low (size 9)')
})

test('scripted workflow can reject an irreversible cart action', async ({ page }) => {
  await page.goto('/?agentMode=scripted')

  await page.getByTestId('chat-input').fill('find nike dunks and put in cart')
  await page.getByTestId('send-button').click()
  await expect(page.getByTestId('approval-prompt')).toBeVisible()

  await page.getByTestId('reject-button').click()

  await expect(page.getByTestId('chat-messages')).toContainText('I did not add Nike Dunk Low to your cart')
  await expect(page.locator('#cart-state')).toContainText('No items yet')
})

test('scripted workflow handles search-only shopping assistance without approval', async ({ page }) => {
  await page.goto('/?agentMode=scripted')

  await page.getByTestId('chat-input').fill('show running shoes under $100 size 10')
  await page.getByTestId('send-button').click()

  await expect(page.getByTestId('chat-messages')).toContainText('Nike Air Zoom Pegasus')
  await expect(page.getByTestId('approval-prompt')).toHaveCount(0)
  await expect(page.locator('#cart-state')).toContainText('No items yet')
})
