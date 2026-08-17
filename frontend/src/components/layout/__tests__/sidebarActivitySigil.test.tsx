/**
 * #1892 — what the rail's activity rows mark themselves with.
 *
 * THE SEAM is the first child of the row in `RecentActivityBody`: a 6px rounded
 * square tinted by sampling the spectrum at the row's index. It carried no
 * information — it was decoration shaped like a signal — and this file asserts
 * it now carries the row's faction.
 *
 * Probed by DIFFERENCE, like `sidebarActiveTaskSigil`: a presence check on one
 * faction's geometry would still pass on a row that had hardcoded that faction.
 * Two rails rendered with two different context factions, each required to move
 * the mark, is the assertion that only holds if the row reads the slug.
 *
 * WHICH slug is the point of the issue, so it gets its own probe: a fixture
 * whose actor is one faction and whose context is another must draw the
 * CONTEXT's mark. The panel is a window onto `/updates` and the mark has to
 * agree with the frame the player lands on when they click through.
 *
 * The neutral rows are asserted through the sampling EXPRESSION rather than
 * through `DefaultSigil`'s internals, which is what has let this block survive
 * three rulings on Albescent's mark without rewriting the mechanism each time.
 * `albescent` is no longer one of them: Sigil Studies v2 gives it a mark of its
 * own again and the owner has accepted these rows showing it, so it has its own
 * case below and `na`/`default`/`null` keep theirs unchanged.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '../../../i18n'
import type { ActivityFeedItem } from '../../../api/activityFeed'
import type { CurrentUser } from '../../../api/auth'
import FactionSigil from '../../sigil/FactionSigil'

const panelsMock = vi.fn()
vi.mock('../../../hooks/useSidebarPanels', () => ({
  useSidebarPanels: () => panelsMock(),
}))

// Effects never run under `renderToStaticMarkup`; mock the two hooks that would
// otherwise sit at their loading defaults and render a signed-out rail.
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

/** One row carrying the given context faction. */
function railFor(contextSlug: string | null): string {
  return renderRail([item({ type: 'foe_taunt', item_key: 'foe_taunt:2', context_faction_slug: contextSlug })])
}

/** The mark's own geometry, taken from `FactionSigil` rather than transcribed. */
function sigilPath(slug: string): string {
  const html = renderToStaticMarkup(<FactionSigil slug={slug} />)
  const match = html.match(/ d="([^"]+)"/)
  if (!match) throw new Error(`the ${slug} sigil draws no path to probe`)
  return match[1]
}

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1
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
    // The panel links to `/updates`, where the card's frame themes to the
    // context faction. A mark drawn from the actor would disagree with the page
    // one click away — the panel's own comment calls that "eleven ways to
    // disagree with the page this panel links to".
    const html = renderRail([
      item({ type: 'foe_taunt', actor_faction_slug: 'snide', context_faction_slug: 'coven' }),
    ])
    expect(occurrences(html, sigilPath('coven')), 'the context mark is drawn').toBe(1)
    expect(occurrences(html, sigilPath('snide')), 'the actor mark is not').toBe(0)
  })

  it('retires the 6px dot', () => {
    // The mark is 18px now; the decoration that looked like a signal is gone.
    expect(railFor('coven')).not.toContain('width:6px')
  })
})

describe('the rows with no faction still walk the spectrum', () => {
  /** The window onto `--faction-default-rainbow` this row's index samples. */
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
    // #1892 named `albescent` in the neutral set because #1891 had just deleted
    // its mark, so the slug had none to draw. Sigil Studies v2 gives it the
    // labyrinth and the owner has accepted these rows showing it — so the set
    // is back to the slugs whose mark really IS the unaffiliated ring. Note the
    // labyrinth would take the sampled background perfectly well (it is painted
    // through a mask, like `DefaultSigil`); it is out of the set because its
    // mark is no longer the ring, not because it could not be sampled.
    const rail = railFor('albescent')
    expect(rail, 'the labyrinth').toContain('/factionMarks/labyrinth.svg')
    expect(rail, 'not the sampled ring').not.toContain(sampledAt(0))
    // And na is undisturbed by the removal — the whole point of the set.
    expect(railFor('na'), 'na still samples').toContain(sampledAt(0))
    expect(railFor('na')).not.toContain('/factionMarks/labyrinth.svg')
  })

  it('moves the sample down the column, as the dots did', () => {
    // Without this the neutral rows would all wear one identical ring and the
    // column would go flat.
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
