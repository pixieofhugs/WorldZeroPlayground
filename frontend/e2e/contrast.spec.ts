import { test, expect, type Page } from '@playwright/test'
import { appendFileSync } from 'node:fs'

import { UNRESOLVED_SURFACE_CEILING, baselineKey, triageFindings } from './contrastBaseline'
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
 * THREE OUTCOMES, NOT TWO (#1675). A measured pairing below AA fails. A
 * backdrop the scanner REFUSES to measure — a gradient with an opaque stop, an
 * image — is reported instead, and only its COUNT is asserted, against
 * `UNRESOLVED_SURFACE_CEILING`. Failing on those made the spec unsatisfiable:
 * the faction skins are built out of exactly those fills, so all 28 tests were
 * red from the day the guard landed. See contrastBaseline.ts Part D.
 *
 * REGENERATING THE BASELINE. Set `CONTRAST_BASELINE_OUT=<path>` and run the
 * suite; every MEASURED failure is appended there as a ready-to-paste entry.
 * The list is machine-produced on purpose — hand-typed ratios would be wrong
 * within a week, which is the whole thesis of this issue. Unmeasurable
 * backdrops are not baseline entries any more, so nothing is emitted for them;
 * their ceiling comes off the report this prints on every run.
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

function describeFinding(finding: Finding): string {
  const size = `${finding.fontSizePx}px/${finding.fontWeight}`
  return `  ${finding.ratio.toFixed(2)}:1 (needs ${finding.required}:1) — ${finding.text} on ${finding.background}\n    ${finding.where} (${size}) "${finding.sample}"`
}

/**
 * One line per surface the scanner refused to measure: how many text nodes sit
 * on it, and one of them so a human can go look. The CSS is the identity, so
 * it leads; it is trimmed only for the console.
 */
function describeSurface(css: string, over: Finding[]): string {
  const example = over[0]
  return (
    `  ${over.length} node(s) over ${css.slice(0, 120)}${css.length > 120 ? '…' : ''}\n` +
    `    e.g. ${example.where} (${example.fontSizePx}px/${example.fontWeight}) "${example.sample}"`
  )
}

/** Emit a ready-to-paste BASELINE entry when regenerating (see header). */
function emitBaseline(finding: Finding, faction: Faction, theme: Theme, viewport: ViewportName): void {
  if (!BASELINE_OUT || finding.background === null) return
  const key = baselineKey(theme, finding.text, finding.background, finding.required)
  const where = `${faction}/${theme}/${viewport} ${finding.where}`.replace(/'/g, '')
  appendFileSync(
    BASELINE_OUT,
    `  ${JSON.stringify(key)}: { ratio: ${finding.ratio.toFixed(2)}, issue: 651, where: '${where}' },\n`,
  )
}

for (const faction of FACTIONS) {
  for (const theme of THEMES) {
    for (const viewport of Object.keys(VIEWPORTS) as ViewportName[]) {
      test(`${faction} · ${theme} · ${viewport} clears WCAG AA`, async ({ page }) => {
        test.setTimeout(120_000)
        await page.setViewportSize(VIEWPORTS[viewport])
        await useTheme(page, theme)
        await loginAs(page, faction)

        const combination = `${faction}/${theme}/${viewport}`
        const routes = [...SHARED_ROUTES, `/factions/${faction}`]
        const findings: Finding[] = []

        for (const route of routes) {
          await page.goto(route)
          // The skin depends on the viewer's faction, which arrives with
          // /auth/me — measuring before it lands would measure the default.
          await page.waitForLoadState('networkidle')
          await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
          findings.push(...((await page.evaluate(scanPageForContrast)) as Finding[]))
        }

        const { failures, stale, unmeasurable } = triageFindings(theme, findings)
        for (const finding of failures) emitBaseline(finding, faction, theme, viewport)

        // The report is the whole point of #1675: an unmeasurable backdrop no
        // longer fails, so it has to be VISIBLE, on every run, pass or fail. A
        // silent skip is a green suite that checks less.
        const ceiling: number | undefined = UNRESOLVED_SURFACE_CEILING[combination]
        const unchecked = [...unmeasurable.values()].reduce((total, over) => total + over.length, 0)
        console.log(
          `\n[contrast] ${combination}: ${unmeasurable.size} unmeasurable surface(s) ` +
            `(ceiling ${ceiling ?? 0}), ${unchecked} text node(s) unchecked.\n` +
            [...unmeasurable].map(([css, over]) => describeSurface(css, over)).join('\n'),
        )

        const describedFailures = [...new Set(failures.map(describeFinding))]
        expect(
          describedFailures,
          `${combination}: text below WCAG AA.\n\n` + describedFailures.join('\n\n'),
        ).toHaveLength(0)

        expect(
          [...new Set(stale)],
          `These pairs are in RENDERED_BASELINE but now clear AA — delete their entries in contrastBaseline.ts. ` +
            `The list only ever shrinks.`,
        ).toHaveLength(0)

        // Gaining a surface is a coverage regression, not a contrast defect:
        // a region of the app just stopped being checked at all. Losing one is
        // progress and only asks for the ceiling to come down.
        expect(
          unmeasurable.size,
          `${combination}: ${unmeasurable.size} surfaces cannot be measured, up from ${ceiling ?? 0}. ` +
            `Either give the new one a solid backdrop, or — if the fill is deliberate — raise its entry in ` +
            `UNRESOLVED_SURFACE_CEILING to the number printed above and say which surface it is.\n\n` +
            [...unmeasurable.keys()].join('\n'),
        ).toBeLessThanOrEqual(ceiling ?? 0)
      })
    }
  }
}
