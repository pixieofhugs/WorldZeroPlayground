/**
 * The DISABLED primary action, measured rather than faded (#2486).
 *
 * WHAT WAS WRONG. Every create/edit archetype dimmed its primary control with
 * `opacity: canSubmit ? 1 : 0.5` on the BUTTON. `opacity` composites the whole
 * element, so the fill fades toward the sheet *and* the label's ink fades over
 * the faded fill — the label loses contrast twice. Measured on the real
 * composited ground rather than the declared tokens, that shipped:
 *
 *     archetype      enabled    with opacity 0.5      fill faded, ink kept
 *     wow             7.64      3.14 / 1.81 (L/D)     11.67 / 2.87
 *     ua              4.59      1.52 / 1.62            2.23 / 2.42
 *     ephemerists     7.59      1.36 / 1.80            1.82 / 2.90
 *     everymen       14.55      1.97 / 4.50            3.42 / 14.70
 *     singularity    11.00      2.02 / 2.00            3.55 / 3.45
 *     na (phone)     16.86      1.98 / 2.22            3.42 / 4.50
 *
 * The 3.14 / 1.81 pair in row one is the reading the issue was filed on; it is
 * the WOW archetype, and it is nowhere near the worst of them.
 *
 * WHY THE FILL IS REPLACED AND NOT FADED. Column four is the ruling's own
 * prescription applied literally — fade the fill, keep the ink opaque — and it
 * still misses 3:1 on four of the six. It cannot be rescued by picking a
 * gentler alpha either: fading a fill toward the sheet moves it toward the
 * ink's own end of the ramp on any surface whose CTA is a light slab on dark
 * paper, so the ratio falls whatever the number is. Two archetypes also cannot
 * be faded at all — Coven's band is a `linear-gradient` and the Ephemerists'
 * is a class (`.eph-cta`), so there is no single colour to mix against.
 *
 * So the disabled control drops the CTA paint entirely and takes a QUIET,
 * OPAQUE stock with a measured ink on it: `--control-off-fill` /
 * `--control-off-ink`, worn by `.control-off:disabled`. Opaque is the load-
 * bearing half — an alpha fill would put the eight faction sheets back under
 * the label and there would be eight ratios again instead of one.
 *
 * ONE SURFACE OVERRIDES THE PAIR, and only one. The Singularity terminal is
 * theme-invariant (`--faction-singularity-term-bg` is #07130c in LIGHT), so the
 * house neutral would land a pale slab on a black chassis — legible, but it
 * would read as the loudest thing on the page, which is the one failure mode
 * the ruling names by hand. It re-points the two properties at its own panel
 * and dim ink through `.sg-control-off`. Every other archetype's sheet flips
 * with the cascade and takes the neutral.
 *
 * THE OTHER HALF OF THE FIX IS THE SOURCE GUARD BELOW. A value in a stylesheet
 * does not stop the eleventh site from spelling `opacity: 0.5` again — #2484's
 * publish control is exactly that site, incoming.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import {
  AA_NORMAL,
  contrastRatio,
  formatRatio,
  parseColor,
  type Rgba,
} from '../../../utils/contrast'
import {
  declarationsIn,
  readThemes,
  resolveVar,
  ruleBodies,
  stripComments,
  type Theme,
} from '../../../utils/__tests__/cssVars'

const CSS_PATH = fileURLToPath(new URL('../../../index.css', import.meta.url))
const CSS = readFileSync(CSS_PATH, 'utf8')
const THEMES = readThemes(CSS)
const BOTH_THEMES: Theme[] = ['light', 'dark']

const ARCHETYPE_DIR = fileURLToPath(new URL('..', import.meta.url))

/** Every file in this tree that draws a control which starts out disabled. */
const SITES = [
  'archetypes/CovenCreateCharacter.tsx',
  'archetypes/DefaultCreateCharacter.tsx',
  'archetypes/EphemeristsCreateCharacter.tsx',
  'archetypes/EverymenCreateCharacter.tsx',
  'archetypes/SingularityCreateCharacter.tsx',
  'archetypes/SnideCreateCharacter.tsx',
  'archetypes/UaCreateCharacter.tsx',
  'archetypes/WowCreateCharacter.tsx',
  'mobileArchetypes/DefaultEditCharacter.tsx',
]

