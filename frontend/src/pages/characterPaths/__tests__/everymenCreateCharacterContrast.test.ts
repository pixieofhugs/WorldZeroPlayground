/**
 * The Everymen create plate, measured on the composited `.em-burst` wash rather
 * than the flat tokens `factionContrast.test.ts` owns (#2352).
 *
 * Worst case is the ray plus ONE glow: the two glows peak at opposite corners,
 * so stacking all three measures a ground that doesn't exist. Both corners are
 * measured, since which costs more depends on the ink. Inks on opaque plates sit
 * above the burst and are `factionContrast.test.ts`'s.
 */
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
import { readIndexCss } from '../../../test/indexCss'

const CSS = readIndexCss()
const THEMES = readThemes(CSS)
const BOTH_THEMES: Theme[] = ['light', 'dark']

/** `.em-burst`'s three stops, bottom-up, as token names (pinned below). */
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
  // `--everymen-quiet`, not `--everymen-muted`: muted misses on the wash in
  // light (4.09:1 under the olive). Quiet (#1173) equals muted in dark.
  {
    what: 'counters, @handle, the portrait status, the calling hint and the exits',
    token: '--everymen-quiet',
  },
  // Not `--color-danger`: a faction frame takes its alarm rung (#1302).
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

describe('keeps the burst in step with the stylesheet', () => {
  it('.em-burst names exactly the three stops this file composites', () => {
    // Anchored forward from the rule: CSS prose may name the end marker earlier.
    const start = CSS.indexOf('.em-burst {')
    const block = CSS.slice(start, CSS.indexOf('.em-burst-knockout {', start))
    const named = [...block.matchAll(/var\((--faction-everymen-bill-[a-z-]+)/g)].map((m) => m[1])
    expect(named).toEqual(BURST_STOPS)
  })
})
