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
 * Rendered contrast sweep (#651): catches a component using the wrong token
 * (e.g. `--everymen-ink` text on `--everymen-paper`, 1.16:1 in dark), which
 * token-value checks (`factionContrast.test.ts`) can't. Thin driver: all
 * judgement lives in `src/utils/contrastSweep.ts`. Nightly (`e2e.yml`).
 *
 * Regenerate the baseline: set `CONTRAST_BASELINE_OUT=<path>`; every measured
 * failure is appended as a ready-to-paste entry. Unmeasurable backdrops are not
 * baseline entries (#1762).
 */

const API = process.env.E2E_API_URL ?? 'http://localhost:8000'
const BASELINE_OUT = process.env.CONTRAST_BASELINE_OUT

// From the catalogue (ADR-0032) so a copy edit can't silently deselect the field.
const LOCATION_PLACEHOLDER = forms.character.locationPlaceholder

// Own dev account per faction, so it can't leave the shared bot in Snide.
test.use({ storageState: { cookies: [], origins: [] } })

// A vote-gated bot drops the vote skins from the sweep silently (#3102);
// `loginAs` checks the era's gate.
const BOT_LEVEL = 1

async function loginAs(page: Page, faction: SweepFaction): Promise<{ characterId: number }> {
  const response = await page.request.post(
    `${API}/auth/dev-login?key=contrast&name=Contrast%20Bot&faction=${faction}&level=${BOT_LEVEL}`,
  )
  expect(response.ok(), `dev-login?faction=${faction} failed — is the backend up on ${API}?`).toBeTruthy()
  const body = await response.json()
  expect(body.faction_slug).toBe(faction)
  const me = await (await page.request.get(`${API}/auth/me`)).json()
  expect(
    me.can_vote,
    `the contrast bot is vote-gated at level ${BOT_LEVEL} (the era asks for ${me.vote_level_required}) — raise BOT_LEVEL, or the vote skins go unswept`,
  ).toBe(true)
  return { characterId: body.character_id }
}

async function useTheme(page: Page, theme: SweepTheme): Promise<void> {
  // Seed before first navigation: index.html reads it before React hydrates.
  await page.addInitScript((value) => {
    window.localStorage.setItem('wz-theme', value as string)
  }, theme)
}

for (const faction of SWEEP_FACTIONS) {
  for (const theme of SWEEP_THEMES) {
    for (const viewport of Object.keys(SWEEP_VIEWPORTS) as SweepViewport[]) {
      // The phone layout needs a touch-first device (#3182): `(pointer: coarse)`.
      test.describe(`${faction} · ${theme} · ${viewport}`, () => {
      test.use({ hasTouch: viewport === 'mobile' })
      test(`${faction} · ${theme} · ${viewport} clears WCAG AA`, async ({ page }) => {
        test.setTimeout(120_000)
        await page.setViewportSize(SWEEP_VIEWPORTS[viewport])
        await useTheme(page, theme)
        await loginAs(page, faction)

        const findings: Finding[] = []
        for (const route of routesFor(faction)) {
          await page.goto(route)
          // The skin waits on /auth/me.
          await page.waitForLoadState('networkidle')
          await expect(page.locator('html')).toHaveAttribute('data-theme', theme)

          findings.push(...((await page.evaluate(scanPageForContrast)) as Finding[]))
        }

        const verdict = assessSweep({ faction, theme, viewport }, findings)

        if (BASELINE_OUT) appendFileSync(BASELINE_OUT, verdict.baselineEntries.join(''))

        // Always print what went unchecked, even when green (#1675).
        for (const report of verdict.reports) console.log(report)

        expect(verdict.failures, verdict.failureMessage).toHaveLength(0)
        expect(verdict.unmeasurableSurfaces, verdict.ceilingMessage).toBeLessThanOrEqual(verdict.ceiling)
        expect(verdict.clearedLayers, verdict.clearedLayerMessage).toBeLessThanOrEqual(verdict.clearedLayerCeiling)
        expect(verdict.stale, verdict.staleMessage).toHaveLength(0)
      })
      })
    }
  }
}

/*
 * Text-fits-its-box rows (#2990). Geometry lives only in the rendered sweep
 * (#2864); `locationFieldFloor.test.ts` checks the floor exists, this checks
 * it is big enough. The placeholder copy is frozen (#2793).
 *
 * Desktop, one theme: the floor is a maxWidth cap that doesn't govern phone
 * width, and theme doesn't change text width.
 */

for (const faction of SWEEP_FACTIONS) {
  test(`${faction} · edit-character Location placeholder fits its field`, async ({ page }) => {
    test.setTimeout(60_000)
    await page.setViewportSize(SWEEP_VIEWPORTS.desktop)
    const { characterId } = await loginAs(page, faction)

    await page.goto(`/characters/${characterId}/edit`)
    await page.waitForLoadState('networkidle')
    // The faction face swaps in after first paint (#2079).
    await page.evaluate(() => document.fonts.ready.then(() => undefined))

    const field = page.getByRole('textbox', { name: LOCATION_PLACEHOLDER })
    await expect(field, `${faction}'s edit kit draws no Location field`).toBeVisible()

    const fit = await field.evaluate((element) => {
      const input = element as HTMLInputElement
      const style = getComputedStyle(input)

      // A span, not canvas.measureText, which drops letter-spacing/text-transform.
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

      // Not clientWidth: this Chromium reports an <input>'s content width there.
      const sides = ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth'] as const
      const inner =
        input.getBoundingClientRect().width - sides.reduce((sum, side) => sum + parseFloat(style[side]), 0)
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
