import { test, expect } from '@playwright/test'

import { THEME_STORAGE_KEY, type Theme } from '../../src/hooks/useTheme'
import { settle } from './settle'
import { SWEEP_VIEWPORTS } from '../../src/utils/contrastSweep'

/**
 * Screenshots of named routes for a reviewer; asserts only no uncaught error.
 *
 *   SHOT_ROUTES="/tasks /factions/snide" npm run shots
 *
 * Starts this checkout's Vite on :3000; the backend is whatever is on :8000.
 *
 *   SHOT_ROUTES  space-separated paths (required).
 *   SHOT_LOGIN   extra /auth/dev-login params, e.g. "faction=snide&level=3"
 *                (default "level=1"); "guest" = signed out. The bot keeps its
 *                last faction, so name one when dress matters.
 *   SHOT_DIR     output dir (default test-results/shots, emptied on each run).
 *   SHOT_VIEWPORTS  mobile (375), narrow (621), desktop (1280), wide (1920).
 *                Default "mobile,desktop".
 *   SHOT_THEME   light | dark | both. Unset = dark, no theme in file names.
 *   MAX_SCREENS  screenfuls per page (default 4).
 *
 * Files are `<route>.<viewport>[.<theme>].<n>.png`, one per screenful: a
 * full-page image gets downscaled past legibility.
 */
const API = process.env.E2E_API_URL ?? 'http://localhost:8000'
const ROUTES = (process.env.SHOT_ROUTES ?? '').split(/\s+/).filter(Boolean)
const LOGIN = process.env.SHOT_LOGIN ?? 'level=1'
const OUT = process.env.SHOT_DIR ?? 'test-results/shots'

// shortcut: longer pages are cut off; raise MAX_SCREENS when needed.
const MAX_SCREENS = Number(process.env.MAX_SCREENS) || 4

// `narrow` = half a laptop screen, fine pointer → desktop shell (#3182).
const SIZES = {
  ...SWEEP_VIEWPORTS,
  narrow: { width: 621, height: 900 },
  wide: { width: 1920, height: 1080 },
}
type ShotViewport = keyof typeof SIZES
const VIEWPORTS = (process.env.SHOT_VIEWPORTS ?? 'mobile,desktop')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean) as ShotViewport[]
for (const v of VIEWPORTS)
  if (!(v in SIZES)) throw new Error(`SHOT_VIEWPORTS: unknown "${v}" — use ${Object.keys(SIZES).join(', ')}`)

const THEME_ENV = process.env.SHOT_THEME
if (THEME_ENV && !['light', 'dark', 'both'].includes(THEME_ENV))
  throw new Error('SHOT_THEME must be light, dark or both')
const THEMES: Theme[] = THEME_ENV === 'both' ? ['light', 'dark'] : [(THEME_ENV as Theme) ?? 'dark']

const COMBOS = VIEWPORTS.flatMap((v) => THEMES.map((t) => [v, t] as const))

for (const route of ROUTES) {
  for (const [viewport, theme] of COMBOS) {
    const themeTag = THEME_ENV ? `.${theme}` : ''
    // Phone layout needs `(pointer: coarse)` (#3182).
    test.describe(`${route} · ${viewport}${themeTag}`, () => {
    test.use({ hasTouch: viewport === 'mobile' })
    test('shot', async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(String(e)))

      const { width, height } = SIZES[viewport]
      await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [THEME_STORAGE_KEY, theme])
      await page.setViewportSize({ width, height })
      if (LOGIN !== 'guest') {
        // Own account, so it never re-factions a person's dev account.
        const res = await page.request.post(`${API}/auth/dev-login?key=shots&name=Shot%20Bot&${LOGIN}`)
        expect(res.ok(), `dev-login failed — is the backend up on ${API}?`).toBeTruthy()
      }

      await page.goto(route)
      await settle(page)

      const name = route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'root'
      const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight)
      for (let n = 0; n < MAX_SCREENS && n * height < pageHeight; n++) {
        await page.evaluate((y) => window.scrollTo(0, y), n * height)
        await page.screenshot({
          path: `${OUT}/${name}.${viewport}${themeTag}.${n + 1}.png`,
          animations: 'disabled',
        })
      }

      expect(errors, errors.join('\n')).toHaveLength(0)
    })
    })
  }
}
