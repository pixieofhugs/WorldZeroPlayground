/**
 * Pictures of the seven faction invitation letters (#3294) — the owner's
 * sign-off shots, light and dark, desktop and phone.
 *
 *   SHOT_DIR=/tmp/letters npm run shots -- e2e/shots/invitations.shots.ts
 *
 * Knobs: SHOT_THEME (light|dark|both, default both), SHOT_VIEWPORTS (mobile,
 * desktop, wide; default mobile,desktop), SHOT_DIR, LETTER_SLUGS (comma list).
 *
 * WHY THIS IS NOT `routes.shots.ts` + `SHOT_LOGIN=invited=…`: the letter only
 * opens when `InvitationWatcher` sees a slug it did not see last time, and its
 * first look at a character seeds silently. So each shot signs in WITHOUT the
 * invitation, loads a page (the seed), signs in again WITH it, and reloads: the
 * diff then announces exactly that one letter.
 */
import { test, expect } from '@playwright/test'

const API = process.env.E2E_API_URL ?? 'http://localhost:8000'
const OUT = process.env.SHOT_DIR ?? 'test-results/shots'
const SIZES = { mobile: { width: 375, height: 800 }, desktop: { width: 1280, height: 900 }, wide: { width: 1920, height: 1000 } }
const SLUGS = (process.env.LETTER_SLUGS ?? 'ua,snide,wow,coven,everymen,ephemerists,singularity').split(',')
const VIEWPORTS = (process.env.SHOT_VIEWPORTS ?? 'mobile,desktop').split(',') as (keyof typeof SIZES)[]
const THEME_ENV = process.env.SHOT_THEME ?? 'both'
const THEMES = THEME_ENV === 'both' ? ['light', 'dark'] : [THEME_ENV]
const THEME_STORAGE_KEY = 'wz-theme'

for (const slug of SLUGS) {
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`${slug} letter · ${viewport}.${theme}`, async ({ page }) => {
        await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [THEME_STORAGE_KEY, theme])
        await page.setViewportSize(SIZES[viewport])
        const key = `letter-${slug}-${viewport}-${theme}-${Date.now()}`
        const login = (extra: string) =>
          page.request.post(`${API}/auth/dev-login?key=${key}&name=Letter%20Bot&level=3${extra}`)
        expect((await login('')).ok(), `dev-login failed — is the backend up on ${API}?`).toBeTruthy()
        await page.goto('/factions')
        await page.waitForLoadState('networkidle')
        expect((await login(`&invited=${slug}`)).ok()).toBeTruthy()
        await page.reload()
        const dialog = page.getByRole('dialog')
        await expect(dialog).toBeVisible()
        await page.waitForLoadState('networkidle')
        await page.evaluate(() => document.fonts.ready)
        await page.screenshot({ path: `${OUT}/letter.${slug}.${viewport}.${theme}.png`, animations: 'disabled' })
      })
    }
  }
}
