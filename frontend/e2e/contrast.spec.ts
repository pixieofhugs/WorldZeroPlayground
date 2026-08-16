import { test, expect, type Page } from '@playwright/test'
import { appendFileSync } from 'node:fs'

import { baselineKey, triageFindings } from './contrastBaseline'
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
 * suite; every MEASURED failure is appended there as a ready-to-paste entry.
 * The list is machine-produced on purpose — hand-typed ratios would be wrong
 * within a week, which is the whole thesis of this issue. Unmeasurable
 * backdrops are NOT baseline entries (#1762), so nothing is emitted for them;
 * their ceiling comes off the report this prints on every run.
 *
 * The policy itself — which finding fails, which is reported, which allowlist
 * entry has gone stale — is `triageFindings` in contrastBaseline.ts, so that
 * `src/utils/__tests__/contrastTriage.test.ts` can exercise it in a PR without
 * a browser. This file drives the pages and prints; it decides nothing.
 */

const API = process.env.E2E_API_URL ?? 'http://localhost:8000'
const BASELINE_OUT = process.env.CONTRAST_BASELINE_OUT

/**
 * WHO IS SWEPT, and who is not (#1903). Seven slugs — `coven` is a registered
 * faction with its own CSS key and its own archetypes (CovenPraxisCard,
 * CovenAvatar, CovenBackdrop) and is NOT one of them, and neither is `na`, the
 * unaffiliated identity every player starts in (ADR-0030). Their skins have
 * never been walked here. Read a green run as "these seven cleared AA", not as
 * "the app cleared AA"; the roster gap is a known one and belongs with #1727.
 */
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
 *
 * #1819 IS THE SECOND ONE OF THESE, and it is worth recording what the missing
 * fixture would have to do, because "add the composer" understates it by a lot.
 * The two composer notices — the room CONNECTING and the document FROZEN — sat
 * at 2.01:1 on the Ephemerists plate, and neither is route-reachable:
 *   - FROZEN needs a praxis whose `status !== 'in_progress'`, so the fixture
 *     must create AND submit one, per faction, and the composer must still be
 *     reachable afterwards.
 *   - CONNECTING is `room.body !== null && !room.seeded` — a socket that has
 *     OPENED and not yet been seeded. Blocking the WebSocket does not produce
 *     it (that leaves `body` null and no notice at all); it needs
 *     `page.routeWebSocket` proxying the real server and swallowing the seed
 *     frame. That is a fixture with its own failure modes, and a flaky nightly
 *     is worse than a documented gap.
 * Both are guarded meanwhile at their MOUNT, DOM-lessly and in the PR, by
 * `src/pages/editPraxis/archetypes/__tests__/composerQuietInk.test.tsx` — which
 * asserts the notices carry no inline ink, so the seam the ratio would measure
 * is at least reachable. A ratio still needs this file.
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
 * count may only ever go down.
 *
 * A SURFACE, NOT A FINDING (#1762). The unit is one distinct `backdropCss`,
 * however many text nodes sit on it. Counting findings made the ceiling churn
 * on every copy edit — add a line of body text to a card on the gilt wordmark
 * and the number moves — while the thing worth ratcheting, a NEW region of the
 * app going unchecked, is exactly one new surface. The report prints both, so
 * the node count is still visible; only the assertion is coarser.
 *
 * PROVENANCE (#1903). These are measured numbers, read off nightly run
 * 31931556465 (2026-08-16, `8153e246`), which prints the whole population per
 * test. That discharges the ponytail #1762 left here — it carried counts
 * guessed in a browserless worktree and said to correct them from the first
 * real run. Two real runs have now happened, and the guesses held exactly on
 * run 31869484266 (08-15): none of the 56 deleted `ratio: null` allowlist
 * entries moved a count, so the +4/+2 exposure it warned about never landed.
 *
 * WHY EVERY ROW WENT UP BY ONE on 08-16. The new surface is UA's three-stop
 * parchment ramp — `--faction-ua-card-parchment` on `UaTaskCard`'s article.
 * Neither that token nor the card changed; #1676 seeded a UA-faction task
 * (`ensure_duel_fixture_task`, dev-only, for the duel fixture) onto the board
 * the sweep walks, and a task card is skinned by the TASK's faction, not the
 * viewer's. So one seeded row put UA's paper stock on all seven runs at once:
 * 22 text nodes for the six non-UA viewers on both viewports, 44 desktop /
 * 37 mobile for a UA viewer, whose own feed and praxis chrome share the ramp
 * (`--faction-ua-parchment` computes byte-identical, so the report cannot tell
 * the two tokens apart — see #857's exception block).
 *
 * RAISED, NOT FLATTENED. The test's own message prefers a solid backdrop, and
 * that is the wrong trade here: the ramp is UA's paper stock, the archetype
 * itself, and "give every gradient a solid backdrop" is precisely the fight
 * the #1675 ruling declined to have. The cost is recorded rather than hidden —
 * 22 more text nodes per run now go unchecked, and `UaTaskCard`'s own header
 * already reasons about its darkest stop (2.93:1), so the token test carries
 * that pairing.
 *
 * Lower one whenever a fix retires a surface. Raising one is a decision, not a
 * chore: it means a new fill is now hiding text from the sweep.
 */
const UNMEASURABLE_CEILING: Record<string, Record<ViewportName, number>> = {
  // WOW's title bars and UA's gilt wordmark are the two kits with extra fills.
  wow: { desktop: 9, mobile: 8 },
  ua: { desktop: 9, mobile: 6 },
  default: { desktop: 8, mobile: 6 },
}

/** Which row of the table governs this faction — named, so the failure message can quote it. */
function ceilingKeyFor(faction: Faction): string {
  return faction in UNMEASURABLE_CEILING ? faction : 'default'
}

function ceilingFor(faction: Faction, viewport: ViewportName): number {
  return UNMEASURABLE_CEILING[ceilingKeyFor(faction)][viewport]
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

function describeFinding(finding: Finding): string {
  const size = `${finding.fontSizePx}px/${finding.fontWeight}`
  return `  ${finding.ratio.toFixed(2)}:1 (needs ${finding.required}:1) — ${finding.text} on ${finding.background}\n    ${finding.where} (${size}) "${finding.sample}"`
}

/**
 * One line per surface the scanner refused to measure: how many text nodes sit
 * on it, and one of them so a human can go and look. The CSS is the identity,
 * so it leads. Printing every finding instead repeated the same gradient 14-25
 * times per test, which is a report nobody reads.
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
  // An unmeasurable backdrop has no ratio to record and is ratcheted by count,
  // not allowlisted — emitting one would recreate the second mechanism #1762
  // deleted. `triageFindings` only ever puts measured findings in `failures`;
  // the guard is belt-and-braces for a hand-called regeneration.
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

        // LOUD, always — including on a green run. The whole risk of the #1675
        // ruling is a suite that looks greener because it checks less, and the
        // only defence against that is printing what went unchecked every time.
        const ceiling = ceilingFor(faction, viewport)
        const uncheckedNodes = [...unmeasurable.values()].reduce((total, over) => total + over.length, 0)
        console.log(
          `\n[contrast] ${combination}: ${unmeasurable.size} unmeasurable surface(s) ` +
            `(ceiling ${ceiling}), ${uncheckedNodes} text node(s) unchecked.\n` +
            (unmeasurable.size
              ? `${[...unmeasurable].map(([css, over]) => describeSurface(css, over)).join('\n')}\n`
              : '  (none)\n'),
        )

        const describedFailures = [...new Set(failures.map(describeFinding))]
        expect(
          describedFailures,
          `${combination}: text below WCAG AA.\n\n` + describedFailures.join('\n\n'),
        ).toHaveLength(0)

        // Gaining a surface is a coverage regression, not a contrast defect: a
        // region of the app just stopped being checked at all. Losing one is
        // progress, and only asks for the ceiling to come down.
        expect(
          unmeasurable.size,
          `${combination}: ${unmeasurable.size} unmeasurable surfaces, up from ${ceiling}. ` +
            `A new opaque-stop fill is now hiding text from the sweep — that is lost coverage, not a style bug.\n\n` +
            `TO CORRECT THIS CEILING from this run: the surfaces printed above are the whole population, so ` +
            `set '${ceilingKeyFor(faction)}'.${viewport} in UNMEASURABLE_CEILING ` +
            `to ${unmeasurable.size} — but only after checking the new surface against the list above. ` +
            `If it is one you can give a solid backdrop, do that instead; the ceiling only ever comes down.\n\n` +
            [...unmeasurable.keys()].join('\n'),
        ).toBeLessThanOrEqual(ceiling)

        expect(
          [...new Set(stale)],
          `These pairs are in RENDERED_BASELINE but now clear AA — delete their entries in contrastBaseline.ts. ` +
            `The list only ever shrinks.`,
        ).toHaveLength(0)
      })
    }
  }
}
