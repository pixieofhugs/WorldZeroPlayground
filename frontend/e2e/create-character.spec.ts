import { test, expect } from '@playwright/test'

import factions from '../src/locales/en/factions.json' with { type: 'json' }
import type { CurrentUser } from '../src/api/auth'
import { readJson } from '../src/utils/e2eScenario'
import { RUN } from './duel.helpers'

// Letters need a character, so dev-login mints a first life with the letter and the UI creates the second.
// dev-login is sign-in only: Google OAuth can't run locally.
const API = process.env.E2E_API_URL ?? 'http://localhost:8000'
const FACTION = 'ua'

test('a signed-in account creates a new character and picks a faction', async ({ browser }) => {
  const ctx = await browser.newContext()
  const host = encodeURIComponent(`HOST-${RUN}`)
  const login = `${API}/auth/dev-login?key=create-${RUN}`
  await readJson(await ctx.request.post(login), 'dev-login')
  const { second_character_level_required: hostLevel } = await readJson<CurrentUser>(
    await ctx.request.get(`${API}/auth/me`),
    'GET /auth/me',
  )
  await readJson(
    await ctx.request.post(`${login}&name=${host}&level=${hostLevel}&invited=${FACTION}`),
    'dev-login',
  )
  const name = `NEW-${RUN}`

  const page = await ctx.newPage()
  await page.goto('/characters/create')
  await page.getByRole('textbox', { name: 'Character name' }).fill(name)
  await page.getByRole('button', { name: factions.names[FACTION] }).click()

  await page.locator('form button[type="submit"]').click()
  await page.waitForURL((url) => !url.pathname.startsWith('/characters/create'))

  const me = await readJson<CurrentUser>(await ctx.request.get(`${API}/auth/me`), 'GET /auth/me')
  expect(me.character?.display_name).toBe(name)
  expect(me.character?.faction_slug).toBe(FACTION)
  await ctx.close()
})
