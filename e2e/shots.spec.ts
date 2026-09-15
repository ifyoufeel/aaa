import { test, type Page } from '@playwright/test'

const OUT = process.env['SHOT_DIR'] ?? 'test-results'

/** Walks the full flow, photographing each screen on the way through. */
test('screenshots', async ({ context }) => {
  const host = await context.newPage()
  const guest = await context.newPage()
  await host.setViewportSize({ width: 1440, height: 900 })
  await guest.setViewportSize({ width: 1440, height: 900 })

  const shot = (p: Page, name: string) => p.screenshot({ path: `${OUT}/${name}.png` })

  await host.goto('/')
  await shot(host, '1-lobby')

  await host.getByRole('button', { name: /open a room/i }).click()
  await shot(host, '2-waiting')

  const link = await host.getByLabel('Invite link').inputValue()
  await guest.goto(link)
  await host.bringToFront()
  await shot(host, '3-faction')

  await host.getByRole('button', { name: /choose kitezh/i }).click()
  await shot(host, '3b-faction-selected')
  await host.getByRole('button', { name: /confirm kitezh/i }).click()
  await guest.getByRole('button', { name: /choose topyla/i }).click()
  await guest.getByRole('button', { name: /confirm topyla/i }).click()

  await host.bringToFront()
  for (const [unit, n] of [['Kmet', 14], ['Strelets', 8], ['Gridin', 4], ['Bogatyr', 3]] as const) {
    for (let i = 0; i < n; i++) {
      await host.getByRole('button', { name: `One more ${unit}` }).click()
    }
  }
  await shot(host, '4-recruit')
  await host.getByRole('button', { name: /take the field/i }).click()

  for (const [unit, n] of [['Mavka', 14], ['Rusalka', 8], ['Bolotnik', 4], ['Drekavac', 3]] as const) {
    for (let i = 0; i < n; i++) {
      await guest.getByRole('button', { name: `One more ${unit}` }).click()
    }
  }
  await guest.getByRole('button', { name: /take the field/i }).click()

  await host.bringToFront()
  await host.getByLabel('Battlefield').waitFor({ timeout: 10_000 })
  await host.waitForTimeout(600)
  await shot(host, '5-battle')

  // Advance a few turns, then hover an enemy so the attack preview shows.
  for (let i = 0; i < 6; i++) {
    const p = (await host.getByRole('button', { name: 'Defend' }).count()) ? host : guest
    await p.getByRole('button', { name: 'Defend' }).click()
    await p.waitForTimeout(90)
  }
  await host.bringToFront()
  if (await host.getByRole('button', { name: 'Defend' }).count()) {
    const enemy = host.locator('.token').last()
    await enemy.hover().catch(() => {})
    await host.waitForTimeout(400)
  }
  await shot(host, '6-battle-preview')
})
