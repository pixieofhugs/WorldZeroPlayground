/**
 * The Everymen character-creation plate, measured on the ground the type
 * actually lands on (#2352, epic #2346).
 *
 * WHY THIS FILE EXISTS WHEN `factionContrast.test.ts` ALREADY MEASURES THE
 * FAMILY. That file measures FLAT pairings — `--everymen-paper-text` on
 * `--everymen-paper`, the sheet panel's three inks, the masthead band, the CTA
 * bar. Every one of those is the declared token, and the declared token is not
 * what is behind half the type on this page: the sheet mounts `.em-burst`, a
 * three-layer wash (two corner glows and the ray fan) painted over the paper
 * before a single word is drawn.
 *
 * That gap is exactly the failure the issue's acceptance criterion names, and
 * it is not hypothetical — the chassis agent found
 * `--faction-default-composer-faint` reading 4.49 flat and 3.50 composited on
 * the na page's own wash.
 *
 * THE WORST CASE IS THE RAY PLUS ONE GLOW, not all three. The ray fan is a
 * repeating conic from the sheet's centre, so it is over every point; the two
 * glows are radial gradients peaking at OPPOSITE corners (`at 100% 0` and
 * `at 0 100%`), so no point on the sheet carries both at strength. Stacking all
 * three is a ground that does not exist, and it is not a harmless overestimate:
 * measured that way `--everymen-muted` reads 3.78 light / 4.37 dark and would
 * force a repaint of an ink that is fine on the sheet it is actually on. Same
 * shape of reasoning as `createCharacterContrast.test.ts`, whose five na stops
 * peak at five different corners and are therefore applied one at a time.
 *
 * BOTH corners are measured, not the one that looks worse: the gold is the
 * heavier alpha and the olive is the darker pigment, and which of the two costs
 * more depends on the ink. For `--everymen-muted` in light it is the olive
 * (4.09 against the gold's 4.26); the first failure this file reported was the
 * gold, purely because it is listed first.
 *
 * WHAT IS NOT MEASURED HERE. Anything drawn on an OPAQUE plate — a field, the
 * masthead bar, the submit band, a picked calling — sits above the burst, so
 * its ground is the flat token and `factionContrast.test.ts` already owns it.
 * Restating those would be a second name for one measurement.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import {
  AA_NORMAL,
  compositeOver,
  contrastRatio,
  formatRatio,
  parseColor,
  type Rgba,
} from '../../../utils/contrast'
import { readThemes, resolveVar, type Theme } from '../../../utils/__tests__/cssVars'

const CSS_PATH = fileURLToPath(new URL('../../../index.css', import.meta.url))
const CSS = readFileSync(CSS_PATH, 'utf8')
const THEMES = readThemes(CSS)
const BOTH_THEMES: Theme[] = ['light', 'dark']

/**
 * `.em-burst`'s three stops, bottom-up, as TOKEN NAMES rather than literals.
 *
 * The layer names them through `var()`, so resolving the tokens is reading the
 * stylesheet rather than transcribing it — there is no colour constant here to
 * rot. `keeps the burst in step with the stylesheet` below pins that the rule
 * still names these three and only these three.
 */
const BURST_STOPS = [
  '--faction-everymen-bill-glow-gold',
  '--faction-everymen-bill-glow-olive',
  '--faction-everymen-bill-ray',
]

/** The two corners, each under the ray fan that covers the whole sheet. */
const BURST_CORNERS = [
  ['--faction-everymen-bill-glow-gold', '--faction-everymen-bill-ray'],
  ['--faction-everymen-bill-glow-olive', '--faction-everymen-bill-ray'],
]

function resolve(token: string, theme: Theme): Rgba {
  const raw = resolveVar(token, theme, THEMES)
  expect(raw, `${token} resolves in ${theme}`).not.toBeNull()
  const parsed = parseColor(raw!)
  expect(parsed, `${token} is a colour in ${theme}`).not.toBeNull()
  return parsed!
}

