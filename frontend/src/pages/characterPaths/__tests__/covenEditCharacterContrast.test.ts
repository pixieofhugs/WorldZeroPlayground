/**
 * The Coven edit-character tail, measured on the ground it actually lands on
 * (#2537).
 *
 * THE SEAM: `editCharacterSlots`' two slots take each faction's own alarm via
 * `factionCssVar(slug, 'card-alarm')`, but that slot's `ponytail:` note says in
 * terms where its numbers come from — "the alarm ink is measured on the na
 * page's washed ground only, because that is the only ground an edit archetype
 * draws on today. A faction archetype that lands this slot on its own SHEET must
 * re-measure its `-card-alarm` against that sheet in its own PR." This file is
 * that re-measurement for Coven, and it is a row here rather than an edit to the
 * shared slot, exactly as the note prescribes.
 *
 * ## What the archetype decided, and why the numbers decided it
 *
 * The Coven slip's sheet is `--faction-coven-ward-card` under two blooms at
 * `--faction-coven-ward-haze`, and `covenCreateCharacterContrast.test.ts`
 * already measures every ink the create page puts on it. The two edit-only
 * slots, though, are NOT painted in the slip's ink family: they are the app's
 * own neutral chrome — a `--color-bg-surface-alt` row inside a
 * `--color-border-strong` rule, inked `--color-text-secondary` — designed once
 * so eight archetypes inherit one treatment. An archetype may decide where they
 * sit; it may not repaint them.
 *
 * Landing that chrome on the washed sheet is what the first row below rules out:
 * the faction row's ink reads **4.06:1 in dark** under the pink bloom, a fail on
 * a slot this archetype is forbidden to fix. So the tail sits BELOW the slip, on
 * the app's own `--color-bg-page` — the register those neutrals were measured in
 * — which is also `DefaultEditCharacter`'s desktop placement. The second block
 * is the reading that placement owes: Coven's alarm on that ground.
 *
 * The page ground really is bare `--color-bg-page` here. `.coven-backdrop` is
 * the `backdrop` surface and `useFactionBackdrop` has exactly two callers,
 * `CharacterProfile` and `useFactionDetail` — neither is this route — so there
 * is no wash over the tail to composite in.
 *
 * Nothing here proves a pixel; the treatment is visual QA and the PR says so.
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

const ARCHETYPE_PATH = fileURLToPath(new URL('../archetypes/CovenEditCharacter.tsx', import.meta.url))
const ARCHETYPE = readFileSync(ARCHETYPE_PATH, 'utf8')
const THEMES = readThemes(readIndexCss())
const BOTH_THEMES: Theme[] = ['light', 'dark']

/** The app's own paper — what is behind the tail, and behind nothing else here. */
const PAGE = '--color-bg-page'
/** The slip's stock and the bloom anchored at its top-left, for the refused row. */
const SHEET = '--faction-coven-ward-card'
const PINK = '--faction-coven-slip-pk'

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
  const value = Number(raw)
  expect(Number.isFinite(value), `--faction-coven-ward-haze is a number in ${theme}`).toBe(true)
  return value
}

/** Every ink the two slots put on whatever ground the archetype hands them. */
const SLOT_INKS: Array<{ what: string; token: string }> = [
  // The one ink that is this FACTION's rather than the app's, and the reason
  // this file exists: the delete control's outline and its label, and the border
  // of the confirm panel it opens.
  { what: "the destructive slot's outline and its ink", token: '--faction-coven-card-alarm' },
  { what: 'the faction row label and the confirm prompt', token: '--color-text-secondary' },
  { what: "the faction row's help line and its chevron", token: '--color-text-tertiary' },
]

describe('the Coven tail clears AA on the app page it sits on', () => {
  for (const theme of BOTH_THEMES) {
    for (const ink of SLOT_INKS) {
      it(`${ink.what} — ${theme}`, () => {
        const ratio = contrastRatio(resolve(ink.token, theme), resolve(PAGE, theme))
        expect(
          ratio,
          `${ink.token} on ${PAGE} is ${formatRatio(ratio)}`,
        ).toBeGreaterThanOrEqual(AA_NORMAL)
      })
    }
  }

  it.each(BOTH_THEMES)(
    "the faction row's own ground carries its ink — %s",
    (theme) => {
      // The row is not type straight on the page: it is a `-bg-surface-alt`
      // panel, which is TRANSLUCENT in dark and composites over whatever is
      // behind it. That is the composite, not the declared token.
      const row = compositeOver(resolve('--color-bg-surface-alt', theme), resolve(PAGE, theme))
      const ratio = contrastRatio(resolve('--color-text-secondary', theme), row)
      expect(ratio, `the faction row reads ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(AA_NORMAL)
    },
  )
})

describe('the ground the archetype refused, measured', () => {
  /* Kept as a row rather than a sentence, the same shape
     `covenCreateCharacterContrast.test.ts` uses for the 0.7 wash it refused. A
     future reader who moves the tail onto the slip to make it "look dressed"
     finds the arithmetic instead of a preference — and if the tokens ever walk
     far enough for this to clear, the row goes red and the placement can be
     reconsidered on purpose. */
  it('the faction row on the washed slip misses AA in dark, so the tail stays off the sheet', () => {
    const washed = compositeOver({ ...resolve(PINK, 'dark'), a: haze('dark') }, resolve(SHEET, 'dark'))
    const row = compositeOver(resolve('--color-bg-surface-alt', 'dark'), washed)
    const ratio = contrastRatio(resolve('--color-text-secondary', 'dark'), row)
    expect(ratio, `on the pink-washed sheet the row reads ${formatRatio(ratio)}`).toBeLessThan(AA_NORMAL)
  })
})

describe('keeps the measured placement in step with the archetype', () => {
  // The numbers above are only about the tail because the tail is outside the
  // sheet. That is one ordering fact in one file, and it is the whole premise.
  it('mounts both slots after the sheet and after the form', () => {
    const closesForm = ARCHETYPE.indexOf('</form>')
    const row = ARCHETYPE.indexOf('<FactionRow')
    const del = ARCHETYPE.indexOf('<DeleteCharacter')
    expect(closesForm, 'the archetype draws a real form').toBeGreaterThan(-1)
    expect(row, 'the faction row is mounted below the slip').toBeGreaterThan(closesForm)
    expect(del, 'and the destructive act below it, in that order').toBeGreaterThan(row)
  })

  it('draws them once each — the slots are mounted, not re-drawn per width', () => {
    expect(ARCHETYPE.match(/<FactionRow/g)).toHaveLength(1)
    expect(ARCHETYPE.match(/<DeleteCharacter/g)).toHaveLength(1)
  })
})
