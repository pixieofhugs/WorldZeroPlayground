/**
 * Players page (#1855) — what each form factor actually draws.
 *
 * The Constellation, its canvas and its legend are gone; the page is a podium,
 * a faction race and a filterable roster, and desktop and mobile are two
 * components over one data layer (`playersData`, guarded next door).
 *
 * SEAM: the markup each surface emits GIVEN props. The harness is
 * `renderToStaticMarkup` — no DOM, no effects — so `<Leaderboard/>` itself only
 * ever renders its loading branch (asserted below, so the next reader knows why
 * the surfaces are rendered directly rather than through the page).
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { CharacterOut, CurrentUser } from '../../../api/auth'
import { FACTION_RAINBOW_ORDER, REDACTED, factionName } from '../../../utils/factions'

const mocks = vi.hoisted(() => ({
  formFactor: 'desktop' as 'mobile' | 'desktop',
  useTheme: vi.fn(() => ({ theme: 'dark' as 'light' | 'dark', toggle: () => {} })),
}))

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))
// `useTheme` throws outside its provider by design (#701).
vi.mock('../../../hooks/useTheme', () => ({ useTheme: mocks.useTheme }))
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ user: null as CurrentUser | null }),
}))
vi.mock('../../../api/leaderboard', () => ({ getLeaderboard: async () => [] }))

import Leaderboard from '../../Leaderboard'
import DesktopPlayers from '../DesktopPlayers'
import MobilePlayers from '../MobilePlayers'
import {
  NO_RELATIONSHIPS,
  rankPlayers,
  type PlayersViewProps,
} from '../playersData'

function render(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
  return { html, text: html.replace(/<[^>]*>/g, '') }
}

function player(overrides: Partial<CharacterOut>): CharacterOut {
  return {
    id: 1,
    username: 'wren',
    display_name: 'Wren',
    bio: '',
    tagline: '',
    avatar_url: '',
    location: '',
    level: 3,
    score: 100,
    all_time_score: 100,
    faction_slug: 'everymen',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    badges: [],
    invitations: [],
    ...overrides,
  }
}

const NAMED: CharacterOut[] = [
  player({ id: 11, display_name: 'Wren', faction_slug: 'coven', score: 412 }),
  player({ id: 22, display_name: 'Ada', faction_slug: 'ua', score: 388 }),
  player({ id: 33, display_name: 'Nodefour', faction_slug: 'singularity', score: 341 }),
  player({ id: 44, display_name: 'Pip', faction_slug: 'wow', score: 296 }),
]
/** Ten more, so the roster has a full page below the podium and then some. */
const FIELD: CharacterOut[] = [
  ...NAMED,
  ...Array.from({ length: 10 }, (_ignored, index) =>
    player({
      id: 100 + index,
      display_name: `Filler ${index}`,
      faction_slug: 'ephemerists',
      score: 200 - index,
    }),
  ),
]

function props(overrides: Partial<PlayersViewProps> = {}): PlayersViewProps {
  return {
    ranked: rankPlayers(FIELD, 'era'),
    scoreMode: 'era',
    onScoreMode: () => {},
    eyebrow: 'Renaissance · The Standings',
    myCharId: null,
    related: NO_RELATIONSHIPS,
    latest: {},
    ...overrides,
  }
}

describe('the page wrapper', () => {
  it('renders its loading branch with no effects — hence the direct renders below', () => {
    mocks.formFactor = 'desktop'
    const { text } = render(<Leaderboard />)
    expect(text).toContain('Loading')
  })
})

describe('desktop podium', () => {
  it('stands the top three up and starts the roster at rank 4', () => {
    const { text, html } = render(<DesktopPlayers {...props()} />)
    // Every podium name links to the public profile.
    expect(html).toContain('href="/characters/11"')
    expect(html).toContain('href="/characters/22"')
    expect(html).toContain('href="/characters/33"')
    // Rank 4 is in the roster, not on the podium: it is drawn once.
    expect(html.match(/href="\/characters\/44"/g)).toHaveLength(1)
    expect(text).toContain('412')
  })

  it('draws the latest-praxis footer only for a card that has one', () => {
    const withLatest = render(
      <DesktopPlayers
        {...props({
          latest: { 11: { taskTitle: 'Left a jar of soup', submittedAt: '2026-01-01T00:00:00Z' } },
        })}
      />,
    )
    expect(withLatest.text).toContain('Left a jar of soup')
    expect(withLatest.text).toContain('Latest')
    // Missing or failed → the footer simply does not render.
    expect(render(<DesktopPlayers {...props()} />).text).not.toContain('Latest')
  })
})