/** The paper under one corner of the burst — the sheet's real ground there. */
function burstGround(theme: Theme, stops: string[]): Rgba {
  return stops.reduce(
    (ground, token) => compositeOver(resolve(token, theme), ground),
    resolve('--everymen-paper', theme),
  )
}

/** Every ink this archetype puts straight on the sheet, and what draws it. */
const SHEET_INKS: Array<{ what: string; token: string }> = [
  { what: 'section labels and the page heading', token: '--everymen-paper-text' },
  // `--everymen-quiet` AND NOT `--everymen-muted`, which is what every other
  // Everymen surface sets for this role and what this archetype started out
  // setting. Measured here, the muted brown misses on the washed paper in
  // light — 4.26:1 under the gold corner, 4.09:1 under the olive — where it
  // reads 5.09:1 flat. That is this issue's acceptance criterion catching a
  // real one, and the near-miss is inherited rather than invented: the same
  // ink sits on the same washed paper in `EverymenEditPraxis`, which is flagged
  // for its own issue rather than repainted from here.
  //
  // No new token: `--everymen-quiet` is #1173's sibling rung, minted for
  // exactly "the muted role, one stock further down", and it clears both
  // corners (4.78 / 4.58). In dark it IS `--everymen-muted`, so nothing moves
  // at night, which is right — the wash lifts a dark ground and the muted
  // already cleared there.
  {
    what: 'counters, @handle, the portrait status, the calling hint and the exits',
    token: '--everymen-quiet',
  },
  // NOT `--color-danger`: #1449's alarm rung is what a functional red inside a
  // faction frame takes (#1302), and it is what `EverymenEditPraxis` sets on
  // this same ground for the same reason.
  { what: 'the error banner and a counter at its cap', token: '--faction-everymen-card-alarm' },
]

describe('the Everymen create plate clears AA under its own ray burst', () => {
  for (const theme of BOTH_THEMES) {
    for (const { what, token } of SHEET_INKS) {
      it(`${what} — ${theme}`, () => {
        const ink = resolve(token, theme)
        for (const stops of BURST_CORNERS) {
          const ratio = contrastRatio(ink, burstGround(theme, stops))
          expect(
            ratio,
            `${token} on --everymen-paper under ${stops[0]} is ${formatRatio(ratio)}`,
          ).toBeGreaterThanOrEqual(AA_NORMAL)
        }
      })
    }
  }
})

describe('the muted brown is why the quiet rung is set instead', () => {
  // The load-bearing half of the swap above: the refusal is recorded as a
  // MEASUREMENT rather than as prose. Walk `--everymen-muted` far enough down
  // to clear the wash and this row goes red — at which point the archetype can
  // go back to the ink the rest of the kit uses, which is the outcome worth
  // catching. Light only: in dark `--everymen-quiet` IS `--everymen-muted`, so
  // there is nothing to choose between.
  it('misses AA on the washed paper in light', () => {
    const ink = resolve('--everymen-muted', 'light')
    const worst = Math.min(
      ...BURST_CORNERS.map((stops) => contrastRatio(ink, burstGround('light', stops))),
    )
    expect(worst, `--everymen-muted worst-case is ${formatRatio(worst)}`).toBeLessThan(AA_NORMAL)
  })
})

describe('keeps the burst in step with the stylesheet', () => {
  // The guard that makes the numbers above mean something: add, remove or
  // repaint a stop in `.em-burst` and this file must be re-run rather than go
  // on measuring a ground that is no longer there.
  it('.em-burst names exactly the three stops this file composites', () => {
    // Anchored FORWARD from the rule, not from the file: the comment above
    // `.em-burst` names `.em-burst-knockout` in prose, so an unanchored search
    // for the end marker lands before the start and slices an empty string —
    // which is a green pass over nothing at all.
    const start = CSS.indexOf('.em-burst {')
    const block = CSS.slice(start, CSS.indexOf('.em-burst-knockout {', start))
    const named = [...block.matchAll(/var\((--faction-everymen-bill-[a-z-]+)/g)].map((m) => m[1])
    expect(named).toEqual(BURST_STOPS)
  })
})
