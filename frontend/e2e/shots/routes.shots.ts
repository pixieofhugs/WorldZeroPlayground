import { test, expect } from '@playwright/test'

import { THEME_STORAGE_KEY, type Theme } from '../../src/hooks/useTheme'
import { SWEEP_VIEWPORTS } from '../../src/utils/contrastSweep'

/**
 * Screenshots of named routes, at the two form factors, for a reviewer to LOOK
 * at. It asserts one thing — the page threw no uncaught error — because a
 * picture of a crash is still a picture.
 *
 *   SHOT_ROUTES="/tasks /factions/snide" npm run shots
 *
 * Run it from the checkout whose code you want pictured: the config starts
 * that checkout's Vite on :3000. The backend is whatever is on :8000
 * (`scripts/wz up`), so a branch's BACKEND changes are not in the picture.
 *
 *   SHOT_ROUTES  space-separated paths. Required — none means no tests.
 *   SHOT_LOGIN   extra /auth/dev-login params for the bot, e.g.
 *                "faction=snide&level=3" (default "level=1"); "guest" signs
 *                nobody in. Parameters: docs/agents/local-world.md. The bot
 *                is one account and keeps the faction its last run gave it,
 *                so name a faction whenever the dress matters.
 *   SHOT_DIR     where the PNGs go (default test-results/shots, gitignored).
 *                Playwright empties test-results/ when any run starts, so a
 *                second run that must keep the first's pictures names its own.
 *
 *   SHOT_VIEWPORTS  comma list of mobile (375), desktop (1280), wide (1920).
 *                Default "mobile,desktop".
 *   SHOT_THEME   light | dark | both. The app is dark until the `wz-theme`
 *                localStorage key says otherwise (#1698), so that is how light
 *                is set here. Unset = dark, and file names carry no theme.
 *   MAX_SCREENS  screenfuls kept per page (default 4).
 *
 * Files are `<route>.<viewport>.<n>.png` (`<route>.<viewport>.<theme>.<n>.png`
 * when SHOT_THEME is set), one per screenful rather than one
 * tall image: a full-page capture is scaled down to fit a model's image limit
 * and the text in it stops being readable.
 */
const API = process.env.E2E_API_URL ?? 'http://localhost:8000'
const ROUTES = (process.env.SHOT_ROUTES ?? '').split(/\s+/).filter(Boolean)
const LOGIN = process.env.SHOT_LOGIN ?? 'level=1'
const OUT = process.env.SHOT_DIR ?? 'test-results/shots'

// shortcut: a page longer than this many screens is cut off, raise it with MAX_SCREENS when a reviewed change sits lower.
const MAX_SCREENS = Number(process.env.MAX_SCREENS) || 4

const SIZES = { ...SWEEP_VIEWPORTS, wide: { width: 1920, height: 1080 } }
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
    test(`${route} · ${viewport}${themeTag}`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(String(e)))

      const { width, height } = SIZES[viewport]
      await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [THEME_STORAGE_KEY, theme])
      await page.setViewportSize({ width, height })
      if (LOGIN !== 'guest') {
        // Its own account, so it never moves the faction of the dev account a person is signed in as.
        const res = await page.request.post(`${API}/auth/dev-login?key=shots&name=Shot%20Bot&${LOGIN}`)
        expect(res.ok(), `dev-login failed — is the backend up on ${API}?`).toBeTruthy()
      }

      await page.goto(route)
      // The skin arrives with /auth/me, and a face that has not loaded yet paints as a fallback.
      await page.waitForLoadState('networkidle')
      await page.evaluate(() => document.fonts.ready)

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
  }
}
