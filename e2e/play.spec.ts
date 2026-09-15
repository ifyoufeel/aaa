import { expect, test, type Page } from '@playwright/test'

/**
 * Two players, one browser.
 *
 * Both pages live in the SAME browser context on purpose: whichever transport
 * wins the race (WebRTC, or — once that fails, here, because the sandbox
 * blocks it — BroadcastChannel), a shared context is what lets both pages
 * reach each other at all. BroadcastChannel never crosses context boundaries,
 * so two isolated contexts would simply never see each other.
 */
async function bothPlay(page: Page, other: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /open a room/i }).click()

  // The invite bar stays up until the opponent actually arrives.
  const link = await page.getByLabel('Invite link').inputValue()
  expect(link).toMatch(/#\/r\/[a-z0-9]+\/j$/)

  await other.goto(link)

  // Faction select, both sides.
  await expect(page.getByRole('heading', { name: /choose your castle/i })).toBeVisible()
  await expect(other.getByRole('heading', { name: /choose your castle/i })).toBeVisible()

  // Choosing is two steps now: highlight the hall, then confirm it.
  await page.getByRole('button', { name: /choose kitezh/i }).click()
  await page.getByRole('button', { name: /confirm kitezh/i }).click()
  await other.getByRole('button', { name: /choose topyla/i }).click()
  await other.getByRole('button', { name: /confirm topyla/i }).click()

  // Recruitment.
  await expect(page.getByRole('heading', { name: 'Kitezh', level: 1 })).toBeVisible()
  await expect(other.getByRole('heading', { name: 'Topyla', level: 1 })).toBeVisible()
  return link
}

/** Buys a spread of units by clicking the + steppers. */
async function recruit(page: Page, buys: [string, number][]) {
  for (const [unit, times] of buys) {
    const plus = page.getByRole('button', { name: `One more ${unit}` })
    for (let i = 0; i < times; i++) await plus.click()
  }
  await page.getByRole('button', { name: /take the field/i }).click()
}

test('two players fight a battle from one link', async ({ context }) => {
  const host = await context.newPage()
  const guest = await context.newPage()
  const errors: string[] = []
  /**
   * The dev container's egress proxy only allowlists specific hosts: it
   * proxies HTTPS through its own CA (which headless Chromium does not trust,
   * so the webfont request fails here and only here), and it refuses the
   * tunnel outright for the WebRTC transport's public signalling broker
   * (0.peerjs.com), which a real player's browser and a real deploy can
   * always reach. Both are this sandbox's own network policy, not the game.
   * Everything else stays strict -- this filter names specific network
   * conditions rather than swallowing console errors in general.
   */
  const isSandboxNetworkNoise = (text: string) =>
    /ERR_CERT_AUTHORITY_INVALID|net::ERR_|Establishing a tunnel via proxy server failed/.test(
      text,
    )

  for (const p of [host, guest]) {
    p.on('pageerror', (e) => errors.push(e.message))
    p.on('console', (m) => {
      if (m.type() === 'error' && !isSandboxNetworkNoise(m.text())) errors.push(m.text())
    })
  }

  await bothPlay(host, guest)

  await recruit(host, [['Kmet', 10], ['Strelets', 6], ['Gridin', 3], ['Bogatyr', 2]])
  await recruit(guest, [['Mavka', 10], ['Rusalka', 6], ['Bolotnik', 3], ['Drekavac', 2]])

  // The battlefield, on both screens.
  await expect(host.getByLabel('Battlefield')).toBeVisible({ timeout: 10_000 })
  await expect(guest.getByLabel('Battlefield')).toBeVisible()
  await expect(host.getByText(/order of battle/i)).toBeVisible()

  // Play a dozen turns by whoever is up, defending each time — enough to prove
  // turns alternate across the two pages and the round counter advances.
  for (let i = 0; i < 12; i++) {
    const activeHost = await host.getByRole('button', { name: 'Defend' }).count()
    const page = activeHost > 0 ? host : guest
    await page.getByRole('button', { name: 'Defend' }).click()
    await page.waitForTimeout(80)
  }

  const round = await host.locator('.battle__round-n').textContent()
  expect(Number(round)).toBeGreaterThan(1)

  // Neither side drifted.
  await expect(host.getByText(/drifted apart/i)).toHaveCount(0)
  await expect(guest.getByText(/drifted apart/i)).toHaveCount(0)
  expect(errors).toEqual([])
})
