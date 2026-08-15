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
import { FACTION_RAINBOW_ORDER } from '../../../utils/factions'

const mocks = vi.hoisted(() => ({
  formFactor: 'desktop' as 'mobile' | 'desktop',
  useTheme: vi.fn(() => ({ theme: 'dark' as 'light' | 'dark', toggle: () => {} })),
}))

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))
// `useTheme` throws outside its provider by design (#701), so the players tree
// needs it stubbed to render at all. It is a SPY because "one sky in both
// themes" (#1700, ADR-0074) is the claim that nothing here calls it — see the
// dispatch describe below. There is no DOM in this harness for a real
// `[data-theme]` attribute to cascade through either way.
vi.mock('../../../hooks/useTheme', () => ({
  useTheme: mocks.useTheme,
}))
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ user: null as CurrentUser | null }),
}))
vi.mock('../../../api/leaderboard', () => ({
  getLeaderboard: async () => [],
}))

import Leaderboard, { DesktopLeaderboard } from '../../Leaderboard'
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
    bio: '',
    tagline: '',
    avatar_url: '',
    location: '',
    level: 3,
    score: 320,
    all_time_score: 900,
    faction_slug: 'everymen',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    badges: [],
    invitations: [],
    ...overrides,
  }
}

const PLAYERS: CharacterOut[] = [
  player({ id: 11, display_name: 'Perpetua', faction_slug: 'everymen', score: 2140 }),
  player({ id: 22, display_name: 'Reza', faction_slug: 'ephemerists', score: 1880 }),
  player({ id: 33, display_name: 'Molly', faction_slug: 'na', score: 340 }),
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

  // #684 §§6-7: the pin/tether is GONE (it drew a sigil at a radius its rank had
  // not earned); the sky carries an in-viz "you" ring instead.
  it('rings the viewer own orb when in the sky, and never pins them when not', () => {
    const inSky = render(
      <Constellation players={ranked(PLAYERS)} maxScore={2140} myCharId={22} {...STAGE} />,
    )
    expect(inSky.html).toContain('--sky-you')
    expect(inSky.text).toContain('You')

    const outside = render(
      <Constellation players={ranked(PLAYERS)} maxScore={2140} myCharId={999} population={2} {...STAGE} />,
    )
    expect(outside.html, 'no dashed tether survives').not.toContain('stroke-dasharray')
    expect(outside.html, 'no pinned sigil outside the top N').not.toContain('href="/characters/33"')
    expect(outside.html).not.toContain('--sky-you')
  })
})

// #1700 (ADR-0074) reverses #684 §1, which made the visualisation THEME-BOUND —
// a night sky for dark, the Meadow's sunlit field for light. The Meadow is
// retired and the Constellation is the one sky. Asserting "same output in both
// themes" would be vacuous now that nothing here reads the theme, so the claim
// is stated as what it actually is: the board never consults the theme, and the
// sky is really on screen in the sky's own words.
describe('one sky serves both themes (#1700)', () => {
  // Rendered through DesktopLeaderboard, NOT <Leaderboard/>: the page wrapper
  // shows "Loading…" here (no effect resolves the fetch), so an assertion
  // against it would pass with nothing on screen.
  const board = () => (
    <DesktopLeaderboard characters={PLAYERS} loading={false} error={null} user={null} />
  )

  it('draws the constellation, in sky words, without reading the theme', () => {
    mocks.useTheme.mockClear()
    const { html, text } = render(board())
    expect(html, 'the sky is really on screen').toContain('night sky of players')
    expect(html, 'no light-theme sibling survives').not.toContain('sunlit field of players')
    expect(text, 'the tagline names the sky encoding').toContain('closer to the sun')
    expect(text, 'the legend keys the sky').toContain('Bigger sigil')
    expect(mocks.useTheme, 'no theme branch on the players board').not.toHaveBeenCalled()
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

/**
 * #754 — the roster row's faction treatment, asserted as the property a reader
 * would check on screen rather than as a token spelling: an unaffiliated row
 * borrows *no* faction's hue and wears the spectrum, an affiliated row wears
 * exactly its own and no spectrum.
 *
 * This is the boundary #749 broke. That regression made isKnownFaction('na')
 * true, which silently dropped .rainbow-ink from the points numeral and greyed
 * every unaffiliated ornament — caught below by the rainbow-ink assertion.
 */
describe('roster row faction treatment (#754)', () => {
  // Scope assertions to one roster row. Two things would otherwise be measured
  // by mistake: the page header paints a rainbow rule out of all seven faction
  // variables, and every roster player may also be an orb in the sky above, so
  // the same profile link appears twice with different ornament rules.
  function rowHtml(html: string, characterId: number): string {
    const roster = html.indexOf('data-testid="mobile-roster"')
    expect(roster, 'roster section rendered').toBeGreaterThan(-1)
    const link = html.indexOf(`href="/characters/${characterId}"`, roster)
    expect(link, `roster row ${characterId} rendered`).toBeGreaterThan(-1)
    // Back up to the opening `<a`: href renders last, so slicing from it would
    // drop the row's own style attribute (its border-left and isMe wash).
    return html.slice(html.lastIndexOf('<a', link), html.indexOf('</a>', link))
  }

  const factionHuesIn = (markup: string): string[] =>
    FACTION_RAINBOW_ORDER.filter((slug) => markup.includes(`--faction-${slug}`))

  it('gives the unaffiliated row the spectrum and no borrowed faction hue', () => {
    const { html } = render(
      <DefaultPlayers characters={PLAYERS} loading={false} error={null} myCharId={null} />,
    )
    const row = rowHtml(html, 33) // Molly, faction_slug: null

    expect(row, 'points are gradient-clipped').toContain('rainbow-ink')
    expect(factionHuesIn(row), 'wears no single faction hue').toEqual([])
  })

  it('gives an affiliated row its own solid hue and no spectrum', () => {
    const { html } = render(
      <DefaultPlayers characters={PLAYERS} loading={false} error={null} myCharId={null} />,
    )
    const row = rowHtml(html, 11) // Perpetua, faction_slug: 'everymen'

    expect(row, 'a solid hue needs no gradient clip').not.toContain('rainbow-ink')
    expect(factionHuesIn(row), 'wears its own hue, alone').toEqual(['everymen'])
  })

  it('washes your own unaffiliated row neutral rather than in a faction tint', () => {
    const { html } = render(
      <DefaultPlayers characters={PLAYERS} loading={false} error={null} myCharId={33} />,
    )
    const row = rowHtml(html, 33)

    // The wash sits behind body text, where no ink is legible across seven
    // stops (#649) — so it stays flat, but it still must not borrow a hue.
    expect(factionHuesIn(row), 'own-row tint borrows no faction').toEqual([])
    expect(row, 'still the neutral tint, not a bare surface').toContain('--faction-default-light')
  })
})
