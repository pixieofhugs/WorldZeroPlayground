/**
 * Players page (#517 mobile directory, #656 desktop constellation) — form-factor
 * dispatch plus the directory/roster → profile navigation contract. Renders
 * <Leaderboard/> with useFormFactor mocked (phone → the Default directory skin,
 * desktop → the constellation + roster board), then renders the Default skin, the
 * Constellation and the RosterTable directly over controlled rows to pin the
 * scannable content + the /characters/:id links a tap follows to the public
 * profile.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { CharacterOut, CurrentUser } from '../../../api/auth'

const mocks = vi.hoisted(() => ({
  formFactor: 'desktop' as 'mobile' | 'desktop',
}))

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ user: null as CurrentUser | null }),
}))
vi.mock('../../../api/leaderboard', () => ({
  getLeaderboard: async () => [],
}))

import Leaderboard from '../../Leaderboard'
import DefaultPlayers from '../mobileArchetypes/DefaultPlayers'
import Constellation, { skyRadius, type RankedPlayer } from '../Constellation'
import SkyCanvas, { DESKTOP_SKY_MAX_WIDTH } from '../SkyCanvas'
import SkyLegend from '../SkyLegend'
import RosterTable from '../RosterTable'

function render(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
  return { html, text: html.replace(/<[^>]*>/g, '') }
}

function player(overrides: Partial<CharacterOut>): CharacterOut {
  return {
    id: 1,
    username: 'wren',
    display_name: 'Wren',
    bio: null,
    avatar_url: null,
    location: null,
    level: 3,
    score: 320,
    all_time_score: 900,
    faction_slug: 'everymen',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const PLAYERS: CharacterOut[] = [
  player({ id: 11, display_name: 'Perpetua', faction_slug: 'everymen', score: 2140 }),
  player({ id: 22, display_name: 'Reza', faction_slug: 'ephemerists', score: 1880 }),
  player({ id: 33, display_name: 'Molly', faction_slug: null, score: 340 }),
]

function ranked(list: CharacterOut[]): RankedPlayer[] {
  return [...list]
    .sort((a, b) => b.score - a.score)
    .map((character, index) => ({ character, rank: index + 1, points: character.score }))
}

describe('players page form-factor dispatch', () => {
  it('renders the Default directory skin on mobile', () => {
    mocks.formFactor = 'mobile'
    const { html } = render(<Leaderboard />)
    expect(html).toContain('data-testid="mobile-players-directory"')
  })

  it('routes to the desktop board (not the mobile directory) on desktop', () => {
    mocks.formFactor = 'desktop'
    const { html } = render(<Leaderboard />)
    expect(html).not.toContain('data-testid="mobile-players-directory"')
  })
})

// The sky is positioned in measured px, so a direct render must be handed a
// stage. SkyCanvas supplies this in the app; these dims stand in for it.
const STAGE = { stageWidth: 900, stageHeight: 765 }

describe('desktop constellation (#656)', () => {
  it('links every star to its public profile, champion first', () => {
    const { html } = render(
      <Constellation players={ranked(PLAYERS)} maxScore={2140} myCharId={null} {...STAGE} />,
    )
    expect(html).toContain('href="/characters/11"')
    expect(html).toContain('href="/characters/22"')
    expect(html).toContain('href="/characters/33"')
  })

  it('shows the zero state and no crown when nobody has climbed', () => {
    const flat = PLAYERS.map((c) => ({ ...c, score: 0 }))
    const { text } = render(
      <Constellation players={ranked(flat)} maxScore={0} myCharId={null} {...STAGE} />,
    )
    expect(text).toContain('The era is young')
  })

  // #730 §2: every orb carries its rank and its points, not just the champion.
  it('carries a rank number and the points on each orb', () => {
    const { text } = render(
      <Constellation players={ranked(PLAYERS)} maxScore={2140} myCharId={null} {...STAGE} />,
    )
    expect(text, 'champion name').toContain('Perpetua')
    expect(text, 'per-orb points').toContain('2140')
    expect(text, 'a lower-ranked orb keeps its points').toContain('340')
  })

  // #730 §1: the radius is the binding half of the cramping bug. A 900x765
  // stage must yield roughly double the old fixed 620x460 stage's 142px.
  it('grows the sky radius with the measured stage', () => {
    expect(skyRadius(620, 460)).toBe(142)
    expect(skyRadius(900, 765)).toBeGreaterThan(280)
  })

  // The unaffiliated spectrum is a class, never a faction colour (ADR-0039).
  it('paints unaffiliated points with the rainbow ink, not a faction hue', () => {
    const { html } = render(
      <Constellation players={ranked(PLAYERS)} maxScore={2140} myCharId={null} {...STAGE} />,
    )
    expect(html).toContain('rainbow-ink')
  })
})

describe('sky legend (#730 §3)', () => {
  it('names all three chips, with the era wording on the size chip', () => {
    const { text } = render(<SkyLegend scoreMode="era" />)
    expect(text).toContain('more era points')
    expect(text).toContain('Crown')
    expect(text).toContain('still at zero')
  })

  it('swaps only the size chip in all-time mode', () => {
    const { text } = render(<SkyLegend scoreMode="alltime" />)
    expect(text).toContain('more all-time points')
    expect(text).toContain('Crown')
  })
})

describe('SkyCanvas measuring wrapper (#730 §1)', () => {
  // Regression: an earlier draft guarded on `width > 0`. With no DOM the effect
  // never runs, so the sky vanished and every assertion above went vacuous.
  it('renders a sky before any measurement has happened', () => {
    const { html } = render(
      <SkyCanvas
        players={ranked(PLAYERS)}
        maxScore={2140}
        myCharId={null}
        population={12}
        maxWidth={DESKTOP_SKY_MAX_WIDTH}
      />,
    )
    expect(html).toContain('href="/characters/11"')
  })
})

describe('desktop roster (#656)', () => {
  it('renders a rank/name/points row per player, ranked from 1', () => {
    const { text, html } = render(<RosterTable players={ranked(PLAYERS)} myCharId={22} />)
    expect(text).toContain('Full Roster')
    expect(text).toContain('Perpetua')
    expect(text).toContain('2140')
    expect(html).toContain('href="/characters/11"')
  })

  it('shows the two real badges from the list serializer', () => {
    const withBadge = ranked([
      player({ id: 44, display_name: 'Nemesis', badges: [{ key: 'sock_puppet', name: 'Sock Puppet' }] }),
    ])
    const { html } = render(<RosterTable players={withBadge} myCharId={null} />)
    expect(html).toContain('Sock Puppet')
  })
})

describe('Default players directory content + navigation', () => {
  it('renders a scannable rank/name/points row per player', () => {
    const { text } = render(
      <DefaultPlayers characters={PLAYERS} loading={false} error={null} myCharId={22} />,
    )
    expect(text).toContain('Perpetua')
    expect(text).toContain('Reza')
    expect(text).toContain('2140')
  })

  it('links every row to its public profile (directory → profile)', () => {
    const { html } = render(
      <DefaultPlayers characters={PLAYERS} loading={false} error={null} myCharId={null} />,
    )
    expect(html).toContain('href="/characters/11"')
    expect(html).toContain('href="/characters/22"')
    expect(html).toContain('href="/characters/33"')
  })

  it('offers a sort chip row + a faction filter chip per present faction', () => {
    const { text } = render(
      <DefaultPlayers characters={PLAYERS} loading={false} error={null} myCharId={null} />,
    )
    const lower = text.toLowerCase()
    expect(lower, 'sort chips').toContain('sort:')
    expect(lower, 'faction chips').toContain('faction:')
    expect(text, 'unaffiliated present').toContain('Unaffiliated')
  })

  it('renders the empty state when no players match', () => {
    const { text } = render(
      <DefaultPlayers characters={[]} loading={false} error={null} myCharId={null} />,
    )
    expect(text).toContain('No players match this filter.')
  })
})
