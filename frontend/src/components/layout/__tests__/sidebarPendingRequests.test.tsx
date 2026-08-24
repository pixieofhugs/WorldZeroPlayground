/**
 * #1423 — the rail stops LISTING pending requests, but keeps COUNTING them.
 *
 * The seam is `SidebarColumn`: the one place the provider's request data meets
 * both of its consumers. Under ADR-0070 the actionable pile lives in the
 * Requests queue on `/updates` and nowhere else, so the rail must render no
 * accept/decline control — while the collapsed handle's badge, which is the
 * only thing telling a folded-away desktop that something is waiting, must
 * still show the number. Since #1456 that number arrives AS a number:
 * `pending_requests_count`, with no items behind it to measure.
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

// The rail has nothing to list any more, so this fixture is just the number
// the badge is meant to show (#1456). It used to be three hydrated feed items
// that only ever had `.length` taken off them.
const PENDING_COUNT = 3

function render(collapsed: boolean): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={['/']}>
      <SidebarColumn collapsed={collapsed} onToggle={() => {}} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  panelsMock.mockReturnValue({
    pending_requests_count: PENDING_COUNT,
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
    //
    // These four are LITERALS on purpose. Their catalog keys
    // (`common:sidebar.pendingRequests.heading`, `common:requests.*`) went with
    // the markup, and a negative assertion phrased as `i18n.t('<deleted key>')`
    // compares against the key string itself — which the page never contains,
    // so the guard would pass without looking at anything. `actions.accept` and
    // `actions.decline` below survive and have other readers, so those stay
    // catalog-driven. That claim was FALSE when written (#2598): the two keys
    // had no reader but this file, and a key whose only reader asserts its
    // ABSENCE is dead. It is true now — the four feed cards that each kept a
    // private copy of these two words read the shared block instead:
    // `FeedCardCollabInvite` (both), `FeedCardDuelChallenge` (decline),
    // `FeedCardInvitationLetter` (accept). `actions.submit` had no such
    // successor and was deleted.
    expect(html, 'panel heading').not.toContain('Pending Requests')
    expect(html, 'PendingRequestRow kicker').not.toContain('Collab Invite')
    expect(html, 'PendingRequestRow kicker').not.toContain('Duel Challenge')
    expect(html, 'AwaitingSubmissionRow kicker').not.toContain('Your turn')
    // Answering happens in the queue now, never here (ADR-0070).
    expect(i18n.t('common:actions.accept'), 'guard: key resolves').toBe('Accept')
    expect(html, 'accept').not.toContain(i18n.t('common:actions.accept'))
    expect(html, 'decline').not.toContain(i18n.t('common:actions.decline'))
  })

  it('still badges the count on the collapsed handle', () => {
    const html = render(true)
    expect(html).toContain('aria-label="Expand sidebar — 3 pending requests"')
    expect(html).toContain('>3<')
  })

  // #1457: the count is the ONLY thing the rail still says about requests, so
  // it has to survive in the state where the panel used to be. The seam is the
  // point — the column must thread the number into the handle in both states,
  // not just the one that has always had a badge.
  it('badges the count on the expanded handle too, where the panel used to be', () => {
    const html = render(false)
    expect(html).toContain('aria-label="Collapse sidebar — 3 pending requests"')
    expect(html).toContain('>3<')
  })

  it('badges nothing when the count is 0 — 0 is not a silent failure', () => {
    panelsMock.mockReturnValue({
      pending_requests_count: 0,
      global_activity: [],
      active_praxes: [],
      refetch: vi.fn(),
      loading: false,
    })
    expect(render(true)).toContain('aria-label="Expand sidebar"')
  })
})
