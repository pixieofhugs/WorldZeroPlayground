/**
 * The na composer dress's control edges: WCAG 1.4.11 (3:1, {@link AA_LARGE}),
 * not ink (#2991, #2993). The well matches the sheet (1.00:1 light), so the
 * edge is the whole boundary; the 12% `--faction-default-border` hairline read
 * 1.31:1 (the create form shipped it once under a `ponytail:`). The dress is
 * one module, so this covers all three archetypes.
 *
 * Asserted on rendered markup, not source text. Outside ground is the
 * aurora-washed sheet (`naWashedSheet`), tightest stop.
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

// The edge is paint, not layout, so one width answers.
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
/** The refused edge. */
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

/** The three pages the dress paints. Propose has a title so the preview chit draws. */
const SURFACES: Array<{ what: string; html: string; plates: number }> = [
  {
    what: 'create character',
    // Three fields, the portrait button, one calling row (picker open).
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
    // Four fields, the handle box, the portrait button, the faction row.
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
  // The premise: if well and sheet stop matching, this file asks the wrong question.
  it.each(BOTH_THEMES)('the well is indistinguishable from the sheet — %s', (theme) => {
    const sheet = resolve(SHEET, theme)
    const ratio = contrastRatio(compositeOver(resolve(WELL, theme), sheet), sheet)
    expect(ratio, `${WELL} on ${SHEET} is ${formatRatio(ratio)}`).toBeLessThan(AA_LARGE)
  })
})

describe.each(SURFACES)('every plate on the na $what sheet has a 1.4.11 edge', ({ html, plates }) => {
  it('draws the measured edge, and draws every plate with it', () => {
    // A floor, so the "no hairline" check below isn't trivially true of a blank page.
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

