/**
 * Config for the post-deploy smoke (e2e/smoke/*.smoke.ts).
 *
 * Separate from playwright.config.ts because the two run against opposite
 * things: that one starts a local dev server and signs in through the dev-only
 * login seam, this one points at a deployed host where that seam is closed.
 * No `webServer`, no `setup` project, no stored session.
 */
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/smoke',
  testMatch: /.*\.smoke\.ts/,
  // A deploy has just restarted the backend; the first request can lose a race
  // with the container coming up.
  retries: 2,
  timeout: 60_000,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.SMOKE_BASE_URL ?? 'https://dev.worldzero.org',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
