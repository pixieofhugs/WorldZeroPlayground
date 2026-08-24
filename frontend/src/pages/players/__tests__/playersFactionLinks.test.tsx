/**
 * Faction names on the Players page open their faction page (#1953).
 *
 * SEAM: the ANCHORS each surface emits given props — which faction name is an
 * `<a href>`, what that href is, and which faction names deliberately are not
 * links at all. Not the click, not the route: `renderToStaticMarkup` has no DOM
 * and runs no effects, so what a test can hold is the markup, and the markup is
 * where both bugs this file guards actually live.
 *
 * WHY IT IS ITS OWN FILE next to `playersDirectory.test.tsx`, which already
 * renders both surfaces. That file asserts what the page SAYS; this one asserts
 * where it GOES, and one of the two cases here needs a module-level flag set
 * (`setAlbescentRevealed`) that would leak into every unrelated assertion in a
 * shared file. The mask outlives the case that set it — a leaked `true` makes a
 * later assertion pass for the wrong reason — so it is reset in `beforeEach`
 * here and never touched next door.
 *
 * THE ONE THAT MATTERS is the last describe. `factionName()` masks Albescent to
 * "Unaffiliated" for a viewer who has never been revealed to it (#1926), and an
 * `href="/factions/albescent"` under that masked word defeats the mask twice
 * over: the slug is in the page source in plain text, and following it lands on
 * `AlbescentSecretPlaceholder`, which tells the reader that the row they just
 * clicked is a sealed door. Neither is something the word "Unaffiliated" was
 * supposed to be able to say.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import '../../../i18n'
import type { CharacterOut } from '../../../api/auth'
import {
  ALBESCENT_FACTION_SLUG,
  FACTION_RAINBOW_ORDER,
  factionName,
  setAlbescentRevealed,
} from '../../../utils/factions'

vi.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light' as const, toggle: () => {} }),
}))

import DesktopPlayers from '../DesktopPlayers'
import MobilePlayers from '../MobilePlayers'
import {
  NO_RELATIONSHIPS,
  PODIUM_SIZE,
  factionHref,
  rankPlayers,
  type PlayersViewProps,
} from '../playersData'

function render(element: ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
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

/**
 * Three podium-fillers so the interesting rows land in the ROSTER — the roster
 * is the only section that prints a player's own faction, and `selectRoster`
 * drops the top three at rest.
 */
const FILLER: CharacterOut[] = [
  player({ id: 1, display_name: 'Filler A', faction_slug: 'coven', score: 900 }),
  player({ id: 2, display_name: 'Filler B', faction_slug: 'ua', score: 800 }),
  player({ id: 3, display_name: 'Filler C', faction_slug: 'singularity', score: 700 }),
]

function props(field: CharacterOut[]): PlayersViewProps {
  return {
    ranked: rankPlayers([...FILLER, ...field], 'era'),
    scoreMode: 'era',
    onScoreMode: () => {},
    eyebrow: 'Renaissance · The Standings',
    myCharId: null,
    related: NO_RELATIONSHIPS,
    latest: {},
  }
}

/** Every `href` in the markup, in document order. */
function hrefs(html: string): string[] {
  return [...html.matchAll(/href="([^"]*)"/g)].map((match) => match[1])
}

// The flag is module-level and mutable by design (#1891), so it outlives any
// case that sets it. Reset on both edges: `beforeEach` protects this file's own
// cases from each other, `afterEach` protects whatever runs next in the worker.
beforeEach(() => setAlbescentRevealed(false))
afterEach(() => setAlbescentRevealed(false))

describe('the faction race', () => {
  for (const [surface, view] of [
    ['desktop', DesktopPlayers],
    ['mobile', MobilePlayers],
  ] as const) {
    it(`${surface}: every lane's name opens that faction's page`, () => {
      const Surface = view
      // Mobile shows four lanes at rest; the one asserted is the leader, whose
      // lane is drawn on both surfaces without any state change.
      const html = render(<Surface {...props([player({ id: 9, faction_slug: 'wow', score: 5000 })])} />)
      const linked = hrefs(html)
      expect(linked).toContain('/factions/wow')
      // The href is on the NAME, not on a sigil or a bar wrapped around it.
      expect(html).toContain(`/factions/wow"`)
      expect(html).toContain(factionName('wow'))
    })
  }

  it('desktop draws one lane link per faction and no more', () => {
    const html = render(<DesktopPlayers {...props([])} />)
    for (const slug of FACTION_RAINBOW_ORDER) {
      expect(hrefs(html).filter((href) => href === `/factions/${slug}`), slug).toHaveLength(1)
    }
    // `factionStandings` keys off FACTION_RAINBOW_ORDER, so neither of the two
    // slugs that must never be linked can reach a lane in the first place.
    expect(hrefs(html)).not.toContain('/factions/na')
    expect(hrefs(html)).not.toContain(`/factions/${ALBESCENT_FACTION_SLUG}`)
  })
})

