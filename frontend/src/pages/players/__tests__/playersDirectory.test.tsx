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
  theme: 'dark' as 'light' | 'dark',
}))

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))
// The viz dispatch reads the shared reactive theme cell (#701). Driving the hook
// directly is the dispatch decision itself — there is no DOM here for a real
// `[data-theme]` attribute to cascade through.
vi.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: mocks.theme, toggle: () => {} }),
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
import Meadow, { placeBlooms } from '../Meadow'
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

  // #684 §§6-7: the pin/tether is GONE (it drew a sigil at a radius its rank had
  // not earned); the sky gains the same in-viz "you" ring the meadow has.
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

describe('light-theme meadow (#684)', () => {
  it('links every bloom to its public profile, champion first', () => {
    const { html } = render(
      <Meadow players={ranked(PLAYERS)} maxScore={2140} myCharId={null} {...STAGE} />,
    )
    expect(html).toContain('href="/characters/11"')
    expect(html).toContain('href="/characters/22"')
    expect(html).toContain('href="/characters/33"')
    // Champion first in document order — the field is painted front-to-back.
    expect(html.indexOf('href="/characters/11"')).toBeLessThan(html.indexOf('href="/characters/22"'))
  })

  it('shows the meadow zero state and no golden champion when nothing has bloomed', () => {
    const flat = PLAYERS.map((c) => ({ ...c, score: 0 }))
    const { text, html } = render(
      <Meadow players={ranked(flat)} maxScore={0} myCharId={null} {...STAGE} />,
    )
    expect(text, 'meadow copy, not the sky wording').toContain('The season is young')
    expect(text).not.toContain('The era is young')
    expect(html, 'no golden bloom in the zero state').not.toContain('--meadow-champion-petal')
  })

  it('rings the viewer own bloom only when they are in the field (§7)', () => {
    const inField = render(
      <Meadow players={ranked(PLAYERS)} maxScore={2140} myCharId={22} {...STAGE} />,
    )
    expect(inField.html).toContain('--meadow-you')
    expect(inField.text).toContain('You')

    const outsideField = render(
      <Meadow players={ranked(PLAYERS)} maxScore={2140} myCharId={999} {...STAGE} />,
    )
    expect(outsideField.html, 'outside the top N the field says nothing').not.toContain(
      '--meadow-you',
    )
  })

  // The unaffiliated spectrum is never a single faction hue (ADR-0039): the
  // `na` bloom wears one faction per petal, cycling FACTION_RAINBOW_ORDER.
  it('paints an unaffiliated bloom with the whole spectrum, not one faction', () => {
    const { html } = render(
      <Meadow players={ranked(PLAYERS)} maxScore={2140} myCharId={null} {...STAGE} />,
    )
    // Assert the SPREAD rather than any one member, so the test survives the
    // order changing size (it went 7 → 6 in #783, and gains `coven` in #784).
    const painted = FACTION_RAINBOW_ORDER.filter((slug) =>
      html.includes(`--faction-${slug})`),
    )
    expect(painted).toEqual([...FACTION_RAINBOW_ORDER])
  })

  // Albescent is a secret society (ADR-0027 / #390): it holds no slot in the
  // rainbow order, so the bloom that advertises the spectrum to every viewer
  // must never paint a petal in its colour (#783).
  it('never paints an Albescent petal', () => {
    const { html } = render(
      <Meadow players={ranked(PLAYERS)} maxScore={2140} myCharId={null} {...STAGE} />,
    )
    expect(html).not.toContain('--faction-albescent')
  })
})

