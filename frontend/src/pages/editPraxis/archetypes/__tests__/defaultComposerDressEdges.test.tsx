/**
 * THE na COMPOSER DRESS'S CONTROL EDGES — WCAG 1.4.11, not 1.4.3 (#2991, #2993).
 *
 * Every other contrast file on these surfaces asks about INK. This one asks
 * about the line around a control, which is a different success criterion with a
 * different floor (3:1, {@link AA_LARGE}) and a different pair of grounds — and
 * it is the criterion the na kit failed the moment #2991 moved it onto a sheet.
 *
 * ## Why the sheet made it fail
 *
 * `--faction-default-composer-field` is `#fffdf9` in light. So is
 * `--faction-default-card-bg`. The well and the stock it is laid on are the
 * SAME COLOUR — 1.00:1, and 1.04:1 in dark — so a field, a picker's button, the
 * faction row's plate, the confirm's cancel key and the propose form's chip,
 * level and preview wells have no fill of their own to be seen by. The hairline
 * is the whole boundary, and `--faction-default-border` at 12% ink reads 1.31:1
 * against the well and 1.30:1 against the worst aurora stop.
 *
 * That is the same shape #3010 fixed on the WOW codicil, arrived at from the
 * other direction: WOW put the shared slot on a sheet whose stock the plate did
 * not clear, and na put its own wells on a sheet whose stock they MATCH.
 *
 * ## THREE SURFACES, ONE EDGE, AND THAT IS THE POINT (#2993)
 *
 * This file used to be `characterPaths/__tests__/defaultEditCharacterEdges` and
 * to measure one archetype, because when #2991 found the defect the fix had to
 * be written in a file its lane owned. The create form kept drawing the 1.31:1
 * hairline for a release with a `ponytail:` naming exactly that. #2993 made the
 * dress one module — `archetypes/defaultComposerDress` — so the edge is
 * declared once and all three archetypes import it; the guard moved beside it
 * and covers all three.
 *
 * ## The claim is on the RENDERED markup, not on the source text
 *
 * The first version asserted `ARCHETYPE.toContain("const EDGE = MUTED")` and
 * counted an identifier's occurrences. That pins FORMATTING: renaming a local,
 * reflowing a style object or moving a declaration one line breaks a green
 * build without changing a pixel, and — worse — it passes for a file that
 * declares the token and never draws it. What is asserted now is what each page
 * actually paints, read off `renderToStaticMarkup` the way
 * `proposeTaskStructure.test.tsx` reads placement.
 *
 * ## The two grounds, and why both
 *
 * An edge has a ground on each side. Inside is the opaque well; outside is the
 * sheet WASHED BY THE AURORA, which is not the bare `-card-bg` token — the drift
 * costs up to a ratio point and a flat reading of it would be the optimistic
 * one. So the outside is modelled, per stop, and the tightest stop is what each
 * row is held to. The model is `naWashedSheet` in `utils/__tests__/cssVars.ts`
 * (#2993 moved it there out of four copies); every value it reads is resolved
 * out of the stylesheet, so re-tuning the wash re-runs the sum.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../../i18n'
import {
  AA_LARGE,
  compositeOver,
  contrastRatio,
  formatRatio,
  parseColor,
  type Rgba,
} from '../../../../utils/contrast'
import {
  naWashedSheet,
  readThemes,
  resolveVar,
  type Theme,
} from '../../../../utils/__tests__/cssVars'
import { readIndexCss } from '../../../../test/indexCss'
import {
  aCharacter,
  aCreateCharacterState,
  anEditCharacterState,
} from '../../../../test/fixtures'
import { proposeTaskState } from '../../../proposeTask/__tests__/proposeTaskState'

const THEMES = readThemes(readIndexCss())
const BOTH_THEMES: Theme[] = ['light', 'dark']

// One responsive tree per surface; the desktop set is the one these plates are
// drawn at, and the edge is a paint rather than a layout, so one width answers.
vi.mock('../../../../hooks/useFormFactor', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../hooks/useFormFactor')>()),
  useFormFactor: () => 'desktop',
}))

const DefaultCreateCharacter = (await import('../../../characterPaths/archetypes/DefaultCreateCharacter')).default
const DefaultEditCharacter = (await import('../../../characterPaths/archetypes/DefaultEditCharacter')).default
const DefaultProposeTask = (await import('../../../proposeTask/archetypes/DefaultProposeTask')).default

/** The sheet's stock, the well laid on it, and the line between them. */
const SHEET = '--faction-default-card-bg'
const WELL = '--faction-default-composer-field'
const EDGE = '--faction-default-card-muted'
/** What the edge used to be, and what this file exists to keep it from being. */
const HAIRLINE = '--faction-default-border'

function resolve(token: string, theme: Theme): Rgba {
  const raw = resolveVar(token, theme, THEMES)
  expect(raw, `${token} resolves in ${theme}`).not.toBeNull()
  const parsed = parseColor(raw!)
  expect(parsed, `${token} is a colour in ${theme}`).not.toBeNull()
  return parsed!
}

/** An edge token laid ON a ground, measured against that same ground. */
const edgeOn = (token: string, ground: Rgba, theme: Theme): number =>
  contrastRatio(compositeOver(resolve(token, theme), ground), ground)

