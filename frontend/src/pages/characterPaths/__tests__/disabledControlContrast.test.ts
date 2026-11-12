/**
 * The disabled primary action is measured, not faded (#2486).
 *
 * `opacity` on the button fades both fill and ink, losing contrast twice; even
 * fading only the fill misses 3:1 on most archetypes (a light slab on dark paper
 * fades toward the ink), and Coven's gradient / `.eph-cta` can't be faded at all.
 * So `.control-off:disabled` swaps in an OPAQUE `--control-off-fill` /
 * `--control-off-ink` pair: one ratio, not one per faction sheet.
 *
 * Only the theme-invariant black sheets override it: `.sg-control-off`
 * (Singularity) and `.snd-control-off` (S.N.I.D.E., #3090). The source guard
 * below stops new sites spelling `opacity: 0.5` again.
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

/** Every archetype, read off the directory so a new one is swept unlisted (#2955). */
const SITES = sourceFiles({ dir: ARCHETYPE_DIR, match: /(?:Create|Edit)Character\.tsx$/ })

const source = (path: string): string => readFileSync(path, 'utf8')

/**
 * `disabled={!x}` is a control gated on form state (disabled when the page
 * opens). Busy states (`disabled={deleting}`) are deliberately not counted: the
 * `marked === gated` equality would fail a file that also dresses its busy
 * control. Busy controls are guarded per surface at render time instead (#2994;
 * `proposeTask/__tests__/submitControlOff.test.tsx`).
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
 * The pair a `.control-off` rule hands the label. Read from the stylesheet so an
 * override that stops declaring a property fails rather than falling back.
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

/** The house pair, and the surfaces that re-point it. */
const PAIRS: Array<{ what: string; selector: string | null }> = [
  { what: 'the house disabled pair', selector: null },
  { what: "the Singularity terminal's own", selector: '.sg-control-off' },
  { what: "S.N.I.D.E.'s photocopier black's own", selector: '.snd-control-off' },
]

describe('a disabled primary action keeps a legible label', () => {
  for (const { what, selector } of PAIRS) {
    for (const theme of BOTH_THEMES) {
      it(`${what} — ${theme}`, () => {
        const { fill, ink } = pairFrom(selector, theme)
        // An alpha fill would put the sheet back under the label.
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
 * A scan that reads nothing passes, so the derived set owes floors (not
 * equalities, so new archetypes need no edit here) (#2955).
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
      // Other `opacity` uses are ornament and out of scope.
      expect(text, 'no opacity keyed on the submit gate').not.toMatch(
        /opacity:\s*(?:!?canSubmit|canSubmit\s*\?)/,
      )
    })

    it(`${name} marks every start-disabled control .control-off`, () => {
      const text = source(file)
      const gated = gatedControls(text)
      // Counted as class lists, not word hits (`control-off sg-control-off` is one).
      const marked = text.match(/className="[^"]*\bcontrol-off\b[^"]*"/g)?.length ?? 0
      // 0 of 0 is fine for a delegating wrapper (Albescent); the set floor is above.
      expect(marked, `${gated} gated control(s) carry the class`).toBe(gated)
    })
  }
})
