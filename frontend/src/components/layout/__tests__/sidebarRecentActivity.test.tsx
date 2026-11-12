/**
 * #1556: the rail offers no "Propose a task" (asserted by route, since the label
 * lives on at `/tasks`), and "Recent Activity" carries the whole live feed via
 * the same helpers as `/updates`, so assertions are catalog-driven.
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

/** One each of `your_stuff`, `friends` and `foes`. */
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
    expect(render()).not.toContain('/propose-task')
  })

  it('guard: the label it used to draw is still a live key elsewhere', () => {
    expect(i18n.t('common:actions.proposeTask')).toBe('Propose a Task')
  })
})

describe('the panel is Recent Activity, not Recent Global Activity', () => {
  it('heads itself with the new copy and not the old', () => {
    const html = render()
    expect(html).toContain(i18n.t('common:sidebar.recentActivity.heading'))
    // A literal: `t()` of a deleted key returns the key, which would never match.
    expect(html).not.toContain('Recent global activity')
  })

  it('keeps a door to the full feed at its foot', () => {
    const html = render()
    expect(html).toContain(i18n.t('common:sidebar.recentActivity.seeMore'))
    expect(html).toContain('href="/updates"')
  })

  it('draws the See more door even with nothing to show', () => {
    const html = render([])
    expect(html).toContain(i18n.t('common:sidebar.recentActivity.empty'))
    expect(html).toContain('href="/updates"')
  })
})

describe('the panel carries the whole live feed, not just global news', () => {
  it('names each type with the SAME kicker /updates uses', () => {
    const html = render()
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
    expect(html).toContain('href="/praxis/42"')
    expect(html).toContain('href="/praxis/55"')
  })

  it('shows the stars that voter gave, not the praxis total (#2402)', () => {
    expect(render()).toContain(i18n.t('feed:row.pointsEarned', { points: 4 }))
  })

  it('never prints the deleted placeholder title', () => {
    expect(render()).not.toContain('a task')
  })
})
