/**
 * Coven create-character slip inks on the ground actually behind them (#2351).
 *
 * `factionContrast.test.ts` measures `-ward-card` flat; this sheet is card +
 * bloom (+ the cat bottom-right), so the composite is measured here.
 *
 * The blooms run at `--faction-coven-ward-haze`, not `CovenEditPraxis`'s hard
 * 0.7, which fails `-slip-label` and `-slip-ink` in both themes (row below).
 * The cat only meets the lavender bloom (bottom-right); the pink is top-left.
 * `-slip-soft` is unpainted here, recorded by a failing-by-design row.
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
import { readIndexCss } from '../../../test/indexCss'

const ARCHETYPE_PATH = fileURLToPath(new URL('../archetypes/CovenCreateCharacter.tsx', import.meta.url))
const THEMES = readThemes(readIndexCss())
const ARCHETYPE = readFileSync(ARCHETYPE_PATH, 'utf8')
const BOTH_THEMES: Theme[] = ['light', 'dark']

/** The sheet's own stock — ward paper, laid on the wash rather than in it. */
const SHEET = '--faction-coven-ward-card'
/** The watermark's stroke, and the strength every page mount runs it at. */
const CAT_INK = '--faction-coven-slip-deep'
const CAT_ALPHA = 0.09

/** The two blooms; `cat` = whether the watermark can reach it. */
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
  // Not `--color-danger` (misses in light); card alarm per #1302 / #1449.
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
  // Kept as arithmetic so nobody "matches" `CovenEditPraxis`'s opacity={0.7}.
  it.each(BOTH_THEMES)('a 0.7 pink wash on the ward card fails the label tier — %s', (theme) => {
    const at = compositeOver(
      { ...resolve('--faction-coven-slip-pk', theme), a: 0.7 },
      resolve(SHEET, theme),
    )
    const ratio = contrastRatio(resolve('--faction-coven-slip-label', theme), at)
    expect(ratio, `slip-label under a 0.7 pink wash is ${formatRatio(ratio)}`).toBeLessThan(AA_NORMAL)
  })

  // 4.46:1 under the pink bloom in dark; goes red if the token ever clears.
  it('slip-soft still misses under the pink bloom in dark, so it stays off the sheet', () => {
    const ratio = contrastRatio(
      resolve('--faction-coven-slip-soft', 'dark'),
      ground('dark', '--faction-coven-slip-pk', false),
    )
    expect(ratio, `slip-soft is ${formatRatio(ratio)}`).toBeLessThan(AA_NORMAL)
  })
})

describe('keeps the measured ground in step with the archetype', () => {
  // Guards the three transcribed facts: pigments, haze token, cat alpha. The
  // pink is checked via the kit module, which the archetype imports it from.
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
