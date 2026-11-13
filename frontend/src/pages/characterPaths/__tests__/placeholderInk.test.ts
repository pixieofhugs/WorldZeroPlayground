/**
 * The shared `::placeholder` ink, measured on the eight character-form field
 * grounds, the quietest in the app (#2488). Add a row if a new plate paints a field.
 *
 * The alpha N is parsed from `color-mix(in srgb, currentColor N%, transparent)`
 * in `index.css`, and `currentColor` is each skin's own field ink. Grounds are
 * stacked and composited, since several are translucent (#2485).
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
import { readThemes, resolveVar, stripComments, type Theme } from '../../../utils/__tests__/cssVars'
import { readIndexCss } from '../../../test/indexCss'

const CSS_TEXT = readIndexCss()
const THEMES = readThemes(CSS_TEXT)
const BOTH: Theme[] = ['light', 'dark']

/**
 * The one placeholder rule, selector and body. The selector matters: preflight's
 * `input::placeholder` outranks a bare `::placeholder`.
 */
function placeholderRule(): { selector: string; body: string } {
  // Strip comments (prose names the selector). Indices, not a regex: it backtracks badly.
  const css = stripComments(CSS_TEXT)
  const at = css.indexOf('::placeholder')
  if (at < 0) throw new Error('no ::placeholder rule in index.css — that IS the bug #2488 filed')
  const open = css.indexOf('{', at)
  const close = css.indexOf('}', open)
  const start = Math.max(css.lastIndexOf('}', at), css.lastIndexOf('{', at), css.lastIndexOf(';', at))
  return { selector: css.slice(start + 1, open).trim(), body: css.slice(open + 1, close) }
}

/** The declared placeholder alpha, taken from the rule itself. */
function placeholderAlpha(): number {
  const { body } = placeholderRule()
  const mix = /color-mix\(\s*in srgb\s*,\s*currentColor\s+([\d.]+)%\s*,\s*transparent\s*\)/.exec(body)
  if (!mix) throw new Error(`::placeholder no longer mixes currentColor: ${body.trim()}`)
  return Number(mix[1]) / 100
}

interface Row {
  what: string
  /** The field's ground, then what is behind it, outermost last. */
  ground: string[]
  /** The field's own `color` — what `currentColor` resolves to. */
  ink: string
  /** Override for a ground with an unmeasured wash below it; AA otherwise. */
  floor?: number
}

const FIELDS: Row[] = [
  // Both na forms use one opaque composer field above the aurora (#2992, #2991).
  // The read-only `@handle` box is measured in `createCharacterContrast.test.ts`.
  { what: 'na, every editable field on both character forms', ground: ['--faction-default-composer-field', '--faction-default-card-bg'], ink: '--faction-default-card-text' },
  { what: 'coven', ground: ['--faction-coven-ward-page', '--faction-coven-ward-card'], ink: '--faction-coven-slip-ink' },
  { what: 'ephemerists', ground: ['--faction-ephemerists-plate-inner', '--faction-ephemerists-plate-page'], ink: '--faction-ephemerists-plate-ink' },
  { what: 'everymen', ground: ['--faction-everymen-sheet-panel', '--everymen-paper'], ink: '--everymen-paper-text' },
  { what: 'singularity', ground: ['--faction-singularity-term-panel', '--faction-singularity-term-bg'], ink: '--faction-singularity-term-ink' },
  { what: 'snide', ground: ['--faction-snide-composer-field', '--faction-snide-wall'], ink: '--faction-snide-composer-ink' },
  { what: 'ua', ground: ['--faction-ua-panel', '--faction-ua-card-bg'], ink: '--faction-ua-card-text' },
  { what: 'wow', ground: ['--faction-wow-chronicle-panel', '--faction-wow-card-bg'], ink: '--faction-wow-card-text' },
]

function colorOf(token: string, theme: Theme): Rgba {
  const raw = resolveVar(token, theme, THEMES)
  const parsed = raw === null ? null : parseColor(raw)
  if (!parsed) throw new Error(`${token} does not resolve to a solid colour in ${theme}: ${raw}`)
  return parsed
}

/** Composite a ground stack from the outside in, and refuse a see-through one. */
function groundOf(tokens: string[], theme: Theme): Rgba {
  let out: Rgba | null = null
  for (const token of [...tokens].reverse()) {
    const layer = colorOf(token, theme)
    out = out ? compositeOver(layer, out) : layer
  }
  if (!out || out.a !== 1) throw new Error(`${tokens.join(' on ')} is still translucent in ${theme}`)
  return out
}

describe('placeholder text has a chosen colour, on every field ground', () => {
  it('index.css declares one shared rule, at a selector that can reach a field', () => {
    const { selector, body } = placeholderRule()
    expect(placeholderAlpha()).toBeGreaterThan(0)
    expect(selector, 'preflight paints input::placeholder; a bare ::placeholder loses to it')
      .toContain('input::placeholder')
    expect(selector, 'and textarea::placeholder — the about and tagline fields')
      .toContain('textarea::placeholder')
    expect(/opacity:\s*1/.test(body), "Firefox's UA sheet dims ::placeholder to 0.54; the reset is not optional")
      .toBe(true)
  })

  for (const theme of BOTH) {
    it.each(FIELDS.map((row) => [row.what, row] as const))(
      `%s clears its floor in ${theme}`,
      (_what, row) => {
        const ground = groundOf(row.ground, theme)
        const ink = colorOf(row.ink, theme)
        const placeholder = compositeOver({ ...ink, a: ink.a * placeholderAlpha() }, ground)
        const ratio = contrastRatio(placeholder, ground)
        expect(ratio, `${row.what} placeholder in ${theme}: ${formatRatio(ratio)}`)
          .toBeGreaterThanOrEqual(row.floor ?? AA_NORMAL)
      },
    )
  }

  it('the alpha is the one the grounds allow, not a rounder number', () => {
    // Coven light binds at 4.76:1; below ~78% it misses AA.
    expect(placeholderAlpha()).toBeGreaterThanOrEqual(0.78)
    // At 100% an empty field looks filled.
    expect(placeholderAlpha()).toBeLessThan(1)
  })
})
