import { test as setup, expect } from '@playwright/test'

const authFile = 'playwright/.auth/user.json'

/**
 * Bot-login: bypasses Google OAuth. POST /auth/dev-login create-or-gets a test
 * account and returns the httpOnly session cookie (dev/local only — 404s in prod).
 * We save that cookie so every authed spec starts logged in without repeating this.
 */
const API = process.env.E2E_API_URL ?? 'http://localhost:8000'

setup('authenticate via dev-login', async ({ request }) => {
  const res = await request.post(`${API}/auth/dev-login?name=E2E%20Bot`)
  expect(res.ok(), `dev-login failed — is the backend up on ${API}?`).toBeTruthy()
  await request.storageState({ path: authFile })
})
