/** Post-deploy smoke (e2e/smoke/*.smoke.ts) against a deployed host: no webServer, no login. */
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/smoke',
  testMatch: /.*\.smoke\.ts/,
  // The backend just restarted; first requests can race it.
  retries: 2,
  timeout: 60_000,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.SMOKE_BASE_URL ?? 'https://dev.worldzero.org',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
