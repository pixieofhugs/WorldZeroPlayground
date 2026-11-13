import { test as setup, expect } from '@playwright/test'

const authFile = 'playwright/.auth/user.json'

// Dev-login (404s in prod) returns the session cookie; saved for every authed spec.
const API = process.env.E2E_API_URL ?? 'http://localhost:8000'

setup('authenticate via dev-login', async ({ request }) => {
  const res = await request.post(`${API}/auth/dev-login?name=E2E%20Bot`)
  expect(res.ok(), `dev-login failed — is the backend up on ${API}?`).toBeTruthy()
  await request.storageState({ path: authFile })
})