// §3's load-bearing invariant. Asserted on the placement function, not the DOM —
// there is no layout engine in this harness to measure.
describe('meadow depth placement (#684 §3)', () => {
  const MANY = Array.from({ length: 12 }, (_, index) =>
    player({ id: 100 + index, display_name: `P${index}`, score: 1200 - index * 90 }),
  )

  it('gives every bloom a unique, strictly increasing depth', () => {
    const blooms = placeBlooms(ranked(MANY), 900, 765, 1200)
    const depths = blooms.map((b) => b.depth)
    expect(new Set(depths).size, 'no two blooms share a depth').toBe(blooms.length)
    for (let index = 1; index < blooms.length; index += 1) {
      expect(depths[index], `rank ${index + 1} stands behind rank ${index}`).toBeGreaterThan(
        depths[index - 1],
      )
      // Farther back = higher on the stage. Strict, so "the frontmost flower is
      // #1" holds for every PAIR, not just for the champion.
      expect(blooms[index].y).toBeLessThan(blooms[index - 1].y)
    }
  })

  it('sizes blooms by score alone — never by depth', () => {
    const blooms = placeBlooms(ranked(MANY), 900, 765, 1200)
    for (let index = 1; index < blooms.length; index += 1) {
      expect(blooms[index].size).toBeLessThan(blooms[index - 1].size)
    }
    // Two equal scores at different depths must be the same size.
    const tied = ranked([
      player({ id: 1, score: 500 }),
      player({ id: 2, score: 500 }),
      player({ id: 3, score: 900 }),
    ])
    const placed = placeBlooms(tied, 900, 765, 900)
    const equalScored = placed.filter((b) => b.entry.points === 500)
    expect(equalScored[0].size).toBe(equalScored[1].size)
    expect(equalScored[0].y).not.toBe(equalScored[1].y)
  })

  it('drops depth ranking entirely in the zero state — uniform, even scatter', () => {
    const flat = MANY.map((c) => ({ ...c, score: 0 }))
    const blooms = placeBlooms(ranked(flat), 900, 765, 0)
    const sizes = new Set(blooms.map((b) => b.size))
    expect(sizes.size, 'every bud is the same size').toBe(1)
    expect(blooms.some((b) => b.champion), 'nobody leads a field nobody has bloomed in').toBe(false)
  })

  it('is deterministic — the same input places identically', () => {
    const first = placeBlooms(ranked(MANY), 900, 765, 1200)
    const second = placeBlooms(ranked(MANY), 900, 765, 1200)
    expect(first.map((b) => [b.x, b.y])).toEqual(second.map((b) => [b.x, b.y]))
  })
})

describe('theme-bound viz dispatch (#684 §1)', () => {
  // Rendered through DesktopLeaderboard, NOT <Leaderboard/>: the page wrapper
  // shows "Loading…" here (no effect resolves the fetch), so a dispatch
  // assertion against it would pass with nothing on screen.
  const board = () => (
    <DesktopLeaderboard characters={PLAYERS} loading={false} error={null} user={null} />
  )

  it('draws the meadow, in meadow words, under the light theme', () => {
    mocks.theme = 'light'
    const { html, text } = render(board())
    expect(html, 'the meadow is really on screen').toContain('sunlit field of players')
    expect(html).not.toContain('night sky of players')
    expect(text, 'the tagline follows the encoding').toContain('nearer the front of the field')
    expect(text).toContain('Bigger bloom')
  })

  it('draws the constellation, in sky words, under the dark theme', () => {
    mocks.theme = 'dark'
    const { html, text } = render(board())
    expect(html).toContain('night sky of players')
    expect(html).not.toContain('sunlit field of players')
    expect(text).toContain('closer to the sun')
    expect(text).toContain('Bigger sigil')
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

  // The legend is the KEY to the encoding, so it has to describe the viz that is
  // actually on screen — the meadow has blooms and no crown (#684).
  it('keys the meadow in meadow words, with no crown', () => {
    const { text } = render(<SkyLegend scoreMode="era" variant="meadow" />)
    expect(text).toContain('Bigger bloom = more era points')
    expect(text).toContain('Golden bloom')
    expect(text).not.toContain('Crown')
    expect(text).not.toContain('sigil')
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