function source(file: string): string {
  return readFileSync(`${ARCHETYPE_DIR}${file}`, 'utf8')
}

function resolve(token: string, theme: Theme): Rgba {
  const raw = resolveVar(token, theme, THEMES)
  expect(raw, `${token} resolves in ${theme}`).not.toBeNull()
  const parsed = parseColor(raw!)
  expect(parsed, `${token} is a colour in ${theme}`).not.toBeNull()
  return parsed!
}

/**
 * The pair a `.control-off` rule hands the label, per theme.
 *
 * `selector` is read out of the stylesheet rather than transcribed: an override
 * that stops declaring one of the two properties has to fail here, not fall
 * back to the neutral unnoticed.
 */
function pairFrom(selector: string | null, theme: Theme): { fill: Rgba; ink: Rgba } {
  if (selector === null) {
    return { fill: resolve('--control-off-fill', theme), ink: resolve('--control-off-ink', theme) }
  }
  const declared = declarationsIn(ruleBodies(stripComments(CSS), selector))
  const read = (property: string): Rgba => {
    const value = declared.get(property)
    expect(value, `${selector} declares ${property}`).toBeDefined()
    const indirect = /^var\(\s*(--[\w-]+)\s*\)$/.exec(value!.trim())
    expect(indirect, `${selector}'s ${property} points at a token`).not.toBeNull()
    return resolve(indirect![1], theme)
  }
  return { fill: read('--control-off-fill'), ink: read('--control-off-ink') }
}

/** The house pair, and the one surface that re-points it. */
const PAIRS: Array<{ what: string; selector: string | null }> = [
  { what: 'the house disabled pair', selector: null },
  { what: "the Singularity terminal's own", selector: '.sg-control-off' },
]

describe('a disabled primary action keeps a legible label', () => {
  for (const { what, selector } of PAIRS) {
    for (const theme of BOTH_THEMES) {
      it(`${what} — ${theme}`, () => {
        const { fill, ink } = pairFrom(selector, theme)
        // The whole point of replacing the fill instead of fading it: the
        // ground under the label is this token and not the sheet behind it.
        // An alpha here means there is no single ratio to measure.
        expect(fill.a, 'the disabled fill is opaque').toBe(1)
        const ratio = contrastRatio(ink, fill)
        expect(
          ratio,
          `the disabled label reads ${formatRatio(ratio)} on its own fill`,
        ).toBeGreaterThanOrEqual(AA_NORMAL)
      })
    }
  }
})

describe('no character-path control fades itself out of legibility', () => {
  for (const file of SITES) {
    it(`${file} dims through the class, not through opacity`, () => {
      const text = source(file)
      // The exact defect: an `opacity` keyed on the submit gate. Anything else
      // spelling `opacity` here is ornament (Coven's haze, the Ephemerists'
      // rule) and is none of this file's business.
      expect(text, 'no opacity keyed on the submit gate').not.toMatch(
        /opacity:\s*(?:!?canSubmit|canSubmit\s*\?)/,
      )
    })

    it(`${file} marks every start-disabled control .control-off`, () => {
      const text = source(file)
      // `disabled={!x}` is a control gated on a form's own state — the one that
      // is disabled when the page OPENS. `disabled={deleting}` and friends are
      // transient busy states and are deliberately not swept in here.
      const gated = text.match(/disabled=\{!/g)?.length ?? 0
      // Counted as CLASS LISTS, not as occurrences of the word: the Singularity
      // band carries `control-off sg-control-off`, which is one marked control
      // and two substring hits, and the prose around these sites names the
      // class too.
      const marked = text.match(/className="[^"]*\bcontrol-off\b[^"]*"/g)?.length ?? 0
      expect(gated, 'the file still draws a gated control').toBeGreaterThan(0)
      expect(marked, `${gated} gated control(s) carry the class`).toBe(gated)
    })
  }
})
