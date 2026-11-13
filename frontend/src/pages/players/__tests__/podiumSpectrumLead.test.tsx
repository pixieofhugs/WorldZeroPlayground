/**
 * The podium's dress for the two SPECTRUM slugs (#2730, ADR-0088 §2).
 *
 * Four viewers: `na` and Albescent both resolve to CSS key `default`, so they
 * must each get the spectrum yet stay distinguishable once revealed; a themed
 * faction must not move. Unrevealed Albescent is asserted EQUAL to `na` so any
 * leak shows as an inequality.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import '../../../i18n'
import type { CharacterOut } from '../../../api/auth'
import { ALBESCENT_FACTION_SLUG, setAlbescentRevealed } from '../../../utils/factions'

vi.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light' as const, toggle: () => {} }),
}))

import DesktopPlayers from '../DesktopPlayers'
import MobilePlayers from '../MobilePlayers'
import { NO_RELATIONSHIPS, rankPlayers, type PlayersViewProps } from '../playersData'

const LABYRINTH = '/factionMarks/labyrinth.svg'
/** What a RING takes (`factionFill`'s shape note). */
const CONIC = 'var(--faction-default-rainbow-conic)'

function player(overrides: Partial<CharacterOut>): CharacterOut {
  return {
    id: 1,
    username: 'wren',
    display_name: 'Wren',
    bio: '',
    tagline: '',
    avatar_url: '',
    location: '',
    level: 8,
    score: 3886,
    all_time_score: 3886,
    faction_slug: 'na',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    badges: [],
    invitations: [],
    ...overrides,
  }
}

const FIELD: CharacterOut[] = [
  player({ id: 2, username: 'ash', display_name: 'Ash', faction_slug: 'coven', score: 900 }),
  player({ id: 3, username: 'briar', display_name: 'Briar', faction_slug: 'ua', score: 800 }),
]

function props(leader: CharacterOut): PlayersViewProps {
  return {
    ranked: rankPlayers([leader, ...FIELD], 'era'),
    scoreMode: 'era',
    onScoreMode: () => {},
    eyebrow: 'Renaissance · The Standings',
    myCharId: null,
    related: NO_RELATIONSHIPS,
    latest: {},
  }
}

/**
 * The leader card: first `<a ` to the second. Not the whole page, because the
 * Albescent race lane differs from `na`'s by construction.
 */
function leadCard(html: string): string {
  const open = html.indexOf('<a ')
  const next = html.indexOf('<a ', open + 1)
  const card = html.slice(open, next)
  expect(card, 'the slice is the leader card').toContain('Wren')
  return card
}

function render(element: ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
}

const desktop = (slug: string) =>
  leadCard(render(<DesktopPlayers {...props(player({ faction_slug: slug }))} />))
const mobile = (slug: string) =>
  leadCard(render(<MobilePlayers {...props(player({ faction_slug: slug }))} />))

const views: ReadonlyArray<[string, (slug: string) => string]> = [
  ['desktop', desktop],
  ['mobile', mobile],
]

beforeEach(() => setAlbescentRevealed(false))
afterEach(() => setAlbescentRevealed(false))

describe.each(views)('the %s leader card', (_name, view) => {
  it('draws the spectrum, not the flat grey, for an unaffiliated leader', () => {
    const html = view('na')
    // Whole declaration, so `--faction-default-card-bg` doesn't match.
    expect(html).not.toContain('solid var(--faction-default)')
    expect(html).toContain(CONIC)
    expect(html).toContain('spectrum-wash')
  })

  it('leaves a themed leader exactly as it was', () => {
    const html = view('everymen')
    expect(html).toContain('1px solid var(--faction-everymen)')
    expect(html).toContain('color-mix(in oklab, var(--faction-everymen)')
    expect(html).not.toContain('spectrum-wash')
  })

  it('gives an Albescent leader the spectrum too, not the flat grey', () => {
    setAlbescentRevealed(true)
    const html = view(ALBESCENT_FACTION_SLUG)
    expect(html).not.toContain('solid var(--faction-default)')
    expect(html).toContain(CONIC)
    expect(html).toContain('spectrum-wash')
  })

  it('is tellable from an unaffiliated one once the viewer is revealed', () => {
    setAlbescentRevealed(true)
    const revealed = view(ALBESCENT_FACTION_SLUG)
    expect(revealed).not.toEqual(view('na'))
    expect(revealed).toContain(LABYRINTH)
  })

  it('is byte-identical to an unaffiliated one for an unrevealed viewer', () => {
    expect(view(ALBESCENT_FACTION_SLUG)).toEqual(view('na'))
    expect(view(ALBESCENT_FACTION_SLUG)).not.toContain(LABYRINTH)
  })
})
