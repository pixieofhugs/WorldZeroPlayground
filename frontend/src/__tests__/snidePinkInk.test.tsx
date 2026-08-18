/**
 * Nothing inks LIGHT on S.N.I.D.E.'s zine pink (#1609).
 *
 * `--faction-snide-pink` (`#ff2d8b`) is a fill, and the arithmetic is already
 * written down beside the token: `--faction-snide-on-accent: #14110b; /* …
 * white 3.50:1; ink 5.38:1 * /`. Three surfaces filled with that pink and then
 * inked it light anyway — the ransom seal's clip chip and both faction-page
 * join buttons at **3.50:1**, and the mobile Field Desk's PRIMARY action at
 * **3.10:1** through `--faction-snide-paper`. All are below AA.
 *
 * THE TOKEN SUITE COULD NOT CATCH THIS, and that is the whole reason this file
 * exists rather than another row in `factionContrast.test.ts`. That suite's
 * `ACCENT_PAIRS` already measures `--faction-snide-pink` against
 * `--faction-snide-on-accent` and has always passed, because it measures the
 * PAIRING and not whether anything reads it — the "wrong because unreachable"
 * shape #1932 and #1819 both name. A green token suite over a call site that
 * ignores the token is exactly the state this repo keeps rediscovering.
 *
 * The guard is a NEGATIVE on the light inks, in the shape `wowMusterBill`
 * set: it does not pin the dress, only the arithmetic, so the surfaces stay
 * free to be redrawn. `--faction-snide-paper` is checked with its closing
 * paren because `--faction-snide-paper` is a prefix of nothing here but the
 * habit is what makes the assertion honest.
 *
 * The two faction-page join buttons are NOT covered here: `SnideFactionBody`
 * needs a live membership machine to reach either button, which is a fixture
 * this assertion does not need in order to hold. They are guarded by the
 * colour rule instead — both now read the token, and `--faction-snide-paper`
 * appearing on a pink fill there would be a raw-colour-free regression that
 * only review catches. If that pairing ever comes back, widen this file.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import '../i18n'

import SnideSeal from '../components/metataskSeal/skins/SnideSeal'
import SnideFieldDesk from '../pages/fieldDesk/mobileArchetypes/SnideFieldDesk'
import type { FieldDeskHomeState } from '../pages/fieldDesk/useFieldDeskHome'
import type { CharacterOut } from '../api/auth'
import type { TaskOut } from '../api/tasks'

/** The fill whose `-on-accent` line carries the measurement. */
const PINK = '--faction-snide-pink'

/**
 * The pink as a GROUND, which is the only role that constrains the ink.
 *
 * Scoping to the token alone was the first draft and it was wrong: the ransom
 * seal's outer frame takes the pink as a 2px BORDER around a
 * `--faction-snide-card-bg` panel, where `--faction-snide-card-text` is the
 * correct 16.68:1 ink. A guard that reads "the pink appears in this style
 * block" flags that as a failure, which would have taught the next reader to
 * delete the guard rather than believe it.
 */
const FILLED_WITH_PINK = new RegExp(`background(?:-color)?:\\s*var\\(${PINK}\\)`)

/**
 * Every ink that fails on that fill. `#fff` and `#ffffff` are the literal that
 * measured 3.50:1; `--faction-snide-paper` is the token route to 3.10:1, which
 * no raw-colour rule can see because it is a perfectly good token in the wrong
 * place.
 */
const LIGHT_INKS = ['#fff', '#ffffff', 'var(--faction-snide-paper)', 'var(--faction-snide-card-text)']

const CHARACTER: CharacterOut = {
  id: 7,
  username: 'molly',
  display_name: 'Mollusk',
  bio: '',
  tagline: '',
  avatar_url: '',
  location: '',
  level: 4,
  score: 340,
  all_time_score: 900,
  faction_slug: 'snide',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  badges: [],
  invitations: [],
}

const DESK_STATE: FieldDeskHomeState = {
  character: CHARACTER,
  eraName: 'Era 3',
  levelTrack: {
    nextLevel: 5,
    pointsToNext: 160,
    currentThreshold: 300,
    nextThreshold: 500,
    pointsIntoLevel: 40,
    levelSpan: 200,
    fillPercent: 20,
  },
  activeTasks: [],
  pendingRow: null,
  loadingTasks: false,
  offersACharacterChoice: true,
}

/**
 * The seal picks a clip per word with `(word.charCodeAt(0) + index) % 3`, and
 * only index 2 is the pink one — so an arbitrary phrase can miss the fill
 * entirely and leave this guard asserting nothing. THREE CONSECUTIVE WORDS
 * WITH THE SAME INITIAL cover all three residues by construction, because the
 * letter is constant and `index` steps by one. 's' is 115: the three land on
 * 1, 2, 0. If the picker's arithmetic changes, the "fill with the pink" case
 * below fails loudly rather than the guard going quietly vacuous.
 *
 * It is the TITLE that gets clipped into chips, not the conditions.
 */
const METATASK = {
  id: 3,
  title: 'spray stencil street',
  metatask_faction_slug: 'snide',
  point_value: 25,
} as unknown as TaskOut

/**
 * The colour a surface fills with tells you nothing until you know it drew the
 * fill at all — an assertion that "no light ink appears" passes trivially on
 * markup that never reached the pink. Every case below proves the fill first.
 */
function markup(element: React.ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
}

describe('S.N.I.D.E. never inks light on its own zine pink (#1609)', () => {
  const surfaces: Array<[string, () => string]> = [
    ['the ransom seal’s clip chips', () => markup(<SnideSeal metatask={METATASK} />)],
    ['the mobile Field Desk’s primary action', () => markup(<SnideFieldDesk state={DESK_STATE} />)],
  ]

  for (const [what, render] of surfaces) {
    it(`${what} fill with the pink`, () => {
      const filled = [...render().matchAll(/style="([^"]*)"/g)].filter((m) => FILLED_WITH_PINK.test(m[1]))
      expect(filled.length, 'the surface must reach the fill for the guard below to mean anything').toBeGreaterThan(0)
    })

    for (const ink of LIGHT_INKS) {
      it(`${what} never pair it with ${ink}`, () => {
        const html = render()
        // Scope to the declarations that actually FILL with the pink: a
        // surface may legitimately use paper as ink elsewhere on the same page
        // (on the photocopier-ink panel it is 16.68:1), and may take the pink
        // as a border around a dark panel, so the assertion is on the inline
        // style blocks whose GROUND is the pink and nothing else.
        const blocks = [...html.matchAll(/style="([^"]*)"/g)]
          .map((m) => m[1])
          .filter((style) => FILLED_WITH_PINK.test(style))
        expect(blocks.length, 'at least one style block carries the fill').toBeGreaterThan(0)
        for (const block of blocks) {
          expect(block, `${ink} on ${PINK} is below AA — read --faction-snide-on-accent`).not.toContain(ink)
        }
      })
    }
  }
})
