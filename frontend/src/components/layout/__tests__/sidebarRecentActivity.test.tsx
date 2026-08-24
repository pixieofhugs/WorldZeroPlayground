/**
 * #1556 — the rail's activity panel, and the affordance that left it.
 *
 * TWO SEAMS, ONE FILE, because both are `Sidebar.tsx`.
 *
 * 1. **"Propose a task" is gone from the rail.** The design's handoff note:
 *    *"the sidebar is status and requests, not an authoring entry point"*. A
 *    typecheck cannot see a deletion, so the absence is asserted here — and by
 *    the ROUTE, not by the label, because the label survives on `/tasks` and a
 *    copy-based guard would go on passing if the button were merely reworded.
 *
 * 2. **"Recent Global Activity" became "Recent Activity"**, carrying the whole
 *    live feed rather than the two `global` types. The panel now renders types
 *    that used to be structurally impossible in it, so the fixtures below are
 *    those types: a vote on the viewer's praxis, a friend's completion, a taunt.
 *    The old panel would have printed the actor's name as the kicker and the
 *    literal string "a task" as the title for every one of them.
 *
 * The copy and the deep links come from the SAME helpers `/updates` draws its
 * cards with (`feedKicker`, `normalizeFeedItem`), so these assertions are
 * catalog-driven wherever the key still exists — a literal would pass while the
 * panel and the page it links to drifted apart.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'
import type { ActivityFeedItem } from '../../../api/activityFeed'
import type { CurrentUser } from '../../../api/auth'

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
    actor_display_name: null,
    actor_faction_slug: null,
    actor_avatar_url: null,
    payload: {},
    context_faction_slug: null,
    ...partial,
  }
}

/** One of each shape the widening added: a `your_stuff` type, a `friends` type
 *  and a `foes` type — none of which the `global`-only panel could ever hold. */
const WIDENED_FEED: ActivityFeedItem[] = [
  item({
    type: 'vote_on_mine',
    item_key: 'vote_on_mine:7',
    actor_display_name: 'Dr. Vale',
    payload: { praxis_id: 42, praxis_title: 'The tool library', value: 4 },
  }),
  item({
    type: 'friend_completion',
    item_key: 'friend_completion:9',
    actor_display_name: 'Sam',
    payload: { praxis_id: 55, task_title: 'Fix the gate', character_id: 3 },
  }),
  item({
    type: 'foe_taunt',
    item_key: 'foe_taunt:2',
    actor_display_name: 'Rook',
    payload: {},
  }),
]

function render(activity: ActivityFeedItem[] = WIDENED_FEED): string {
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

beforeEach(() => {
  panelsMock.mockReset()
})

describe('the rail stops offering an authoring entry point', () => {
  it('links nowhere near /propose-task', () => {
    // The ROUTE, not the label: the label moved to `/tasks` and still resolves.
    expect(render()).not.toContain('/propose-task')
  })

  it('guard: the label it used to draw is still a live key elsewhere', () => {
    // Without this, the assertion above could pass because the copy vanished
    // rather than because the control moved.
    expect(i18n.t('common:actions.proposeTask')).toBe('Propose a Task')
  })
})

describe('the panel is Recent Activity, not Recent Global Activity', () => {
  it('heads itself with the new copy and not the old', () => {
    const html = render()
    expect(html).toContain(i18n.t('common:sidebar.recentActivity.heading'))
    // A LITERAL: `sidebar.globalActivity.heading` is deleted, and a negative
    // assertion phrased as `i18n.t('<deleted key>')` compares against the key
    // string itself — which the markup never contains, so it would pass while
    // looking at nothing.
    expect(html).not.toContain('Recent global activity')
  })

  it('keeps a door to the full feed at its foot', () => {
    const html = render()
    expect(html).toContain(i18n.t('common:sidebar.recentActivity.seeMore'))
    expect(html).toContain('href="/updates"')
  })

  it('draws the See more door even with nothing to show', () => {
    // An empty panel is exactly when the player most needs telling the full
    // feed exists somewhere else.
    const html = render([])
    expect(html).toContain(i18n.t('common:sidebar.recentActivity.empty'))
    expect(html).toContain('href="/updates"')
  })
})

describe('the panel carries the whole live feed, not just global news', () => {
  it('names each type with the SAME kicker /updates uses', () => {
    const html = render()
    // `feed:kicker.*` is the shared vocabulary. The panel used to print the
    // actor's name in this slot for anything that was not a task or an era.
    expect(html).toContain(i18n.t('feed:kicker.vote_on_mine'))
    expect(html).toContain(i18n.t('feed:kicker.friend_completion'))
    expect(html).toContain(i18n.t('feed:kicker.foe_taunt'))
  })

  it('still says who, alongside what kind', () => {
    const html = render()
    expect(html).toContain('Dr. Vale')
    expect(html).toContain('Sam')
  })

  it('gives each row the deep link its type actually has', () => {
    const html = render()
    // From `normalizeFeedItem`, not re-derived: a vote opens the praxis it was
    // cast on, a friend completion opens theirs.
    expect(html).toContain('href="/praxis/42"')
    expect(html).toContain('href="/praxis/55"')
  })

  it('shows the stars that voter gave, not the praxis total (#2402)', () => {
    expect(render()).toContain(i18n.t('feed:row.pointsEarned', { points: 4 }))
  })

  it('never prints the deleted placeholder title', () => {
    // `sidebar.globalActivity.fallbackTaskTitle` was the literal "a task", and
    // every one of these three types would have hit it: none carries
    // `task_title` in the shape the old panel looked for. Its replacement is
    // the type's own headline, or the shared `feed:kicker.fallback`.
    expect(render()).not.toContain('a task')
  })
})
