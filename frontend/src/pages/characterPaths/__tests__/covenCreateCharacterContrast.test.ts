/**
 * The Coven create-character slip's inks, measured on the ground that is
 * actually behind them (#2351).
 *
 * WHY THIS FILE EXISTS AT ALL, when `utils/__tests__/factionContrast.test.ts`
 * already carries `coven ward panel, ink / brief / caption`. Those rows measure
 * `--faction-coven-ward-card` FLAT, and flat is not what this sheet is. The
 * archetype mounts a `ComposerGround` over the card and lays the content column
 * on top of it with no ground of its own, so every string drawn straight on the
 * sheet lands on **card + bloom**, and in the bottom-right corner on
 * **card + bloom + the cat**. Measuring the declared token here would be the
 * exact failure the issue's acceptance criterion names — the na page's own
 * `-composer-faint` reads 4.49 against the bare token and 3.50 under the wash.
 *
 * WHAT THE NUMBERS CAUGHT, which is the reason the archetype does not simply
 * copy `CovenEditPraxis`'s ground. That file washes its two blooms at a hard
 * `opacity={0.7}`. On `-ward-card` at that strength the pink bloom drags
 * `--faction-coven-slip-label` to 2.80:1 in light and 1.95:1 in dark, and
 * `--faction-coven-slip-ink` to 3.33 / 3.25 — a miss for every tier but nothing.
 * Coven already mints the strength this wash wants: `--faction-coven-ward-haze`,
 * 0.22 by day and 0.28 by night, a NUMBER token precisely so the two cascades
 * can differ without a `dark ? a : b`. The archetype runs the blooms at it, and
 * the rows below are what that buys.
 *
 * THE CAT IS STACKED ON ONE BLOOM AND NOT THE OTHER, deliberately, and this is
 * geometry rather than leniency. The pink bloom is anchored `at 12% 0%` with a
 * 48%-tall extent — the top of the sheet. The cat is pinned bottom-right, 240
 * or 320px tall, on a column that stacks a heading, a credential card, three
 * fields with counters, a portrait row, the calling picker and a footer. The two
 * cannot meet. `CovenCat`'s own header measures itself the same way: against
 * "the two gradient stops the CORNER of the slip actually runs", not against
 * every stop on the sheet. Stacking it on the lavender bloom, which IS anchored
 * `at 100% 100%`, is the honest worst case.
 *
 * `--faction-coven-slip-soft` is absent from the ink list and present in a
 * failing-by-design row below, which is the same shape `createCharacterContrast`
 * uses for the na kit's card tiers: the page does not paint it, and the
 * measurement is what records why rather than a sentence that can drift.
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
const ARCHETYPE_PATH = fileURLToPath(new URL('../archetypes/CovenCreateCharacter.tsx', import.meta.url))
const THEMES = readThemes(readFileSync(CSS_PATH, 'utf8'))
const ARCHETYPE = readFileSync(ARCHETYPE_PATH, 'utf8')
const BOTH_THEMES: Theme[] = ['light', 'dark']

/** The sheet's own stock — ward paper, laid on the wash rather than in it. */
const SHEET = '--faction-coven-ward-card'
/** The watermark's stroke, and the strength every page mount runs it at. */
const CAT_INK = '--faction-coven-slip-deep'
const CAT_ALPHA = 0.09

/**
 * The two blooms the archetype washes over the sheet, and where each is anchored.
 *
 * `cat` records whether the watermark can reach this bloom — see the header.
 */
const BLOOMS: Array<{ what: string; token: string; cat: boolean }> = [
  { what: 'the pink glow at the top-left', token: '--faction-coven-slip-pk', cat: false },
  { what: 'the lavender at the bottom-right', token: '--faction-coven-slip-lav', cat: true },
]

/** Every ink the archetype puts straight on the sheet, and what draws it. */
const SHEET_INKS: Array<{ what: string; token: string }> = [
  {
    what: 'the wordmark, the heading, the name field and an unpicked calling',
    token: '--faction-coven-slip-ink',
  },
  {
    what: 'section labels, counters, @handle, the calling hint and the exits',
    token: '--faction-coven-slip-label',
  },
  // NOT `--color-danger`, which misses on every composer sheet in light. The
  // functional red inside a faction frame takes that faction's card alarm
  // (#1302 / #1449); it draws the error banner, the portrait error and a
  // counter that has hit its cap.
  { what: 'the error banner, the portrait error and a counter at its cap', token: '--faction-coven-card-alarm' },
]

function resolve(token: string, theme: Theme): Rgba {
  const raw = resolveVar(token, theme, THEMES)
  expect(raw, `${token} resolves in ${theme}`).not.toBeNull()
  const parsed = parseColor(raw!)
  expect(parsed, `${token} is a colour in ${theme}`).not.toBeNull()
  return parsed!
}

