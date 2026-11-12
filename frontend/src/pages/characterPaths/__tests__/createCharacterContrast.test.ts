/**
 * Character-form inks measured on the grounds actually behind them (#2346, #2347).
 *
 * Two blocks. The first is the app page's tightest composite: `--color-bg-page`
 * under the `.na-backdrop` wash (mounted only by `DefaultProfileBody`). It bounds
 * `editCharacterSlots`'s undressed defaults (its ponytail points here) and is the
 * repo's only model of that wash. A flat-token reading is optimistic by up to a
 * full ratio point, so the composite is measured.
 *
 * The second block is the `ComposerSheet` ground the na create/edit forms stand
 * on (#2992, #2991). Shared rows on it live in `composerGround.test.ts`; plate
 * pairings live in `factionContrast.test.ts`. Don't restate them here.
 *
 * ponytail: the wash model belongs in `pages/characterProfile/` (another lane,
 * #2996). Upgrade: move `WASH` and the first two describes into a
 * characterProfile contrast file, then rename this one.
 *
 * The lint exemption this block once paired with is gone; the measurement stays.
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
import {
  naWashedSheet,
  readThemes,
  resolveVar,
  type Theme,
} from '../../../utils/__tests__/cssVars'
import { readIndexCss } from '../../../test/indexCss'

const THEMES = readThemes(readIndexCss())
const BOTH_THEMES: Theme[] = ['light', 'dark']

/**
 * `.na-backdrop` wash stops per theme, transcribed from `index.css`. Each is its
 * own radial gradient, so the worst case is one stop alone. Kept in step by the
 * `keeps the wash list in step` describe below.
 */
const WASH: Record<Theme, string[]> = {
  light: [
    'rgba(193,39,45,0.16)',
    'rgba(202,138,4,0.15)',
    'rgba(37,99,235,0.16)',
    'rgba(190,24,93,0.15)',
    'rgba(22,163,74,0.15)',
  ],
  dark: [
    'rgba(239,83,80,0.14)',
    'rgba(230,185,79,0.12)',
    'rgba(96,165,250,0.14)',
    'rgba(244,114,182,0.12)',
    'rgba(74,222,128,0.12)',
  ],
}

/** Inks `editCharacterSlots` draws on an app page when no dress is passed. */
const PAGE_INKS: Array<{ what: string; token: string }> = [
  { what: "the confirm panel's cancel key", token: '--color-text-primary' },
  // Measured, not read off `--label-ink`: that seam is unset at root here.
  { what: 'the faction row label, its ink and the confirm prompt', token: '--color-text-secondary' },
  { what: "the row's chevron and the faction help line", token: '--color-text-tertiary' },
  // Not `--color-danger` (3.42:1 in light); undressed card-alarm is this (#1302).
  { what: "the delete outline's hairline and label", token: '--faction-default-card-alarm' },
]

function resolve(token: string, theme: Theme): Rgba {
  const raw = resolveVar(token, theme, THEMES)
  expect(raw, `${token} resolves in ${theme}`).not.toBeNull()
  const parsed = parseColor(raw!)
  expect(parsed, `${token} is a colour in ${theme}`).not.toBeNull()
  return parsed!
}

/** The page stock with one wash stop over it — the ground type actually lands on. */
function washedGround(theme: Theme, stop: string): Rgba {
  return compositeOver(parseColor(stop)!, resolve('--color-bg-page', theme))
}

describe('the shared edit slots clear AA on the tightest app page, undressed', () => {
  for (const theme of BOTH_THEMES) {
    for (const { what, token } of PAGE_INKS) {
      it(`${what} — ${theme}`, () => {
        const ink = resolve(token, theme)
        for (const stop of WASH[theme]) {
          const ground = washedGround(theme, stop)
          const ratio = contrastRatio(ink, ground)
          expect(
            ratio,
            `${token} on --color-bg-page under ${stop} is ${formatRatio(ratio)}`,
          ).toBeGreaterThanOrEqual(AA_NORMAL)
        }
      })
    }
  }
})