/**
 * #2245 MOVED THIS LINK. The faction used to be a WORD under the player's name;
 * the owner ruled it a column of its own carrying "a larger more clickable
 * sigil, size similar with the level diamond", linked to the faction page. The
 * seam is the same one — which element is an `<a href>` — but three things move
 * with it, and each is a way to get this wrong:
 *
 *   - the word goes, so the link's accessible name has to become EXPLICIT. Every
 *     faction mark is `aria-hidden` (each sigil says so in its own file), so a
 *     bare anchor around one names nothing at all. That reverses ruling 2 of
 *     #2245 for this one mount, on the issue's own reasoning: an unlabelled link
 *     is a worse trade than the duplication being removed.
 *   - the badge welded to the profile picture goes with it — the ruling is a
 *     column "as opposed to putting it on top of their profile pic".
 *   - `factionHref` can still withhold a link, and then the mark must not be a
 *     focusable control that goes nowhere.
 */
describe('a roster row', () => {
  const roster = (slug: string) =>
    render(<DesktopPlayers {...props([player({ id: 77, faction_slug: slug, score: 10 })])} />)

  it("links the faction sigil in the row's own column to that faction", () => {
    const html = roster('snide')
    expect(hrefs(html)).toContain('/factions/snide')
    // And the row still goes to the player: the two live in one row without
    // nesting, which is what the stretched overlay buys (#1893).
    expect(hrefs(html)).toContain('/characters/77')
  })

  it('names that link, because the word it replaced is gone', () => {
    expect(roster('snide')).toContain(`aria-label="${factionName('snide')}"`)
  })

  it('prints the faction word once on the page — the race lane, not the row', () => {
    // Two before #2245: the lane and the row. The lane is exempt (ADR-0082 §2 —
    // that surface is ABOUT the society); the row was the duplicate.
    const text = roster('snide').replace(/<[^>]*>/g, '')
    expect(text.split(factionName('snide')).length - 1).toBe(1)
  })

  it('takes the membership badge off the roster avatar, leaving it to the podium', () => {
    // `right:-3px;bottom:-3px` is the clip BOTH avatar roots share — the na ring
    // in `DefaultAvatar`, the eight registered skins in `BadgedAvatar` — so this
    // counts badged discs without naming a skin. The only ones left on the page
    // are the podium's, where the mark is not duplicated by a column.
    expect(roster('snide').split('right:-3px;bottom:-3px').length - 1).toBe(PODIUM_SIZE)
  })

  it('nests no anchor inside another', () => {
    const html = render(<DesktopPlayers {...props([player({ id: 77, faction_slug: 'snide', score: 10 })])} />)
    // Walk the tags: depth must never exceed one open <a>. A nested anchor is
    // invalid HTML the browser silently re-parents, so it cannot be caught by
    // looking at the rendered result — only at the string.
    let depth = 0
    let deepest = 0
    for (const tag of html.matchAll(/<(\/?)a[\s>]/g)) {
      depth += tag[1] === '/' ? -1 : 1
      deepest = Math.max(deepest, depth)
    }
    expect(deepest).toBe(1)
  })

  it('does not link an unaffiliated player — there is no page for a non-faction', () => {
    const html = roster('na')
    expect(hrefs(html)).not.toContain('/factions/na')
    // The mark is still drawn and still named — as a labelled image, not as a
    // focusable control that goes nowhere. The accessible name sits where the
    // visible word used to, so nothing about membership is lost on this row.
    expect(html).toContain(`aria-label="${factionName('na')}"`)
    expect(hrefs(html)).toContain('/characters/77')
  })
})

describe('Albescent is not linked to a viewer who has not been revealed to it', () => {
  const field = [player({ id: 79, display_name: 'Ash', faction_slug: ALBESCENT_FACTION_SLUG, score: 10 })]

  it('emits no albescent href — the slug never reaches the page source', () => {
    setAlbescentRevealed(false)
    const html = render(<DesktopPlayers {...props(field)} />)
    expect(hrefs(html), 'an href is the leak the mask exists to prevent').not.toContain(
      `/factions/${ALBESCENT_FACTION_SLUG}`,
    )
    // Belt and braces: the word must not appear anywhere in the markup either,
    // href or not. This is #1926's guarantee, restated where a link could undo it.
    expect(html).not.toContain(ALBESCENT_FACTION_SLUG)
    // The row still renders, still names the player, and still says
    // "Unaffiliated" — on the sigil's own label since #2245, which is exactly
    // what the visible word said before it. The labyrinth is drawn either way:
    // the owner accepted a stranger meeting an unfamiliar SHAPE, never a name.
    expect(html).toContain('Ash')
    expect(html).toContain(factionName('na'))
  })

  it('links it for a viewer who HAS been revealed', () => {
    setAlbescentRevealed(true)
    const html = render(<DesktopPlayers {...props(field)} />)
    expect(hrefs(html)).toContain(`/factions/${ALBESCENT_FACTION_SLUG}`)
  })
})

describe('factionHref, the one rule all three sections ask', () => {
  it('answers a page for a real faction', () => {
    expect(factionHref('coven')).toBe('/factions/coven')
  })

  it('answers null for unaffiliated, however it is spelled', () => {
    expect(factionHref('na')).toBeNull()
    expect(factionHref(null)).toBeNull()
    expect(factionHref(undefined)).toBeNull()
  })

  it('answers null for albescent until the viewer is revealed, then a page', () => {
    setAlbescentRevealed(false)
    expect(factionHref(ALBESCENT_FACTION_SLUG)).toBeNull()
    setAlbescentRevealed(true)
    expect(factionHref(ALBESCENT_FACTION_SLUG)).toBe(`/factions/${ALBESCENT_FACTION_SLUG}`)
  })
})
