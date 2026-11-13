/**
 * #1892: each activity row marks itself with its CONTEXT faction (matching the
 * `/updates` frame), not its actor's. Probed by difference between two rails, so
 * a hardcoded faction can't pass. Neutral rows are asserted via the sampling
 * expression, not `DefaultSigil` internals.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '../../../i18n'
import type { ActivityFeedItem } from '../../../api/activityFeed'
import type { CurrentUser } from '../../../api/auth'
import { markFills, occurrences, sigilPath } from '../../../utils/__tests__/sigilInk'
import { factionCssVar } from '../../../utils/factions'

const panelsMock = vi.fn()
vi.mock('../../../hooks/useSidebarPanels', () => ({
  useSidebarPanels: () => panelsMock(),
}))

vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { character: null } as unknown as CurrentUser }),
}))
vi.mock('../../../hooks/useGameConfig', () => ({
  useGameConfig: () => null,
}))

import Sidebar from '../Sidebar'

function item(partial: Partial<ActivityFeedItem> & { type: string }): ActivityFeedItem {
  return {
    item_key: `${partial.type}:1`,
    timestamp: new Date().toISOString(),
    actor_display_name: 'Rook',
    actor_faction_slug: null,
    actor_avatar_url: null,
    payload: {},
    context_faction_slug: null,
    ...partial,
  }
}

function renderRail(activity: ActivityFeedItem[]): string {
  panelsMock.mockReturnValue({
    pending_requests_count: 0,
    global_activity: activity,
    active_praxes: [],
    refetch: vi.fn(),
    loading: false,
  })
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={['/']}>
      <Sidebar />
    </MemoryRouter>,
  )
}

function railFor(contextSlug: string | null): string {
  return renderRail([item({ type: 'foe_taunt', item_key: 'foe_taunt:2', context_faction_slug: contextSlug })])
}

beforeEach(() => {
  panelsMock.mockReset()
})

describe('an activity row wears its faction', () => {
  it("draws the CONTEXT faction's sigil", () => {
    const coven = railFor('coven')
    const snide = railFor('snide')
    expect(occurrences(coven, sigilPath('coven')), 'a coven row draws the coven mark').toBe(
      occurrences(snide, sigilPath('coven')) + 1,
    )
    expect(occurrences(snide, sigilPath('snide')), 'a snide row draws the snide mark').toBe(
      occurrences(coven, sigilPath('snide')) + 1,
    )
  })

  it('reads context_faction_slug, NOT actor_faction_slug', () => {
    const html = renderRail([
      item({ type: 'foe_taunt', actor_faction_slug: 'snide', context_faction_slug: 'coven' }),
    ])
    expect(occurrences(html, sigilPath('coven')), 'the context mark is drawn').toBe(1)
    expect(occurrences(html, sigilPath('snide')), 'the actor mark is not').toBe(0)
  })

  // #2723: `factionCssVar` carries both themes; `currentColor` was page ink.
  it("paints the mark in the context faction's own hue", () => {
    expect(markFills(railFor('ephemerists'), 'ephemerists')).toContain(
      factionCssVar('ephemerists'),
    )
    expect(markFills(railFor('snide'), 'snide')).toContain(factionCssVar('snide'))
  })

  it('leaves no mark drawing in the page ink', () => {
    expect(markFills(railFor('ephemerists'), 'ephemerists')).not.toContain('currentColor')
  })

  it('retires the 6px dot', () => {
    expect(railFor('coven')).not.toContain('width:6px')
  })
})

describe('the rows with no faction still walk the spectrum', () => {
  function sampledAt(index: number): string {
    return `var(--faction-default-rainbow) ${index * 20}% 0 / 600% 100%`
  }

  it.each([null, 'na', 'default'])(
    'draws %s on the sampled ring rather than a mark of its own',
    (slug) => {
      expect(railFor(slug)).toContain(sampledAt(0))
    },
  )

  it('lets albescent draw its own labyrinth instead', () => {
    const rail = railFor('albescent')
    expect(rail, 'the labyrinth').toContain('/factionMarks/labyrinth.svg')
    expect(rail, 'not the sampled ring').not.toContain(sampledAt(0))
    // Not flat grey (#2723): the `isKnownFaction` guard keeps the conic.
    expect(rail, 'the conic it is painted with').toContain(
      'background:var(--faction-default-rainbow-conic)',
    )
    expect(railFor('na'), 'na still samples').toContain(sampledAt(0))
    expect(railFor('na')).not.toContain('/factionMarks/labyrinth.svg')
  })

  it('moves the sample down the column, as the dots did', () => {
    const html = renderRail([
      item({ type: 'foe_taunt', item_key: 'a' }),
      item({ type: 'foe_taunt', item_key: 'b' }),
      item({ type: 'foe_taunt', item_key: 'c' }),
    ])
    expect(occurrences(html, sampledAt(0))).toBe(1)
    expect(occurrences(html, sampledAt(1))).toBe(1)
    expect(occurrences(html, sampledAt(2))).toBe(1)
  })
})
