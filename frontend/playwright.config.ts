import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests.
 *   1. Isolated (recommended): `bash frontend/e2e/run-e2e.sh` (fresh
 *      worldzero_e2e DB, backend :8001, frontend :5174). See SPEC-testing.md.
 *   2. Ad-hoc (`npm run e2e`): backend already on :8000, its DB; frontend :5173.
 *
 * Env: E2E_WEB_PORT (default 5173); E2E_API_URL (default :8000, also passed
 * to Vite as VITE_API_URL).
 *
 * Auth: `setup` dev-logs-in once and saves playwright/.auth/user.json; guest
 * specs opt out with an empty storageState.
 */
const WEB_PORT = process.env.E2E_WEB_PORT ?? '5173'
const BASE_URL = `http://localhost:${WEB_PORT}`
const API_URL = process.env.E2E_API_URL ?? 'http://localhost:8000'

export default defineConfig({
  testDir: './e2e',
  // Serial: specs share DB-level gates.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // JSON beside the HTML: scripts/e2e_summary.py reads it from the CI artifact.
  reporter: [['html'], ['json', { outputFile: 'test-results/results.json' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `npm run dev -- --port ${WEB_PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    // `env` replaces the child env whole; keep PATH etc.
    env: { ...process.env, VITE_API_URL: API_URL } as Record<string, string>,
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
})
