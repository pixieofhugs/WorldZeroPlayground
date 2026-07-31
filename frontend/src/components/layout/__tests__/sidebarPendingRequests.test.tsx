/**
 * #1423 — the rail stops LISTING pending requests, but keeps COUNTING them.
 *
 * The seam is `SidebarColumn`: the one place the provider's `pending_requests`
 * array meets both of its consumers. Under ADR-0070 the actionable pile lives
 * in the Requests queue on `/updates` and nowhere else, so the rail must render
 * no accept/decline control — while the collapsed handle's badge, which is the
 * only thing telling a folded-away desktop that something is waiting, must
 * still read the same array's length.
 *
 * A count that silently reads 0 looks like "nothing pending" rather than like a
 * bug, which is why it is pinned here rather than left to the deletion's
 * typecheck.
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

// Effects never run under `renderToStaticMarkup`, so both of these would sit at
// their loading defaults; mock them to render a signed-in rail.
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { character: null } as unknown as CurrentUser }),
}))
vi.mock('../../../hooks/useGameConfig', () => ({
  useGameConfig: () => null,
}))

import SidebarColumn from '../SidebarColumn'

const pendingRequest = (type: string): ActivityFeedItem =>
  ({
    type,
    item_key: `${type}:1`,
    timestamp: new Date().toISOString(),
    actor_display_name: 'Wren',
    actor_faction_slug: 'ua',
    actor_avatar_url: null,
    context_faction_slug: 'ua',
    payload: {
      inviter_character_id: 7,
      challenger_character_id: 7,
      praxis_id: 3,
      praxis_type: 'collab',
      task_title: 'Mend the orrery',
      task_faction_slug: 'ua',
    },
  }) as ActivityFeedItem

const THREE_PENDING = [
  pendingRequest('collab_invite'),
  pendingRequest('duel_challenge'),
  pendingRequest('awaiting_submission'),
]

function render(collapsed: boolean): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={['/']}>
      <SidebarColumn collapsed={collapsed} onToggle={() => {}} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  panelsMock.mockReturnValue({
    pending_requests: THREE_PENDING,
    global_activity: [],
    active_praxes: [],
    refetch: vi.fn(),
    loading: false,
  })
})

describe('the rail and its pending requests', () => {
  it('lists no pending request, and offers no way to answer one', () => {
    const html = render(false)

    // The panel's heading and its two row kinds, by the copy they rendered.
    expect(html, 'panel heading').not.toContain('Pending Requests')
    expect(html, 'PendingRequestRow kicker').not.toContain(
      i18n.t('common:requests.collabInvite'),
    )
    expect(html, 'PendingRequestRow kicker').not.toContain(
      i18n.t('common:requests.duelChallenge'),
    )
    expect(html, 'AwaitingSubmissionRow kicker').not.toContain(
      i18n.t('common:requests.awaitingSubmissionCollab'),
    )
    // Answering happens in the queue now, never here (ADR-0070).
    expect(html, 'accept').not.toContain(i18n.t('common:actions.accept'))
    expect(html, 'decline').not.toContain(i18n.t('common:actions.decline'))
  })

  it('still badges the count on the collapsed handle', () => {
    const html = render(true)
    expect(html).toContain('aria-label="Expand sidebar — 3 pending requests"')
    expect(html).toContain('>3<')
  })

  it('badges nothing when the array is empty — 0 is not a silent failure', () => {
    panelsMock.mockReturnValue({
      pending_requests: [],
      global_activity: [],
      active_praxes: [],
      refetch: vi.fn(),
      loading: false,
    })
    expect(render(true)).toContain('aria-label="Expand sidebar"')
  })
})
