/**
 * The UA create-character leaf's inks, measured on the ground that is actually
 * behind them (#2348).
 *
 * WHY THIS FILE EXISTS WHEN `factionContrast.test.ts` ALREADY MEASURES UA. That
 * file's own note rules UA's composer covered because it "draws entirely from
 * `--faction-ua-{card-bg,panel}`" — true of the TOKENS and not of the GROUND.
 * The sheet carries a lotus and an ensō washed over it at
 * `--faction-ua-card-lotus-opacity`, so the stock under a label is
 * `--faction-ua-card-lotus` composited onto `--faction-ua-card-bg`, not the bare
 * token. That is the difference the acceptance criterion names in as many words,
 * and it is the difference #2346 found on the na page, where
 * `--faction-default-composer-faint` reads 4.49 flat and 3.50 under the wash.
 *
 * It is measured here rather than appended to `factionContrast.test.ts` because
 * that file's `ARCHETYPE_PAIRS` is a shared registry asserted BOTH ways — five
 * sibling archetypes are in flight behind #2346 and each restating it drops the
 * others (its own #1179 note records exactly that, twice). This is the same
 * split `createCharacterContrast.test.ts` already made for the na kit.
 *
 * THE WASH IS THE WORST CASE, DELIBERATELY. The lotus is petals with gaps and
 * per-ring opacities and the ensō is a brush stroke; the ground under a given
 * line of type is somewhere between the bare sheet and a fully-inked petal at
 * the layer's opacity. The fully-inked petal is the honest floor, so that is
 * what is composited — no line of type on this page can land on anything darker.
 *
 * WHAT IS NOT MEASURED HERE. The fields' own inks land on `--faction-ua-panel`,
 * which is an opaque token laid OVER the wash, and every one of those pairings is
 * in `factionContrast.test.ts`'s sun-bleached block. Restating them would be a
 * second name for one measurement, which that file warns against. What is here
 * is the set that is new: everything on the washed sheet, the CTA band's pair,
 * and the error banner's ink under the danger veil ON the washed sheet — a
 * tighter reading than the bare-sheet row that file already carries.
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
const THEMES = readThemes(readFileSync(CSS_PATH, 'utf8'))
const BOTH_THEMES: Theme[] = ['light', 'dark']

function resolve(token: string, theme: Theme): Rgba {
  const raw = resolveVar(token, theme, THEMES)
  expect(raw, `${token} resolves in ${theme}`).not.toBeNull()
  const parsed = parseColor(raw!)
  expect(parsed, `${token} is a colour in ${theme}`).not.toBeNull()
  return parsed!
}

/** A token laid over a ground at an alpha the stylesheet names. */
function wash(token: string, alphaToken: string, ground: Rgba, theme: Theme): Rgba {
  const alpha = Number(resolveVar(alphaToken, theme, THEMES))
  expect(alpha, `${alphaToken} is a number in ${theme}`).toBeGreaterThan(0)
  return compositeOver({ ...resolve(token, theme), a: alpha }, ground)
}

/** The sheet under the ornament layer — what a label on this page really sits on. */
function washedSheet(theme: Theme): Rgba {
  return wash(
    '--faction-ua-card-lotus',
    '--faction-ua-card-lotus-opacity',
    resolve('--faction-ua-card-bg', theme),
    theme,
  )
}

/** Every ink this archetype puts straight on that washed sheet, and what draws it. */
const SHEET_INKS: Array<{ what: string; token: string }> = [
  { what: 'the heading and a picker row not picked', token: '--faction-ua-card-text' },
  // `-card-body` and NOT `-card-muted`, which is the one real finding of this
  // file — see the archetype's own note and the failing row below.
  {
    what: 'labels, counters, @handle, the calling hint, cancel and starts-at',
    token: '--faction-ua-card-body',
  },
  { what: 'a counter at its cap', token: '--faction-ua-card-alarm' },
]