describe('the faction-default TEXT family is not the answer on this ground', () => {
  // Card ALARM clears where `--color-danger` doesn't; card TEXT tiers miss where
  // the neutrals clear. This records why the tier swap is refused; if
  // `-card-muted` ever clears the wash, this goes red and the choice reopens.
  // (`-composer-faint` was lifted in #2485 and now passes, so it left this list.)
  it.each(['--faction-default-card-muted'])(
    '%s still misses AA in light, so the neutral tier stays',
    (token) => {
      const ink = resolve(token, 'light')
      const worst = Math.min(
        ...WASH.light.map((stop) => contrastRatio(ink, washedGround('light', stop))),
      )
      expect(worst, `${token} worst-case is ${formatRatio(worst)}`).toBeLessThan(AA_NORMAL)
    },
  )
})

describe('keeps the wash list in step with the stylesheet', () => {
  // Transcribed constants rot: repaint a stop and this forces a re-measure.
  const css = readIndexCss()

  it.each(BOTH_THEMES)('%s names exactly the stops this file measures', (theme) => {
    const block = theme === 'light'
      ? css.slice(css.indexOf('.na-backdrop'), css.indexOf('[data-theme="dark"] .na-backdrop'))
      : css.slice(css.indexOf('[data-theme="dark"] .na-backdrop'))
    const stops = [...block.matchAll(/rgba\([^)]*\)/g)]
      .map((m) => m[0].replace(/\s+/g, ''))
      .slice(0, WASH[theme].length)
    expect(stops).toEqual(WASH[theme])
  })
})

/**
 * The sheet ground (#2992): `--faction-default-card-bg` under the aurora. Shared
 * rows live in `composerGround.test.ts`. New here: the ALARM ink bare on the
 * sheet (capped counter, `PortraitPicker` error line); `factionContrast.test.ts`
 * only measures it under the danger veil. The aurora is modelled from
 * `index.css`, not transcribed.
 */

const AURORA_SHEET = '--faction-default-card-bg'

/** One ground per aurora stop at its peak; model shared via `naWashedSheet` (#2993). */
const sheetGrounds = (theme: Theme): Rgba[] => naWashedSheet(theme, THEMES)

const worstOn = (ink: Rgba, grounds: Rgba[]): number =>
  Math.min(...grounds.map((ground) => contrastRatio(ink, ground)))

describe('the na create page clears AA on the sheet it moved to (#2992)', () => {
  /**
   * The calling names are `-card-muted` on the opaque `-composer-field`, which
   * clears (~6.05/5.23) though `composerGround.test.ts` refuses the same ink on
   * the washed sheet. Restated from `factionContrast.test.ts` because this page
   * draws it beside its own refusal. The field must stay opaque, else the
   * aurora reaches it and this becomes the optimistic reading.
   */
  it.each(BOTH_THEMES)('the calling names, on the opaque field — %s', (theme) => {
    const field = resolve('--faction-default-composer-field', theme)
    expect(field.a, 'the field grounds the calling rows opaquely').toBe(1)
    const ratio = contrastRatio(resolve('--faction-default-card-muted', theme), field)
    expect(
      ratio,
      `--faction-default-card-muted on --faction-default-composer-field is ${formatRatio(ratio)}`,
    ).toBeGreaterThanOrEqual(AA_NORMAL)
  })

  it.each(BOTH_THEMES)('the alarm ink, bare on the aurora-washed sheet — %s', (theme) => {
    const ratio = worstOn(resolve('--faction-default-card-alarm', theme), sheetGrounds(theme))
    expect(
      ratio,
      `--faction-default-card-alarm on the composite is ${formatRatio(ratio)}`,
    ).toBeGreaterThanOrEqual(AA_NORMAL)
  })

  // The refusal: the neutral functional red a naive fix reaches for still misses.
  it('and the neutral --color-danger still would not — light', () => {
    const ratio = worstOn(resolve('--color-danger', 'light'), sheetGrounds('light'))
    expect(ratio, `--color-danger on the composite is ${formatRatio(ratio)}`).toBeLessThan(AA_NORMAL)
  })

  // Guard: if the composite were the flatterer, the block would prove the wrong thing.
  it.each(BOTH_THEMES)('the wash is the tighter reading, not the flatterer — %s', (theme) => {
    const ink = resolve('--faction-default-card-alarm', theme)
    const flat = contrastRatio(ink, resolve(AURORA_SHEET, theme))
    const washed = worstOn(ink, sheetGrounds(theme))
    expect(washed, `flat ${formatRatio(flat)} vs washed ${formatRatio(washed)}`).toBeLessThan(flat)
  })
})