describe('the faction race', () => {
  it('races eight lanes — the seven plus Albescent, never one for the unaffiliated', () => {
    const { text } = render(<DesktopPlayers {...props()} />)
    for (const slug of FACTION_RAINBOW_ORDER) {
      expect(text, `${slug} has a lane`).toContain(factionName(slug))
    }
    // The eighth lane (#2409). This viewer is unrevealed — the default state of
    // the module flag — so the lane is present and its name is the redaction
    // mark, not the word. Both halves matter: the row exists, and it does not
    // say "Albescent".
    expect(text, 'albescent has a lane').toContain(REDACTED)
    expect(text, 'and it does not name the society').not.toContain('Albescent')
    // UNCHANGED by #2409: `na` is a state, not a faction.
    expect(text, 'no unaffiliated lane').not.toContain(factionName(null))
  })

  it('measures every bar against the leader, who is full width', () => {
    const { html } = render(<DesktopPlayers {...props()} />)
    expect(html).toContain('width:100%')
    // A faction with no members still races, at zero length.
    expect(html).toContain('width:0%')
  })

  it('shows four lanes and an affordance for the rest on the phone', () => {
    // Four of EIGHT since #2409, so the affordance counts four rather than
    // three. The number is asserted rather than derived because deriving it
    // from the lane list would make this case agree with any lane count,
    // including a wrong one.
    const { text } = render(<MobilePlayers {...props()} />)
    expect(text).toContain('4 more factions')
  })
})

describe('the roster', () => {
  it('links every row to its profile and states the filtered count', () => {
    const { html, text } = render(<DesktopPlayers {...props()} />)
    expect(html, 'rank 4 is a link — the design draws none and that is a bug')
      .toContain('href="/characters/44"')
    expect(text, 'count is the roster set, not the field').toContain('11 players')
  })

  it('marks the signed-in player and pins them below a gap row', () => {
    // Rank 13 of 14 — past the first loaded page of 8.
    const mine = rankPlayers(FIELD, 'era')[12].character.id
    const { text } = render(<DesktopPlayers {...props({ myCharId: mine })} />)
    expect(text, 'the you marker').toContain('you')
    expect(text, 'the gap names the ranks it skips').toContain('Ranks 12–12')
  })

  it('draws no gap row for a signed-out reader', () => {
    const { text } = render(<DesktopPlayers {...props()} />)
    expect(text).not.toContain('Ranks ')
  })

  it('draws no gap row when the player is on the loaded page', () => {
    const { text } = render(<DesktopPlayers {...props({ myCharId: 44 })} />)
    expect(text).not.toContain('Ranks ')
    expect(text).toContain('you')
  })

  it('draws no pin at all when the player is on the podium', () => {
    const { text } = render(<DesktopPlayers {...props({ myCharId: 11 })} />)
    expect(text).not.toContain('Ranks ')
  })
})

describe('form factors are structurally different, not a breakpoint', () => {
  it('gives the phone no roster column header and no faction line', () => {
    const desktop = render(<DesktopPlayers {...props()} />)
    const mobile = render(<MobilePlayers {...props()} />)
    expect(desktop.text, 'desktop names its columns').toContain('Lvl')
    expect(mobile.text, 'the phone has no column header').not.toContain('Lvl')
    expect(desktop.text, 'desktop names the row faction').toContain(factionName('ephemerists'))
    expect(mobile.html).toContain('data-testid="mobile-players-directory"')
  })

  it('mounts the shared FilterBar on both, untouched', () => {
    for (const surface of [
      render(<DesktopPlayers {...props()} />),
      render(<MobilePlayers {...props()} />),
    ]) {
      expect(surface.html, 'the shared bar, card and rainbow topper included')
        .toContain('class="filter-bar"')
      expect(surface.html).toContain('filter-bar__spectrum')
    }
  })

  it('hides the Friends / Foes rail from a reader who has no character', () => {
    expect(render(<DesktopPlayers {...props()} />).text).not.toContain('Friends')
    expect(render(<DesktopPlayers {...props({ myCharId: 44 })} />).text).toContain('Friends')
  })
})
