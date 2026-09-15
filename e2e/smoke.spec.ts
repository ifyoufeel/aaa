import { expect, test } from '@playwright/test'

test('landing screen renders with a build stamp', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => consoleErrors.push(err.message))

  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Nav.* & Yav/)
  await expect(page.getByTestId('build-commit')).not.toBeEmpty()
  expect(consoleErrors).toEqual([])
})
