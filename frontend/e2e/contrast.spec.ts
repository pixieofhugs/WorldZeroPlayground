import { test, expect, type Page } from '@playwright/test'
import { appendFileSync } from 'node:fs'

import { RENDERED_BASELINE, baselineKey, unresolvedKey, type BaselineEntry } from './contrastBaseline'
import { scanPageForContrast, type Finding } from './contrastScan'

/**
 * Part B of the contrast foundation (#651) — the RENDERED contrast sweep.
 *
 * Part A (`src/utils/__tests__/factionContrast.test.ts`) measures token
 * *values*. It cannot catch the other half of this bug family: a component
 * reaching for the wrong token — `--everymen-ink` (structure: borders, rules,
 * text on gold elements) used as body text on `--everymen-paper` (the surface
 * that FLIPS in dark). That pairing is 1.16:1 in dark, and it only exists once
 * rendered. #595 fixed one instance of it by hand; siblings survived. This
 * walks all of them.
 *
 * Coverage: 7 factions x 2 themes x 2 viewports. Both viewports because the
 * mobile archetypes are separate files and diverge (#565) — a desktop-only
 * sweep would report green over half the app.
 *
 * Nightly, not per-PR: `.github/workflows/e2e.yml` already stands up Postgres
 * + backend + seed + Playwright. No new CI job.
 *
 * REGENERATING THE BASELINE. Set `CONTRAST_BASELINE_OUT=<path>` and run the
 * suite; every failure is appended there as a ready-to-paste entry. The list
 * is machine-produced on purpose — hand-typed ratios would be wrong within a
 * week, which is the whole thesis of this issue.
 */

const API = process.env.E2E_API_URL ?? 'http://localhost:8000'
const BASELINE_OUT = process.env.CONTRAST_BASELINE_OUT

const FACTIONS = ['ua', 'everymen', 'wow', 'snide', 'ephemerists', 'singularity', 'albescent'] as const
const THEMES = ['light', 'dark'] as const
const VIEWPORTS = {
  // Matches useFormFactor's single 767px breakpoint (#494) — no tablet tier.
  mobile: { width: 375, height: 812 },
  desktop: { width: 1280, height: 800 },
} as const

type Theme = (typeof THEMES)[number]
type Faction = (typeof FACTIONS)[number]
type ViewportName = keyof typeof VIEWPORTS

/**
 * Routes whose chrome is skinned by the viewer's faction. `/factions/${slug}`
 * is added per-faction — it is the faction's own bespoke surface.
 */
const SHARED_ROUTES = ['/', '/tasks', '/praxes', '/leaderboard', '/factions']

// This spec opts out of the shared bot's saved cookie: it re-logs per faction
// against its own dev account so it can't leave other specs' bot in Snide.
test.use({ storageState: { cookies: [], origins: [] } })

async function loginAs(page: Page, faction: Faction): Promise<void> {
  const response = await page.request.post(
    `${API}/auth/dev-login?key=contrast&name=Contrast%20Bot&faction=${faction}`,
  )
  expect(response.ok(), `dev-login?faction=${faction} failed — is the backend up on ${API}?`).toBeTruthy()
  expect((await response.json()).faction_slug).toBe(faction)
}

async function useTheme(page: Page, theme: Theme): Promise<void> {
  // The theme is bootstrapped from localStorage in index.html before React
  // hydrates, so it must be seeded before the first navigation — not toggled
  // after, which would measure a repaint rather than the real first paint.
  await page.addInitScript((value) => {
    window.localStorage.setItem('wz-theme', value as string)
  }, theme)
}

function keyOf(theme: Theme, finding: Finding): string {
  return finding.background === null
    ? unresolvedKey(theme, finding.text, finding.backdropCss ?? 'unknown', finding.required)
    : baselineKey(theme, finding.text, finding.background, finding.required)
}

function describeFinding(finding: Finding): string {
  const size = `${finding.fontSizePx}px/${finding.fontWeight}`
  if (finding.background === null) {
    return `  UNRESOLVED BACKDROP (${finding.unresolvedKind}) — ${finding.where} (${size})\n    "${finding.sample}"\n    ${finding.unresolved}`
  }
  return `  ${finding.ratio.toFixed(2)}:1 (needs ${finding.required}:1) — ${finding.text} on ${finding.background}\n    ${finding.where} (${size}) "${finding.sample}"`
}

/** Emit a ready-to-paste BASELINE entry when regenerating (see header). */
function emitBaseline(key: string, finding: Finding, faction: Faction, theme: Theme, viewport: ViewportName): void {
  if (!BASELINE_OUT) return
  const ratio = finding.background === null ? 'null' : finding.ratio.toFixed(2)
  const where = `${faction}/${theme}/${viewport} ${finding.where}`.replace(/'/g, '')
  appendFileSync(BASELINE_OUT, `  ${JSON.stringify(key)}: { ratio: ${ratio}, issue: 651, where: '${where}' },\n`)
}

for (const faction of FACTIONS) {
  for (const theme of THEMES) {
    for (const viewport of Object.keys(VIEWPORTS) as ViewportName[]) {
      test(`${faction} · ${theme} · ${viewport} clears WCAG AA`, async ({ page }) => {
        test.setTimeout(120_000)
        await page.setViewportSize(VIEWPORTS[viewport])
        await useTheme(page, theme)
        await loginAs(page, faction)

        const routes = [...SHARED_ROUTES, `/factions/${faction}`]
        const failures: string[] = []
        const passing: string[] = []

        for (const route of routes) {
          await page.goto(route)
          // The skin depends on the viewer's faction, which arrives with
          // /auth/me — measuring before it lands would measure the default.
          await page.waitForLoadState('networkidle')
          await expect(page.locator('html')).toHaveAttribute('data-theme', theme)

          const findings = (await page.evaluate(scanPageForContrast)) as Finding[]
          for (const finding of findings) {
            const ok = finding.background !== null && finding.ratio >= finding.required
            const key = keyOf(theme, finding)
            const allowed: BaselineEntry | undefined = RENDERED_BASELINE[key]

            if (ok) {
              // A pair that now passes but is still allowlisted is debt that
              // got fixed without the list being updated. Catch it: an
              // allowlist that outlives its bug stops being a ratchet.
              if (allowed) passing.push(`${key} now measures ${finding.ratio.toFixed(2)}:1 (owned by #${allowed.issue})`)
              continue
            }
            if (allowed) continue
            emitBaseline(key, finding, faction, theme, viewport)
            failures.push(describeFinding(finding))
          }
        }

        expect(
          [...new Set(failures)],
          `${faction}/${theme}/${viewport}: text below WCAG AA.\n` +
            `An UNRESOLVED BACKDROP is a failure, not a skip — text over an opaque-stop gradient or an image ` +
            `cannot be measured, so it must be given a solid backdrop (or the fill hoisted behind an opaque card).\n\n` +
            [...new Set(failures)].join('\n\n'),
        ).toHaveLength(0)

        expect(
          [...new Set(passing)],
          `These pairs are in RENDERED_BASELINE but now clear AA — delete their entries in contrastBaseline.ts. ` +
            `The list only ever shrinks.`,
        ).toHaveLength(0)
      })
    }
  }
}
