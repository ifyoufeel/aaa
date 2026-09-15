import { execSync } from 'node:child_process'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

/**
 * Build stamp, shown in the UI so a deployed page can be tied back to a commit.
 * Vercel exposes the SHA as an env var; locally we ask git. Neither is
 * guaranteed, so this never throws.
 */
function buildCommit(): string {
  const fromCi = process.env['VERCEL_GIT_COMMIT_SHA'] ?? process.env['GITHUB_SHA']
  if (fromCi) return fromCi.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return 'unknown'
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_COMMIT__: JSON.stringify(buildCommit()),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Playwright specs live in e2e/ and must not be collected by Vitest.
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
