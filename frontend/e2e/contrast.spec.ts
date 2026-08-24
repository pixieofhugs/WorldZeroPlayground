import { test, expect, type Page } from '@playwright/test'
import { appendFileSync } from 'node:fs'

import { scanPageForContrast, type Finding } from '../src/utils/contrastScan'
import {
  assessSweep,
  routesFor,
  SWEEP_FACTIONS,
  SWEEP_THEMES,
  SWEEP_VIEWPORTS,
  type SweepFaction,
  type SweepTheme,
  type SweepViewport,
} from '../src/utils/contrastSweep'

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
 * THIS FILE DECIDES NOTHING (#1780, Molly's ruling of 2026-08-18). It acquires
 * pages and asserts; every judgement it used to hold — who is swept, which
 * routes, what the unmeasurable ceiling is, what a failure report says, which
 * failures may be written back into the baseline — now lives in
 * `src/utils/contrastSweep.ts`, under the app's own build graph, where
 * `tsc --noEmit`, `eslint src` and vitest reach it in a PR rather than a
 * browser reaching it at 3am. Read that module before changing anything here.
 *
 * Nightly, not per-PR: `.github/workflows/e2e.yml` already stands up Postgres
 * + backend + seed + Playwright. No new CI job, and the browser run stays
 * nightly-only and not-required — moving the logic out did not move the run.
 *
 * REGENERATING THE BASELINE. Set `CONTRAST_BASELINE_OUT=<path>` and run the
 * suite; every MEASURED failure is appended there as a ready-to-paste entry.
 * The list is machine-produced on purpose — hand-typed ratios would be wrong
 * within a week, which is the whole thesis of this issue. Unmeasurable
 * backdrops are NOT baseline entries (#1762), so nothing is emitted for them;
 * their ceiling comes off the report this prints on every run.
 */

const API = process.env.E2E_API_URL ?? 'http://localhost:8000'
const BASELINE_OUT = process.env.CONTRAST_BASELINE_OUT

// This spec opts out of the shared bot's saved cookie: it re-logs per faction
// against its own dev account so it can't leave other specs' bot in Snide.
test.use({ storageState: { cookies: [], origins: [] } })

async function loginAs(page: Page, faction: SweepFaction): Promise<void> {
  const response = await page.request.post(
    `${API}/auth/dev-login?key=contrast&name=Contrast%20Bot&faction=${faction}`,
  )
  expect(response.ok(), `dev-login?faction=${faction} failed — is the backend up on ${API}?`).toBeTruthy()
  expect((await response.json()).faction_slug).toBe(faction)
}

async function useTheme(page: Page, theme: SweepTheme): Promise<void> {
  // The theme is bootstrapped from localStorage in index.html before React
  // hydrates, so it must be seeded before the first navigation — not toggled
  // after, which would measure a repaint rather than the real first paint.
  await page.addInitScript((value) => {
    window.localStorage.setItem('wz-theme', value as string)
  }, theme)
}

for (const faction of SWEEP_FACTIONS) {
  for (const theme of SWEEP_THEMES) {
    for (const viewport of Object.keys(SWEEP_VIEWPORTS) as SweepViewport[]) {
      test(`${faction} · ${theme} · ${viewport} clears WCAG AA`, async ({ page }) => {
        test.setTimeout(120_000)
        await page.setViewportSize(SWEEP_VIEWPORTS[viewport])
        await useTheme(page, theme)
        await loginAs(page, faction)

        const findings: Finding[] = []
        for (const route of routesFor(faction)) {
          await page.goto(route)
          // The skin depends on the viewer's faction, which arrives with
          // /auth/me — measuring before it lands would measure the default.
          await page.waitForLoadState('networkidle')
          await expect(page.locator('html')).toHaveAttribute('data-theme', theme)

          findings.push(...((await page.evaluate(scanPageForContrast)) as Finding[]))
        }

        const verdict = assessSweep({ faction, theme, viewport }, findings)

        if (BASELINE_OUT) appendFileSync(BASELINE_OUT, verdict.baselineEntries.join(''))

        // LOUD, always — including on a green run. The whole risk of the #1675
        // ruling is a suite that looks greener because it checks less, and the
        // only defence against that is printing what went unchecked every time.
        for (const report of verdict.reports) console.log(report)

        expect(verdict.failures, verdict.failureMessage).toHaveLength(0)
        expect(verdict.unmeasurableSurfaces, verdict.ceilingMessage).toBeLessThanOrEqual(verdict.ceiling)
        expect(verdict.stale, verdict.staleMessage).toHaveLength(0)
      })
    }
  }
}
