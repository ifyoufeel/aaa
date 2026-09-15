import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

/**
 * This repo is developed in a container that ships its own Chromium, which may
 * not match the revision our @playwright/test version would download. Prefer the
 * pre-installed binary when it is there, and fall back to Playwright's own
 * (what CI and a normal laptop will do).
 */
const PREINSTALLED_CHROMIUM = '/opt/pw-browsers/chromium'
const executablePath = existsSync(PREINSTALLED_CHROMIUM) ? PREINSTALLED_CHROMIUM : undefined

export default defineConfig({
  testDir: './e2e',
  // Two-context multiplayer specs drive both players from one test body,
  // so they must not run concurrently with each other.
  workers: 1,
  forbidOnly: !!process.env['CI'],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(executablePath ? { launchOptions: { executablePath } } : {}),
      },
    },
  ],
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000,
  },
})
