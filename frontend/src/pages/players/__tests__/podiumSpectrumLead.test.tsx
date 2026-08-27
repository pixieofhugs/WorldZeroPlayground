/**
 * The podium's dress for the two SPECTRUM slugs (#2730, ADR-0088 §2).
 *
 * SEAM: one podium card, rendered at four viewers — `na`, an unrevealed
 * Albescent, a revealed Albescent, and an ordinary themed faction. The defect
 * was a single expression (`const known = isKnownFaction(slug)`) read twice per
 * card, so the seam is the RENDERED CARD and not either branch of it.
 *
 * WHY FOUR AND NOT TWO. `na` and Albescent both resolve to CSS key `default`,
 * so a fix that only asked "is this Albescent" would leave `na` grey and a fix
 * that only asked "is the key default" would make the two indistinguishable —
 * which is the half ADR-0088 says part one alone does not deliver. The fourth
 * viewer is the regression half: a themed faction's card is not allowed to move
 * by one byte, and only a card that still names `--faction-everymen` proves it.
 *
 * PROBED BY DIFFERENCE for the middle pair. An unrevealed Albescent card is
 * asserted EQUAL to `na`'s, character for character, with the same id, name and
 * score in both renders — so the only input that differs is the slug, and any
 * mark that leaks the society shows up as an inequality rather than as a
 * missing string somebody has to think to look for.
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

/** The labyrinth's alpha stencil — the one string that names Albescent's mark. */
const LABYRINTH = '/factionMarks/labyrinth.svg'
/** The conic cut, which is what a RING takes (`factionFill`'s shape note). */
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

/** Two runners-up, so the field always has a full podium under the leader. */
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
 * The LEADER CARD alone, sliced out of the page.
 *
 * Both views draw the podium as the page's first anchors and the card holds no
 * nested one, so the leader is everything from the first `<a ` to the second.
 * The page around it cannot be compared: the eighth race lane carries the
 * leader's own points, so an Albescent field and an `na` field differ there by
 * construction and an equality assertion on the whole document would pass for
 * a reason that has nothing to do with this card.
 */
function leadCard(html: string): string {
  const open = html.indexOf('<a ')
  const next = html.indexOf('<a ', open + 1)
  const card = html.slice(open, next)
  // The slice is load-bearing, so it states what it caught rather than trusting
  // two indexOf calls to keep meaning the podium.
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
    // The ring. `--faction-default` is the grey `factionCssVar('na')` resolves
    // to; asserted as the whole declaration so `--faction-default-card-bg`,
    // which legitimately contains it as a prefix, does not pass for it.
    expect(html).not.toContain('solid var(--faction-default)')
    expect(html).toContain(CONIC)
    // The wash, which was skipped entirely for this slug.
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
    // The whole card, not a sampled string: a leak is anything that differs.
    expect(view(ALBESCENT_FACTION_SLUG)).toEqual(view('na'))
    expect(view(ALBESCENT_FACTION_SLUG)).not.toContain(LABYRINTH)
  })
})
