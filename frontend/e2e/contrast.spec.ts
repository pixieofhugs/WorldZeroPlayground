import { test, expect, type Page } from '@playwright/test'
import { appendFileSync } from 'node:fs'

import forms from '../src/locales/en/forms.json' with { type: 'json' }
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

/**
 * The Location field's accessible name, from the catalogue rather than typed
 * here (ADR-0032): every kit gives the input this string through `namedField`,
 * and a copy edit that moved it would otherwise silently stop selecting a field
 * — which reads as "no Location field on this kit" instead of "the test is
 * stale". Used by the fit rows at the bottom of this file.
 */
const LOCATION_PLACEHOLDER = forms.character.locationPlaceholder

// This spec opts out of the shared bot's saved cookie: it re-logs per faction
// against its own dev account so it can't leave other specs' bot in Snide.
test.use({ storageState: { cookies: [], origins: [] } })

async function loginAs(page: Page, faction: SweepFaction): Promise<{ characterId: number }> {
  const response = await page.request.post(
    `${API}/auth/dev-login?key=contrast&name=Contrast%20Bot&faction=${faction}`,
  )
  expect(response.ok(), `dev-login?faction=${faction} failed — is the backend up on ${API}?`).toBeTruthy()
  const body = await response.json()
  expect(body.faction_slug).toBe(faction)
  return { characterId: body.character_id }
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

/* ==========================================================================
 * THE OTHER THING ONLY A BROWSER CAN SEE: does the text fit the box? (#2990)
 *
 * These rows ride beside the contrast rows because they need the same three
 * things and nothing else: the dev-login seam that places one bot in any
 * faction, a real layout engine, and the loaded webfaces. Per the 2026-08-31
 * ruling on #2864, geometry has ONE home and it is the rendered sweep — the
 * unit harness runs in node, does no layout, and a "width" assertion written
 * there measures nothing. `src/pages/characterPaths/__tests__/
 * locationFieldFloor.test.ts` is what a PR CAN check: that no archetype
 * hard-codes a Location `maxWidth` under the shared floor. It cannot check that
 * the floor is big enough. This can.
 *
 * WHAT WENT WRONG WITHOUT IT. `maxWidth: 280` was copied to five edit kits.
 * `character.locationPlaceholder` is frozen copy (owner ruling #2793, format
 * question on #2798), and in Courier Prime it measured 259px against 252px of
 * field — so Everymen dropped the closing parenthesis of "Location (SFO, PDX,
 * YYZ)" and na dropped it by 5px. Every existing character-path guard asserts
 * structure, dispatch or contrast; none asserted FIT, so both sat in main until
 * somebody looked.
 *
 * DESKTOP ONLY, ONE THEME, on purpose. The floor is a `maxWidth` — a CAP — so
 * on a phone the field is narrower than it and the fix cannot govern that
 * width; a mobile row here would assert a different, unfiled defect against a
 * number that does not reach it. #2990's AC is desktop. And nothing about a
 * text width changes with `data-theme`, so a second theme is a second run of
 * one measurement.
 *
 * NOT VERIFIED BY ITS AUTHOR. This suite is nightly and the nightly is red
 * (#2453, #1674), so these rows did not run in the PR that added them, and no
 * agent worktree has a browser. The first green nightly is the first
 * measurement.
 * ========================================================================== */

for (const faction of SWEEP_FACTIONS) {
  test(`${faction} · edit-character Location placeholder fits its field`, async ({ page }) => {
    test.setTimeout(60_000)
    await page.setViewportSize(SWEEP_VIEWPORTS.desktop)
    const { characterId } = await loginAs(page, faction)

    await page.goto(`/characters/${characterId}/edit`)
    await page.waitForLoadState('networkidle')
    // The faction face arrives on its own stylesheet (#2079) and swaps in after
    // first paint; measuring before it lands would measure the fallback.
    await page.evaluate(() => document.fonts.ready.then(() => undefined))

    const field = page.getByRole('textbox', { name: LOCATION_PLACEHOLDER })
    await expect(field, `${faction}'s edit kit draws no Location field`).toBeVisible()

    const fit = await field.evaluate((element) => {
      const input = element as HTMLInputElement
      const style = getComputedStyle(input)

      // A span dressed in the field's own type, measured by the engine that
      // paints the placeholder. `canvas.measureText` would drop letter-spacing
      // and text-transform, and these skins use both.
      const ruler = document.createElement('span')
      ruler.textContent = input.placeholder
      const copied = [
        'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize',
        'fontFamily', 'letterSpacing', 'wordSpacing', 'textTransform',
      ] as const
      for (const property of copied) ruler.style[property] = style[property]
      ruler.style.whiteSpace = 'pre'
      ruler.style.position = 'absolute'
      ruler.style.visibility = 'hidden'
      document.body.appendChild(ruler)
      const text = ruler.getBoundingClientRect().width
      ruler.remove()

      // `clientWidth` excludes the border and includes the padding — exactly
      // the box the placeholder is laid into.
      const inner =
        input.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      return { placeholder: input.placeholder, text, inner }
    })

    expect(
      fit.text,
      `${faction}: "${fit.placeholder}" needs ${fit.text.toFixed(1)}px and the field offers ` +
        `${fit.inner.toFixed(1)}px, so it is clipped by ${(fit.text - fit.inner).toFixed(1)}px. ` +
        'The copy is frozen (#2793, #2798), so the field is what moves: raise ' +
        'LOCATION_FIELD_MIN_WIDTH in src/pages/characterPaths/characterFields.ts, or stop ' +
        'capping this field in this archetype (#2990).',
    ).toBeLessThanOrEqual(fit.inner)
  })
}
