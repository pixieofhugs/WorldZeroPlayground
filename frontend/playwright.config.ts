import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests.
 *
 * Two ways to run:
 *   1. Isolated (recommended): `bash frontend/e2e/run-e2e.sh` — resets a
 *      dedicated worldzero_e2e database, migrates + seeds it, starts the
 *      branch backend on :8001 and the frontend on :5174 via the env vars
 *      below. See that script and docs/spec/SPEC-testing.md.
 *   2. Ad-hoc (`npm run e2e`): backend must already be up on :8000
 *      (docker-compose up -d && uvicorn main:app --reload) — it runs against
 *      whatever database that backend points at. Frontend auto-starts on :5173.
 *
 * Env knobs (set by run-e2e.sh / CI, defaults preserve the ad-hoc flow):
 *   E2E_WEB_PORT — frontend dev-server port (default 5173)
 *   E2E_API_URL  — backend base URL (default http://localhost:8000); also
 *                  injected into the dev server as VITE_API_URL so the app
 *                  itself talks to the same backend the specs do.
 *
 * Auth: the `setup` project hits POST /auth/dev-login (the bot-login bypass,
 * dev-only) once and saves the session cookie to playwright/.auth/user.json.
 * The `chromium` project loads it, so specs start already logged in.
 * Guest specs opt out with test.use({ storageState: { cookies: [], origins: [] } }).
 */
const WEB_PORT = process.env.E2E_WEB_PORT ?? '5173'
const BASE_URL = `http://localhost:${WEB_PORT}`
const API_URL = process.env.E2E_API_URL ?? 'http://localhost:8000'

export default defineConfig({
  testDir: './e2e',
  // Serial on purpose: lifecycle specs share DB-level gates (bank cap,
  // one-membership-per-task, invite uniqueness) and race under parallel workers.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'html',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `npm run dev -- --port ${WEB_PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    // Playwright replaces the child env entirely when `env` is set — spread
    // process.env so PATH etc. survive, then pin the API base for Vite.
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
