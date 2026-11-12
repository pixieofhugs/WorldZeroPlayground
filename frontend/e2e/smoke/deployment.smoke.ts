/**
 * Post-deploy smoke against a REAL deployed environment (dev.worldzero.org, or
 * prod after a promotion). Run by `.github/workflows/deploy.yml`; locally with
 *
 *   npm run smoke -- --config playwright.smoke.config.ts
 *   SMOKE_BASE_URL=https://dev.worldzero.org npm run smoke
 *
 * `.smoke.ts` so the lifecycle config (`*.spec.ts`) skips it; still under
 * `e2e/` for `tsconfig.e2e.json`.
 *
 * Unauthenticated: dev-login 404s on deployed hosts. Covers what only a real
 * deployment can get wrong: TLS, DNS, proxy, cross-origin CORS, migrate+seed.
 */
import { expect, test } from '@playwright/test'

const BASE_URL = process.env.SMOKE_BASE_URL ?? 'https://dev.worldzero.org'
const API_URL = process.env.SMOKE_API_URL ?? 'https://api.dev.worldzero.org'

test('the API is up and answering', async ({ request }) => {
  const response = await request.get(`${API_URL}/health`)
  expect(response.status()).toBe(200)
})

test('the database is migrated and seeded', async ({ request }) => {
  // An empty factions list = half-applied migration or failed seed.
  const response = await request.get(`${API_URL}/factions`)
  expect(response.status()).toBe(200)
  expect(await response.json()).not.toHaveLength(0)
})

test('dev-login is closed', async ({ request }) => {
  // ENVIRONMENT=production on every deployed host, else this mints sessions
  // for anyone.
  const response = await request.post(`${API_URL}/auth/dev-login`)
  expect(response.status()).toBe(404)
})

test('the site loads and reaches its own API', async ({ page }) => {
  const apiResponses: number[] = []
  page.on('response', (response) => {
    if (response.url().startsWith(API_URL)) apiResponses.push(response.status())
  })

  const response = await page.goto(BASE_URL)
  expect(response?.status()).toBe(200)

  // Empty #root = the bundle 404'd.
  await expect(page.locator('#root')).not.toBeEmpty()

  // Catches CORS_ORIGINS / cookie-domain mistakes.
  await expect.poll(() => apiResponses.length, { timeout: 15_000 }).toBeGreaterThan(0)
  expect(apiResponses.filter((status) => status >= 500)).toHaveLength(0)
})