const worstOutside = (token: string, theme: Theme): number =>
  Math.min(...naWashedSheet(theme, THEMES).map((ground) => edgeOn(token, ground, theme)))

/**
 * The three pages the dress paints, rendered.
 *
 * The state fixtures are the shared ones — `aCreateCharacterState`,
 * `anEditCharacterState` and `proposeTaskState` — so a field added to any of the
 * three hooks reaches this file without an edit. The propose form is rendered
 * with a title typed, because its third well (the live preview chit) is only
 * drawn once there is something to preview.
 */
const SURFACES: Array<{ what: string; html: string; plates: number }> = [
  {
    what: 'create character',
    // Three fields, the portrait picker's button, and one calling row: the
    // picker is opened so the row is drawn rather than silently absent.
    plates: 5,
    html: renderToStaticMarkup(
      <MemoryRouter>
        <DefaultCreateCharacter
          state={aCreateCharacterState({ invited: ['coven'], showPicker: true })}
        />
      </MemoryRouter>,
    ),
  },
  {
    what: 'edit character',
    // Four editable fields, the read-only handle box, the portrait button and
    // the faction row.
    plates: 7,
    html: renderToStaticMarkup(
      <MemoryRouter>
        <DefaultEditCharacter state={anEditCharacterState({ character: aCharacter({ username: 'molly' }) })} />
      </MemoryRouter>,
    ),
  },
  {
    what: 'propose a task',
    // Four fields plus the chip well, the level well and the preview chit.
    plates: 7,
    html: renderToStaticMarkup(
      <MemoryRouter>
        <DefaultProposeTask
          state={proposeTaskState({ canProposeMetatask: true, title: 'Bake something' })}
        />
      </MemoryRouter>,
    ),
  },
]

const drawnEdges = (html: string, token: string): number =>
  html.split(`border:1px solid var(${token})`).length - 1

describe('the well has no fill of its own to be seen by', () => {
  // The premise. If the stock and the well ever stop matching, the edge stops
  // being the whole boundary and this file's floor is the wrong question — so
  // the premise is a row rather than a paragraph.
  it.each(BOTH_THEMES)('the well is indistinguishable from the sheet — %s', (theme) => {
    const sheet = resolve(SHEET, theme)
    const ratio = contrastRatio(compositeOver(resolve(WELL, theme), sheet), sheet)
    expect(ratio, `${WELL} on ${SHEET} is ${formatRatio(ratio)}`).toBeLessThan(AA_LARGE)
  })
})

describe.each(SURFACES)('every plate on the na $what sheet has a 1.4.11 edge', ({ html, plates }) => {
  it('draws the measured edge, and draws every plate with it', () => {
    // A floor rather than an equality: a surface that grows a plate inherits the
    // row, and one that LOSES its plates fails here rather than passing by
    // rendering nothing. The count is what makes the negative below mean
    // something — "no hairline" is trivially true of a blank page.
    expect(drawnEdges(html, EDGE), `plates drawn with var(${EDGE})`).toBeGreaterThanOrEqual(plates)
  })

  it('and no plate keeps the 12% hairline', () => {
    expect(
      drawnEdges(html, HAIRLINE),
      `${HAIRLINE} is 1.31:1 against a well the same colour as its sheet`,
    ).toBe(0)
  })
})

describe('the edge clears 3:1 on both sides, in both cascades', () => {
  for (const theme of BOTH_THEMES) {
    it(`clears against the well it encloses — ${theme}`, () => {
      const well = compositeOver(resolve(WELL, theme), resolve(SHEET, theme))
      const ratio = edgeOn(EDGE, well, theme)
      expect(ratio, `${EDGE} on ${WELL} is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(AA_LARGE)
    })

    it(`clears against the aurora-washed sheet outside it — ${theme}`, () => {
      const ratio = worstOutside(EDGE, theme)
      expect(
        ratio,
        `${EDGE} on the worst aurora stop is ${formatRatio(ratio)}`,
      ).toBeGreaterThanOrEqual(AA_LARGE)
    })
  }
})

describe('the hairline it replaced is why this file exists', () => {
  // The refusal, and it is the row that would let the edge quietly go back.
  // `--faction-default-border` is what every one of these controls drew until
  // #2991 (and what the create form drew until #2993), and it misses on BOTH
  // sides in BOTH cascades — so if it is ever walked far enough to clear, this
  // goes red and the archetypes can have their hairline back.
  for (const theme of BOTH_THEMES) {
    it(`\`${HAIRLINE}\` would not clear on either side — ${theme}`, () => {
      const well = compositeOver(resolve(WELL, theme), resolve(SHEET, theme))
      const inside = edgeOn(HAIRLINE, well, theme)
      const outside = worstOutside(HAIRLINE, theme)
      expect(inside, `${HAIRLINE} on the well is ${formatRatio(inside)}`).toBeLessThan(AA_LARGE)
      expect(
        outside,
        `${HAIRLINE} on the washed sheet is ${formatRatio(outside)}`,
      ).toBeLessThan(AA_LARGE)
    })
  }
})
