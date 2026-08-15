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
 *
 * WHAT THIS LIST CANNOT REACH, and why it matters (#694). Every route here is
 * a READ surface reachable from a fresh login. The composer, the collab
 * waiting surface and the praxis detail page are not, because each needs a
 * praxis the bot owns; and some of the worst pairings in the app only exist in
 * a STATE rather than on a route. #694's was one: the collab roster renders
 * nothing below two members, and its filled row only appears once some — not
 * all — of them have cast. No route walk produces that, so a 1.05:1 pairing
 * sat on a faction surface without either guard seeing it.
 *
 * Adding routes is not the fix; the fix is a fixture that puts a praxis into
 * each interesting state before the scan. Until then the token test
 * (`src/utils/__tests__/factionContrast.test.ts`) carries these surfaces, which
 * is why its ROSTER_PAIRS block measures a pairing rather than a documented
 * role — read that block's header before assuming a token is covered here.
 */
const SHARED_ROUTES = ['/', '/tasks', '/praxis', '/leaderboard', '/factions']

/**
 * The unmeasurable ratchet (#1675, owner ruling 2026-08-14).
 *
 * An unresolved backdrop used to FAIL. It cannot: the scanner is reporting that
 * it could not measure, not that it measured something bad, and "give every
 * gradient a solid backdrop" fights the faction skins the design system exists
 * to have. So an unmeasurable surface is now REPORTED instead — loudly, with a
 * count and a list, because a silent skip turns a red suite into a green one
 * that checks less.
 *
 * The ceiling is what stops that from being a hole. A NEW unmeasurable surface
 * is a regression in coverage even though it is not a contrast defect, so the
 * count may only ever go down. These numbers are the deduped unresolved count
 * per test in nightly run 31779247838 — measured, not chosen. They are
 * independent of THEME (identical light and dark, all seven factions), which is
 * what you would expect of fills that are the same shape in both.
 *
 * Lower one whenever a fix retires a surface. Raising one is a decision, not a
 * chore: it means a new fill is now hiding text from the sweep.
 */
const UNMEASURABLE_CEILING: Record<string, Record<ViewportName, number>> = {
  // WOW's title bars and UA's gilt wordmark are the two kits with extra fills.
  wow: { desktop: 22, mobile: 25 },
  ua: { desktop: 19, mobile: 14 },
  default: { desktop: 16, mobile: 14 },
}

function ceilingFor(faction: Faction, viewport: ViewportName): number {
  return (UNMEASURABLE_CEILING[faction] ?? UNMEASURABLE_CEILING.default)[viewport]
}

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
        const unmeasurable: string[] = []

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
            // The one branch #1675 added: a backdrop the scanner could not
            // resolve is a hole in COVERAGE, not a contrast defect, so it is
            // counted and printed rather than failed. See UNMEASURABLE_CEILING.
            if (finding.background === null) {
              unmeasurable.push(describeFinding(finding))
              continue
            }
            failures.push(describeFinding(finding))
          }
        }

        // LOUD, always — including on a green run. The whole risk of the #1675
        // ruling is a suite that looks greener because it checks less, and the
        // only defence against that is printing what went unchecked every time.
        const unchecked = [...new Set(unmeasurable)]
        const ceiling = ceilingFor(faction, viewport)
        console.log(
          `\n${faction}/${theme}/${viewport}: ${unchecked.length} unmeasurable surface(s), ` +
            `ceiling ${ceiling}.\n` +
            (unchecked.length ? `${unchecked.join('\n\n')}\n` : '  (none)\n'),
        )

        expect(
          [...new Set(failures)],
          `${faction}/${theme}/${viewport}: text below WCAG AA.\n\n` +
            [...new Set(failures)].join('\n\n'),
        ).toHaveLength(0)

        expect(
          unchecked.length,
          `${faction}/${theme}/${viewport}: ${unchecked.length} unmeasurable surfaces, up from ${ceiling}. ` +
            `A new opaque-stop fill is now hiding text from the sweep — that is lost coverage, not a style bug. ` +
            `Give the text a solid backdrop, or raise this faction's entry in UNMEASURABLE_CEILING deliberately.\n\n` +
            unchecked.join('\n\n'),
        ).toBeLessThanOrEqual(ceiling)

        expect(
          [...new Set(passing)],
          `These pairs are in RENDERED_BASELINE but now clear AA — delete their entries in contrastBaseline.ts. ` +
            `The list only ever shrinks.`,
        ).toHaveLength(0)
      })
    }
  }
}