describe('the UA leaf clears AA under its own lotus wash', () => {
  for (const theme of BOTH_THEMES) {
    for (const { what, token } of SHEET_INKS) {
      it(`${what} — ${theme}`, () => {
        const ratio = contrastRatio(resolve(token, theme), washedSheet(theme))
        expect(
          ratio,
          `${token} on the washed --faction-ua-card-bg is ${formatRatio(ratio)}`,
        ).toBeGreaterThanOrEqual(AA_NORMAL)
      })
    }
  }

  it.each(BOTH_THEMES)(
    'and `-card-muted` — the composer\'s own quiet tier — does not, in %s',
    (theme) => {
      // THE LOAD-BEARING HALF OF THE INK CHOICE, and the reason this file is not
      // decoration. `UaEditPraxis` sets its labels, counters and exits in
      // `--faction-ua-card-muted` over this same washed ground, and that is what
      // this archetype was first written with. Muted clears on the BARE sheet
      // (5.45 / 5.64, and `factionContrast.test.ts` measures exactly that) and
      // misses on the composite in BOTH themes. Walk muted far enough to clear
      // the wash and this row goes red — which is the outcome worth catching,
      // because then the quiet tier can go back to where the kit puts it.
      const ratio = contrastRatio(resolve('--faction-ua-card-muted', theme), washedSheet(theme))
      expect(
        ratio,
        `--faction-ua-card-muted on the washed sheet is ${formatRatio(ratio)}`,
      ).toBeLessThan(AA_NORMAL)
    },
  )

  it.each(BOTH_THEMES)('the wash is the tighter reading, not the flatterer — %s', (theme) => {
    // The guard that makes the rows above mean something. If the composite were
    // ever LIGHTER than the bare token in light, measuring it would be the
    // optimistic reading rather than the honest one, and this file would be
    // proving the wrong thing.
    const ink = resolve('--faction-ua-card-muted', theme)
    const flat = contrastRatio(ink, resolve('--faction-ua-card-bg', theme))
    const washed = contrastRatio(ink, washedSheet(theme))
    expect(washed, `flat ${formatRatio(flat)} vs washed ${formatRatio(washed)}`).toBeLessThan(flat)
  })
})

describe('the cast band and the picked calling carry the fill pair', () => {
  // The submit band and a selected picker row are both `--faction-ua` filled,
  // and the ink on them is `--faction-ua-on-fill`. The fill is opaque, so the
  // wash does not reach either.
  it.each(BOTH_THEMES)('%s', (theme) => {
    const ratio = contrastRatio(
      resolve('--faction-ua-on-fill', theme),
      resolve('--faction-ua', theme),
    )
    expect(ratio, `on-fill on the fill is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(AA_NORMAL)
  })
})

describe('the error banner clears AA under the veil AND the wash', () => {
  // `ErrorBanner` fills with the neutral `--color-danger-veil` (ADR-0061), and
  // that fill lands on the washed sheet rather than on the bare token — two
  // layers, which is one more than `factionContrast.test.ts`'s row for this
  // banner composites. The alarm ink is what UA passes it (#1231): the neutral
  // `--color-danger` is 3.71:1 on this sheet in light before the wash is counted.
  it.each(BOTH_THEMES)('%s', (theme) => {
    const veiled = compositeOver(resolve('--color-danger-veil', theme), washedSheet(theme))
    const ratio = contrastRatio(resolve('--faction-ua-card-alarm', theme), veiled)
    expect(
      ratio,
      `--faction-ua-card-alarm under the veil on the washed sheet is ${formatRatio(ratio)}`,
    ).toBeGreaterThanOrEqual(AA_NORMAL)
  })

  it.each(BOTH_THEMES)('and the neutral danger ink still would not — %s', (theme) => {
    // The load-bearing half of passing an ink at all. If `--color-danger` ever
    // clears this ground, the override is dead weight and this row says so.
    const veiled = compositeOver(resolve('--color-danger-veil', theme), washedSheet(theme))
    const neutral = contrastRatio(resolve('--color-danger', theme), veiled)
    if (theme === 'light') {
      expect(neutral, `--color-danger is ${formatRatio(neutral)}`).toBeLessThan(AA_NORMAL)
    } else {
      // Dark was never the miss (#1231): the note is recorded, not asserted as a
      // failure, so this half only pins that the dark reading is still the one
      // that would have been fine.
      expect(neutral).toBeGreaterThan(0)
    }
  })
})

describe('keeps the ornament layer in step with the stylesheet', () => {
  // Transcribed grounds rot. The wash above is only the real ground for as long
  // as the archetype still paints `--faction-ua-card-lotus` at
  // `--faction-ua-card-lotus-opacity`; repaint either and the measurement must
  // be re-run rather than silently keep asserting the old stock.
  const source = readFileSync(
    fileURLToPath(new URL('../archetypes/UaCreateCharacter.tsx', import.meta.url)),
    'utf8',
  )

  it('the leaf still washes its ground with the token this file measures', () => {
    expect(source).toContain('var(--faction-ua-card-lotus)')
    expect(source).toContain('var(--faction-ua-card-lotus-opacity)')
  })
})
