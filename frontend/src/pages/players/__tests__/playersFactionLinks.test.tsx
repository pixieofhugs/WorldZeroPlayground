/**
 * Faction names on the Players page open their faction page (#1953): which
 * names are `<a href>`, and which deliberately are not.
 *
 * Own file because `setAlbescentRevealed` is a module-level flag that would leak
 * into `playersDirectory.test.tsx`. The key case: an albescent href under the
 * masked "Unaffiliated" (#1926) would leak the slug and lead to a sealed door.
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

/** Podium fillers, so the rows under test land in the roster. */
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

function hrefs(html: string): string[] {
  return [...html.matchAll(/href="([^"]*)"/g)].map((match) => match[1])
}

// Module-level flag (#1891): reset on both edges.
beforeEach(() => setAlbescentRevealed(false))
afterEach(() => setAlbescentRevealed(false))

describe('the faction race', () => {
  for (const [surface, view] of [
    ['desktop', DesktopPlayers],
    ['mobile', MobilePlayers],
  ] as const) {
    it(`${surface}: every lane's name opens that faction's page`, () => {
      const Surface = view
      // The leader's lane, drawn on both surfaces at rest.
      const html = render(<Surface {...props([player({ id: 9, faction_slug: 'wow', score: 5000 })])} />)
      const linked = hrefs(html)
      expect(linked).toContain('/factions/wow')
      expect(html).toContain(`/factions/wow"`)
      expect(html).toContain(factionName('wow'))
    })
  }

  it('desktop draws one lane link per faction and no more', () => {
    const html = render(<DesktopPlayers {...props([])} />)
    for (const slug of FACTION_RAINBOW_ORDER) {
      expect(hrefs(html).filter((href) => href === `/factions/${slug}`), slug).toHaveLength(1)
    }
    expect(hrefs(html)).not.toContain('/factions/na')
    expect(hrefs(html)).not.toContain(`/factions/${ALBESCENT_FACTION_SLUG}`)
  })
})

/**
 * #2245: the faction is a sigil column, linked. With the word gone the link
 * needs an explicit accessible name (sigils are `aria-hidden`); the avatar badge
 * goes; and when `factionHref` withholds a link the mark is not focusable.
 */
describe('a roster row', () => {
  const roster = (slug: string) =>
    render(<DesktopPlayers {...props([player({ id: 77, faction_slug: slug, score: 10 })])} />)

  it("links the faction sigil in the row's own column to that faction", () => {
    const html = roster('snide')
    expect(hrefs(html)).toContain('/factions/snide')
    // Both links coexist without nesting via the stretched overlay (#1893).
    expect(hrefs(html)).toContain('/characters/77')
  })

  it('names that link, because the word it replaced is gone', () => {
    expect(roster('snide')).toContain(`aria-label="${factionName('snide')}"`)
  })

  it('prints the faction word once on the page — the race lane, not the row', () => {
    // The lane keeps its word (ADR-0082 §2); the row's was the duplicate.
    const text = roster('snide').replace(/<[^>]*>/g, '')
    expect(text.split(factionName('snide')).length - 1).toBe(1)
  })

  it('takes the membership badge off the roster avatar, leaving it to the podium', () => {
    // `right:-3px;bottom:-3px` is the badge clip both avatar roots share; only
    // the podium's remain.
    expect(roster('snide').split('right:-3px;bottom:-3px').length - 1).toBe(PODIUM_SIZE)
  })

  it('nests no anchor inside another', () => {
    const html = render(<DesktopPlayers {...props([player({ id: 77, faction_slug: 'snide', score: 10 })])} />)
    // Browsers silently re-parent nested anchors, so check the string.
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
    // Still named, as a labelled image.
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
    // Nor anywhere else in the markup (#1926).
    expect(html).not.toContain(ALBESCENT_FACTION_SLUG)
    // Still "Unaffiliated" on the sigil's label; the labyrinth shape is allowed.
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
