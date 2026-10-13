/**
 * Post-deploy smoke against a REAL deployed environment (dev.worldzero.org, or
 * prod after a promotion). Run by `.github/workflows/deploy.yml`; locally with
 *
 *   npm run smoke -- --config playwright.smoke.config.ts
 *   SMOKE_BASE_URL=https://dev.worldzero.org npm run smoke
 *
 * Named `.smoke.ts`, not `.spec.ts`, so the lifecycle suite's config — which
 * matches `*.spec.ts` under `e2e/` and starts its own dev server — never picks
 * it up. It is still under `e2e/`, so `tsconfig.e2e.json` typechecks it.
 *
 * DELIBERATELY UNAUTHENTICATED. The lifecycle suite signs in through
 * POST /auth/dev-login, which 404s on any deployed environment on purpose
 * (deploy/env.example) — a public host that mints credentialless sessions is
 * account takeover. So the functional gate stays where it already is: the
 * Playwright suite in CI against an ephemeral database. What THIS file covers
 * is the set of things only a real deployment can be wrong about — TLS, DNS,
 * the proxy, CORS between two origins, and whether the migration and seed that
 * run in `start.sh` actually completed.
 */
import { expect, test } from '@playwright/test'

const BASE_URL = process.env.SMOKE_BASE_URL ?? 'https://dev.worldzero.org'
const API_URL = process.env.SMOKE_API_URL ?? 'https://api.dev.worldzero.org'

test('the API is up and answering', async ({ request }) => {
  const response = await request.get(`${API_URL}/health`)
  expect(response.status()).toBe(200)
})

test('the database is migrated and seeded', async ({ request }) => {
  // Not a liveness check — a correctness one. `start.sh` runs `alembic upgrade
  // head` and `seed.py` on every boot, and a factions list that comes back
  // empty is what a half-applied migration or a failed seed looks like from
  // outside. The process would be answering /health perfectly well.
  const response = await request.get(`${API_URL}/factions`)
  expect(response.status()).toBe(200)
  expect(await response.json()).not.toHaveLength(0)
})

test('dev-login is closed', async ({ request }) => {
  // ENVIRONMENT must be `production` on every deployed host, dev included.
  // If this ever passes as anything but 404, the environment mints valid
  // session cookies for callers supplying no credentials at all.
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

  // The SPA mounted — an empty #root is what a bundle that 404'd looks like,
  // and the document itself still returns 200.
  await expect(page.locator('#root')).not.toBeEmpty()

  // The browser talked to the API origin and was not refused. This is the
  // check that catches a CORS_ORIGINS or cookie-domain mistake, which is
  // invisible to every test that runs against a single origin.
  await expect.poll(() => apiResponses.length, { timeout: 15_000 }).toBeGreaterThan(0)
  expect(apiResponses.filter((status) => status >= 500)).toHaveLength(0)
})