/** The haze strength, read from the stylesheet rather than transcribed. */
function haze(theme: Theme): number {
  const raw = resolveVar('--faction-coven-ward-haze', theme, THEMES)
  expect(raw, `--faction-coven-ward-haze resolves in ${theme}`).not.toBeNull()
  const value = Number(raw)
  expect(Number.isFinite(value), `--faction-coven-ward-haze is a number in ${theme}`).toBe(true)
  return value
}

/** Sheet stock, one bloom at the haze strength, and optionally the cat over it. */
function ground(theme: Theme, bloom: string, withCat: boolean): Rgba {
  const washed = compositeOver({ ...resolve(bloom, theme), a: haze(theme) }, resolve(SHEET, theme))
  return withCat ? compositeOver({ ...resolve(CAT_INK, theme), a: CAT_ALPHA }, washed) : washed
}

describe('the Coven create-character sheet clears AA on its composited ground', () => {
  for (const theme of BOTH_THEMES) {
    for (const bloom of BLOOMS) {
      for (const ink of SHEET_INKS) {
        it(`${ink.what} over ${bloom.what} — ${theme}`, () => {
          const text = resolve(ink.token, theme)
          const bare = contrastRatio(text, ground(theme, bloom.token, false))
          expect(
            bare,
            `${ink.token} on ${SHEET} under ${bloom.token} is ${formatRatio(bare)}`,
          ).toBeGreaterThanOrEqual(AA_NORMAL)

          if (!bloom.cat) return
          const under = contrastRatio(text, ground(theme, bloom.token, true))
          expect(
            under,
            `${ink.token} with the cat over it is ${formatRatio(under)}`,
          ).toBeGreaterThanOrEqual(AA_NORMAL)
        })
      }
    }
  }
})

describe('the ground the archetype refused, measured', () => {
  // The composer's hard 0.7. Kept as a row rather than a sentence so that a
  // future reader who reaches for `opacity={0.7}` to match `CovenEditPraxis`
  // finds the arithmetic instead of a preference.
  it.each(BOTH_THEMES)('a 0.7 pink wash on the ward card fails the label tier — %s', (theme) => {
    const at = compositeOver(
      { ...resolve('--faction-coven-slip-pk', theme), a: 0.7 },
      resolve(SHEET, theme),
    )
    const ratio = contrastRatio(resolve('--faction-coven-slip-label', theme), at)
    expect(ratio, `slip-label under a 0.7 pink wash is ${formatRatio(ratio)}`).toBeLessThan(AA_NORMAL)
  })

  // `-slip-soft` is the brief's ink on the slip's own gradient and it is NOT an
  // ink on this ground: 4.46:1 under the pink bloom in dark. The page has no
  // brief, so nothing is lost — but the reason is recorded as a number, and if
  // the token is ever walked far enough to clear, this row goes red and the
  // archetype's ink list can be reconsidered.
  it('slip-soft still misses under the pink bloom in dark, so it stays off the sheet', () => {
    const ratio = contrastRatio(
      resolve('--faction-coven-slip-soft', 'dark'),
      ground('dark', '--faction-coven-slip-pk', false),
    )
    expect(ratio, `slip-soft is ${formatRatio(ratio)}`).toBeLessThan(AA_NORMAL)
  })
})

describe('keeps the measured ground in step with the archetype', () => {
  // Transcribed constants rot, and this file transcribes three things: which two
  // pigments the wash uses, that it runs at the haze token, and the cat's alpha.
  // These rows are what make the numbers above mean something.
  //
  // The pink is checked one hop away on purpose. The archetype imports `PINK`
  // from the kit module rather than spelling the token, which is the whole point
  // of `covenSlip` existing — so the honest check reads BOTH files rather than
  // demanding the archetype restate a name it is right not to hold.
  const KIT = readFileSync(
    fileURLToPath(new URL('../../../components/factionMarks/covenSlip.tsx', import.meta.url)),
    'utf8',
  )

  it('washes the pink the kit module defines', () => {
    expect(KIT).toContain('export const PINK = "var(--faction-coven-slip-pk)"')
    expect(ARCHETYPE, 'and reaches for it by that name').toContain('${PINK}')
  })

  it('washes the lavender measured here', () => {
    expect(ARCHETYPE).toContain("const LAV = 'var(--faction-coven-slip-lav)'")
    expect(ARCHETYPE, 'and reaches for it by that name').toContain('${LAV}')
  })

  it('runs both blooms at the haze token, never at a figure', () => {
    expect(ARCHETYPE).toContain("const HAZE = 'var(--faction-coven-ward-haze)'")
    expect(ARCHETYPE).toContain('opacity={HAZE}')
  })

  it('turns the cat at the alpha measured here', () => {
    expect(ARCHETYPE).toContain(`const CAT_OPACITY = ${CAT_ALPHA}`)
  })
})
