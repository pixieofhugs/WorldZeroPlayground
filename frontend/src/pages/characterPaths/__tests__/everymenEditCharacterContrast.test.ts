/**
 * The Everymen EDIT plate's two extra slots, measured on the ground this
 * archetype lands them on (#2537).
 *
 * WHY A SECOND FILE NEXT TO `everymenCreateCharacterContrast.test.ts`. That file
 * measures the inks the CREATE plate draws on the washed paper, and this
 * archetype is derived from it — so its three rows already cover every ink the
 * two surfaces share. What they do not cover is the two slots a create dress has
 * no room for (`../editCharacterSlots`), because those did not exist when it was
 * written. Their treatment is SHARED and was measured on the `na` page's washed
 * ground only; that file's own `ponytail:` note says an archetype landing them
 * on its own sheet owes this measurement, and this is it.
 *
 * THE GROUND IS THE SHEET, not the app page. `EverymenEditCharacter` keeps the
 * two slots on the paper, below the report bar and behind the union's
 * perforation — so what is behind their type is `--everymen-paper` under
 * `.em-burst`, exactly the composite the create file resolves. The worst case is
 * the ray fan plus ONE corner glow, for the reason argued at length there: the
 * two glows peak at opposite corners, so stacking both is a ground that does not
 * exist.
 *
 * WHAT THE SLOTS PUT ON IT, and why each row is here rather than inherited:
 *
 *   • the ALARM ink — `factionCssVar(slug, 'card-alarm')`, which for this
 *     archetype resolves to the Everymen's own rung. It is the delete control's
 *     whole treatment: a hairline and text, no ground.
 *   • the two GLOBAL NEUTRAL TIERS the shared slot draws with. They are not this
 *     archetype's to repaint — a dress MOUNTS these slots, it does not re-draw
 *     them — so if a row here went red the answer would be to move the slot onto
 *     a ground they clear, not to reach into the shared file. That is the
 *     placement decision this archetype owns, made against numbers.
 *
 * The confirm's FILLED button is not measured: `--color-danger` /
 * `--color-on-danger` is a ground and its own ink, so no page ground reaches it.
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
import { readThemes, resolveVar, type Theme } from '../../../utils/__tests__/cssVars'
import { readIndexCss } from '../../../test/indexCss'

const THEMES = readThemes(readIndexCss())
const BOTH_THEMES: Theme[] = ['light', 'dark']

/** The two corners, each under the ray fan that covers the whole sheet. */
const BURST_CORNERS = [
  ['--faction-everymen-bill-glow-gold', '--faction-everymen-bill-ray'],
  ['--faction-everymen-bill-glow-olive', '--faction-everymen-bill-ray'],
]

function resolve(token: string, theme: Theme): Rgba {
  const raw = resolveVar(token, theme, THEMES)
  expect(raw, `${token} resolves in ${theme}`).not.toBeNull()
  const parsed = parseColor(raw!)
  expect(parsed, `${token} is a colour in ${theme}`).not.toBeNull()
  return parsed!
}

function burstGround(theme: Theme, stops: string[]): Rgba {
  return stops.reduce(
    (ground, token) => compositeOver(resolve(token, theme), ground),
    resolve('--everymen-paper', theme),
  )
}

/** Every ink the two edit-only slots put straight on the paper. */
const SLOT_INKS: Array<{ what: string; token: string }> = [
  {
    what: "the delete control's outline and text, and its confirm panel's rule",
    token: '--faction-everymen-card-alarm',
  },
  {
    what: "the faction row's label and the confirm prompt",
    token: '--color-text-secondary',
  },
  { what: "the faction row's help line", token: '--color-text-tertiary' },
]

describe('the two edit-only slots clear AA on the Everymen paper', () => {
  for (const theme of BOTH_THEMES) {
    for (const { what, token } of SLOT_INKS) {
      it(`${what} — ${theme}`, () => {
        const ink = resolve(token, theme)
        for (const stops of BURST_CORNERS) {
          const ratio = contrastRatio(ink, burstGround(theme, stops))
          expect(
            ratio,
            `${token} on --everymen-paper under ${stops[0]} is ${formatRatio(ratio)}`,
          ).toBeGreaterThanOrEqual(AA_NORMAL)
        }
      })
    }
  }
})
