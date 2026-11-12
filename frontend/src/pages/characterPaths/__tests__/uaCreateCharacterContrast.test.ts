/**
 * The UA create leaf's inks, measured on the sheet under its lotus/ensō wash
 * (`--faction-ua-card-lotus` at `-lotus-opacity` over `-card-bg`), not the bare
 * token `factionContrast.test.ts` measures (#2348). Kept out of that file's
 * shared `ARCHETYPE_PAIRS` registry (#1179).
 *
 * A fully-inked petal is the worst case, so that is composited. Field inks sit
 * on the opaque `--faction-ua-panel` above the wash and are measured there.
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

const THEMES = readThemes(readIndexCss())
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
  // `-card-body`, not `-card-muted` (see the failing row below).
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
      // Muted clears flat but misses washed. Red means it can come back.
      const ratio = contrastRatio(resolve('--faction-ua-card-muted', theme), washedSheet(theme))
      expect(
        ratio,
        `--faction-ua-card-muted on the washed sheet is ${formatRatio(ratio)}`,
      ).toBeLessThan(AA_NORMAL)
    },
  )

  it.each(BOTH_THEMES)('the wash is the tighter reading, not the flatterer — %s', (theme) => {
    // Otherwise the composite would be the optimistic reading.
    const ink = resolve('--faction-ua-card-muted', theme)
    const flat = contrastRatio(ink, resolve('--faction-ua-card-bg', theme))
    const washed = contrastRatio(ink, washedSheet(theme))
    expect(washed, `flat ${formatRatio(flat)} vs washed ${formatRatio(washed)}`).toBeLessThan(flat)
  })
})

describe('the cast band and the picked calling carry the fill pair', () => {
  // Opaque fill; the wash does not reach it.
  it.each(BOTH_THEMES)('%s', (theme) => {
    const ratio = contrastRatio(
      resolve('--faction-ua-on-fill', theme),
      resolve('--faction-ua', theme),
    )
    expect(ratio, `on-fill on the fill is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(AA_NORMAL)
  })
})

describe('the error banner clears AA under the veil AND the wash', () => {
  // Neutral veil (ADR-0061) over the wash; UA passes its alarm ink (#1231).
  it.each(BOTH_THEMES)('%s', (theme) => {
    const veiled = compositeOver(resolve('--color-danger-veil', theme), washedSheet(theme))
    const ratio = contrastRatio(resolve('--faction-ua-card-alarm', theme), veiled)
    expect(
      ratio,
      `--faction-ua-card-alarm under the veil on the washed sheet is ${formatRatio(ratio)}`,
    ).toBeGreaterThanOrEqual(AA_NORMAL)
  })

  it.each(BOTH_THEMES)('and the neutral danger ink still would not — %s', (theme) => {
    // If `--color-danger` ever clears, the override is dead weight.
    const veiled = compositeOver(resolve('--color-danger-veil', theme), washedSheet(theme))
    const neutral = contrastRatio(resolve('--color-danger', theme), veiled)
    if (theme === 'light') {
      expect(neutral, `--color-danger is ${formatRatio(neutral)}`).toBeLessThan(AA_NORMAL)
    } else {
      // Dark was never the miss (#1231).
      expect(neutral).toBeGreaterThan(0)
    }
  })
})

describe('keeps the ornament layer in step with the stylesheet', () => {
  const source = readFileSync(
    fileURLToPath(new URL('../archetypes/UaCreateCharacter.tsx', import.meta.url)),
    'utf8',
  )

  it('the leaf still washes its ground with the token this file measures', () => {
    expect(source).toContain('var(--faction-ua-card-lotus)')
    expect(source).toContain('var(--faction-ua-card-lotus-opacity)')
  })
})
