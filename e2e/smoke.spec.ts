import { expect, test } from '@playwright/test'

test('the lobby loads and can open a room', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Nav.* & Yav/)

  await page.getByRole('button', { name: /open a room/i }).click()

  // The invite link is the whole point of the lobby; it must survive the click.
  await expect(page.getByLabel('Invite link')).toHaveValue(/#\/r\/[a-z0-9]+\/j$/)
  await expect(page).toHaveURL(/#\/r\/[a-z0-9]+$/)
})
