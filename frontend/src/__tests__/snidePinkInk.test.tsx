/**
 * Nothing inks LIGHT on S.N.I.D.E.'s zine pink (#1609).
 *
 * Light ink on the pink fill misses AA (see `--faction-snide-on-accent`'s note).
 * `factionContrast.test.ts` measures the token pairing, not whether call sites
 * read it — hence a mount-level negative on light inks. The faction-page join
 * buttons aren't covered (they need a live membership machine).
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

const PINK = '--faction-snide-pink'

/** The pink as a GROUND only: as a border (the seal's frame) it doesn't constrain ink. */
const FILLED_WITH_PINK = new RegExp(`background(?:-color)?:\\s*var\\(${PINK}\\)`)

/** Inks that fail on the fill; the tokens are invisible to the raw-colour rule. */
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
  canVote: true,
}

/**
 * The seal clips the TITLE, picking `(charCodeAt(0) + index) % 3` per word;
 * three words with the same initial hit every residue, so the pink clip appears.
 */
const METATASK = {
  id: 3,
  title: 'spray stencil street',
  metatask_faction_slug: 'snide',
  point_value: 25,
} as unknown as TaskOut

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
        // Only style blocks whose ground is the pink; paper ink is fine elsewhere.
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
