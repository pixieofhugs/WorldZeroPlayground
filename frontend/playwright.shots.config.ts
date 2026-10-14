/**
 * Config for the screenshot run (e2e/shots/*.shots.ts) — pictures for a
 * reviewer to look at, not assertions. The knobs are in that file's header.
 *
 * It starts its OWN Vite and never reuses one. A dev server already listening
 * is serving whatever checkout started it, and shooting that would review the
 * wrong code without a single error. So: a dedicated port, `--strictPort`, and
 * a busy port fails the run.
 *
 * :3000 because the local backend's CORS_ORIGINS (docker-compose.yml) allows
 * exactly :5173 and :3000, and :5173 is the one a person is usually sitting on.
 */
import { defineConfig, devices } from '@playwright/test'

const WEB_PORT = process.env.E2E_WEB_PORT ?? '3000'
const BASE_URL = `http://localhost:${WEB_PORT}`
const API_URL = process.env.E2E_API_URL ?? 'http://localhost:8000'

export default defineConfig({
  testDir: './e2e/shots',
  testMatch: /.*\.shots\.ts/,
  workers: 1,
  reporter: 'list',
  use: { ...devices['Desktop Chrome'], baseURL: BASE_URL },
  webServer: {
    command: `npm run dev -- --port ${WEB_PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 60_000,
    // Same reason as playwright.config.ts: `env` replaces the child env whole.
    env: { ...process.env, VITE_API_URL: API_URL } as Record<string, string>,
  },
})
