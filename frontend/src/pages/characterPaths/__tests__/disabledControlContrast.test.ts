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
import { readIndexCss } from '../../../test/indexCss'
import { sourceFiles, toRelative } from '../../../test/sourceScan'

const CSS = readIndexCss()
const THEMES = readThemes(CSS)
const BOTH_THEMES: Theme[] = ['light', 'dark']

const ARCHETYPE_DIR = fileURLToPath(new URL('../archetypes', import.meta.url))

/**
 * Every character-path archetype, READ OFF THE DIRECTORY (#2955).
 *
 * This was a hand-typed array of ten, and its own comment said the consequence
 * out loud: a file that is not listed is not swept. #2537's fan-out landed
 * seven edit archetypes in seven isolated lanes; one of them found this list
 * and added itself, and the other six had no way to know it existed. Eight of
 * the eighteen files here were outside the sweep and nothing went red.
 *
 * So the *shape* of the name is the membership test. A new archetype is swept
 * the moment it lands, with no edit to this file, which is the only version of
 * this guard that does not decay every time the directory grows.
 */
const SITES = sourceFiles({ dir: ARCHETYPE_DIR, match: /(?:Create|Edit)Character\.tsx$/ })

const source = (path: string): string => readFileSync(path, 'utf8')

/**
 * `disabled={!x}` is a control gated on a form's own state — the one that is
 * disabled when the page OPENS. `disabled={deleting}` and friends are transient
 * busy states and are deliberately not swept in here.
 *
 * THE BUSY STATE IS OUT OF SCOPE HERE AND IN SCOPE SOMEWHERE — settled by
 * #2994's audit so the next one does not re-open it. #2486's ruling is about
 * the disabled PAINT, and a busy control is just as disabled and just as
 * illegible when it fades; what is out of scope is this FILE, not the class.
 * Two reasons it stays that way. The `marked === gated` equality below is an
 * equality on purpose — a file that also dressed its busy control would have
 * more class lists than gated sites and would fail for wearing the right
 * thing — and this walk is bound to `characterPaths/archetypes` by directory
 * and filename, so widening the predicate would still reach only this surface.
 *
 * The busy half is therefore asserted per surface, at the rendered control
 * rather than the source text, over a roster read from the manifest:
 * `proposeTask/__tests__/submitControlOff.test.tsx` does it for the nine
 * propose kits, where seven had found `.control-off` privately in #2538 and
 * the Default still faded. A surface that grows a busy CTA owes a guard of
 * that shape; it does not belong in this file.
 */
const gatedControls = (text: string): number => text.match(/disabled=\{!/g)?.length ?? 0

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

/**
 * THE FLOOR, moved off the file and onto the set (#2955).
 *
 * A source scan that reads nothing passes, so a derived list owes a number. Two
 * of them: the walk found every archetype on disk, and the set it found still
 * contains the ones that actually DRAW the control. The second is what the old
 * per-file `gated > 0` was for — an archetype that quietly stopped drawing its
 * gated control still has to be caught, and now a wrapper that never drew one
 * does not have to be exempted by name to say so.
 *
 * Both are floors, never equalities: an archetype added tomorrow is swept
 * without touching this file, which is the entire point.
 */
describe('the sweep reads the whole archetype directory', () => {
  it('walks a set no smaller than the one on disk today', () => {
    expect(SITES.length, 'archetypes found by the walk').toBeGreaterThanOrEqual(18)
  })

  it('still reaches the archetypes that draw a gated control', () => {
    const drawing = SITES.filter(file => gatedControls(source(file)) > 0)
    expect(drawing.length, 'archetypes drawing a start-disabled control').toBeGreaterThanOrEqual(
      16,
    )
  })
})

describe('no character-path control fades itself out of legibility', () => {
  for (const file of SITES) {
    const name = toRelative(file)
    it(`${name} dims through the class, not through opacity`, () => {
      const text = source(file)
      // The exact defect: an `opacity` keyed on the submit gate. Anything else
      // spelling `opacity` here is ornament (Coven's haze, the Ephemerists'
      // rule) and is none of this file's business.
      expect(text, 'no opacity keyed on the submit gate').not.toMatch(
        /opacity:\s*(?:!?canSubmit|canSubmit\s*\?)/,
      )
    })

    it(`${name} marks every start-disabled control .control-off`, () => {
      const text = source(file)
      const gated = gatedControls(text)
      // Counted as CLASS LISTS, not as occurrences of the word: the Singularity
      // band carries `control-off sg-control-off`, which is one marked control
      // and two substring hits, and the prose around these sites names the
      // class too.
      const marked = text.match(/className="[^"]*\bcontrol-off\b[^"]*"/g)?.length ?? 0
      // No per-file floor on `gated`: a delegating wrapper draws no control of
      // its own — the Albescent pair is a classed div around its Default twin —
      // and 0 marked of 0 gated is the right answer for it, not a failure. The
      // floor that catches a file which STOPPED drawing its control lives over
      // the whole swept set instead, above.
      expect(marked, `${gated} gated control(s) carry the class`).toBe(gated)
    })
  }
})
