/**
 * The shared `::placeholder` ink, measured on the grounds it is quietest over
 * (#2488).
 *
 * THE RULE IS APP-WIDE; THE MEASUREMENT IS HERE because character creation is
 * where the eight field grounds all exist at once. Every other placeholder in
 * the app sits on the neutral page or a card, which is the top of the table
 * below; these eight are the floor, so a rule that clears here clears
 * everywhere. If a ninth plate ever paints a field, add its row.
 *
 * THE ALPHA IS READ OUT OF `index.css`, not restated. The rule declares
 * `color-mix(in srgb, currentColor N%, transparent)` and this file parses N, so
 * lowering the mix by eye turns these rows red rather than leaving them green
 * against a number that used to be true.
 *
 * WHAT `currentColor` MEANS HERE. `::placeholder` inherits from the field, so
 * the mix resolves against each skin's OWN field ink — the one already measured
 * as body text on that skin's field ground. That is what lets one rule serve
 * eight plates without a ninth token; it is also why the alpha is pinned by the
 * two skins with the least headroom rather than by an average.
 *
 * GROUNDS ARE STACKED, NOT DECLARED. Several field grounds are translucent
 * (`--color-bg-surface` is 72% white; the faction panels sit on their sheets),
 * and a flat-token reading of a translucent ground is not a reading at all —
 * `contrastRatio` refuses one. Each row therefore names the stack from the
 * field outwards and it is composited before anything is measured, which is the
 * mistake #2485 was open for.
 *
 * NOT MEASURED, deliberately: the `.na-backdrop` wash. The na EDIT kit's name
 * field is transparent over the washed page, and the wash costs up to a full
 * ratio point (`createCharacterContrast.test.ts` transcribes the stops and owns
 * that measurement). Its two rows below are held to AAA on the flat page token
 * instead, so the wash has a point of room to spend before AA is at risk — a
 * proxy, stated as one, rather than a second copy of a five-gradient shorthand.
 *
 * The na CREATE kit needs no proxy since #2992: it stands on the composer sheet
 * and its fields are an OPAQUE box drawn above the aurora, so the ground is
 * flat and its row takes the plain AA floor.
 */
import { describe, it, expect } from 'vitest'
import {
  AA_NORMAL,
  AAA_NORMAL,
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
 * The one placeholder rule, selector and body, taken from the stylesheet.
 *
 * The selector is captured too because it is load-bearing: Tailwind preflight
 * already paints `input::placeholder, textarea::placeholder` #9ca3af, and a
 * bare `::placeholder` is a whole specificity rung under it. See the rule's own
 * note in `index.css`.
 */
function placeholderRule(): { selector: string; body: string } {
  // Comments go first: the rule's own note says "::placeholder" several times,
  // and scanning them would read the prose as the selector. Indices rather than
  // one big regex — `[^{}]*::placeholder[^{}]*` backtracks for tens of seconds
  // over a stylesheet this size.
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
  /** The archetype, as a reader of #2488 would name it. */
  what: string
  /** The field's ground, then what is behind it, outermost last. */
  ground: string[]
  /** The field's own `color` — what `currentColor` resolves to. */
  ink: string
  /** AAA where a wash is unmeasured below the field; AA otherwise. */
  floor?: number
}

const FIELDS: Row[] = [
  // THE na CREATE KIT MOVED TO THE COMPOSER SHEET (#2992). Its three fields are
  // one opaque box on `--faction-default-composer-field`, laid over the sheet
  // ABOVE the aurora — so this is the ground, flat, with no wash to proxy for,
  // and it takes the plain AA floor like every faction row below it.
  { what: 'na create, all three fields', ground: ['--faction-default-composer-field', '--faction-default-card-bg'], ink: '--faction-default-card-text' },
  // The na EDIT kit still stands on the washed app page, and #2992 did not touch
  // it (#2991 is that lane). Its name field is transparent over the page and its
  // prose fields sit on the translucent surface token, so both take the AAA
  // proxy for the wash this file deliberately does not model. See the header.
  { what: 'na edit, name field on the page', ground: ['--color-bg-page'], ink: '--color-text-primary', floor: AAA_NORMAL },
  { what: 'na edit, prose fields', ground: ['--color-bg-surface', '--color-bg-page'], ink: '--color-text-primary', floor: AAA_NORMAL },
  { what: 'coven', ground: ['--faction-coven-ward-page', '--faction-coven-ward-card'], ink: '--faction-coven-slip-ink' },
  { what: 'ephemerists', ground: ['--faction-ephemerists-plate-inner', '--faction-ephemerists-plate-page'], ink: '--faction-ephemerists-plate-ink' },
  { what: 'everymen', ground: ['--faction-everymen-sheet-panel', '--everymen-paper'], ink: '--everymen-paper-text' },
  { what: 'singularity', ground: ['--faction-singularity-term-panel', '--faction-singularity-term-bg'], ink: '--faction-singularity-term-ink' },
  { what: 'snide', ground: ['--faction-snide-composer-field', '--faction-snide-composer-sheet'], ink: '--faction-snide-composer-ink' },
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
    // The whole of defect 3: no declaration in this sheet meant Tailwind
    // preflight's one fixed grey was in play on every panel in the app.
    const { selector, body } = placeholderRule()
    expect(placeholderAlpha()).toBeGreaterThan(0)
    // NOT cosmetic. Preflight's `input::placeholder` outranks a bare
    // `::placeholder`, so dropping either element name here leaves the rule in
    // the sheet and the grey on the screen.
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
    // A guard on the DIRECTION of the next edit. Coven light is the binding
    // row at 4.76:1; anything below ~78% puts it under AA. If a future skin
    // lifts its own field ink this may loosen — re-measure, do not assume.
    expect(placeholderAlpha()).toBeGreaterThanOrEqual(0.78)
    // And a ceiling: at 100% the placeholder IS the value, which is a second
    // defect (a player cannot tell an empty field from a filled one).
    expect(placeholderAlpha()).toBeLessThan(1)
  })
})
