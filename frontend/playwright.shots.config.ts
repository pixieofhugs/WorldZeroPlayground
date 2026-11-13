/**
 * Screenshot run (e2e/shots/*.shots.ts). Never reuses a dev server: one
 * already running may be another checkout's code. :3000 because local
 * CORS_ORIGINS allows only :5173 and :3000.
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
    // `env` replaces the child env whole.
    env: { ...process.env, VITE_API_URL: API_URL } as Record<string, string>,
  },
})
