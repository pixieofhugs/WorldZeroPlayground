/**
 * #1423: the rail lists no pending requests (ADR-0070: answered only in the
 * `/updates` queue) but the handle still badges the count. A count silently
 * reading 0 looks like "nothing pending", hence pinned.
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

vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { character: null } as unknown as CurrentUser }),
}))
vi.mock('../../../hooks/useGameConfig', () => ({
  useGameConfig: () => null,
}))

import SidebarColumn from '../SidebarColumn'

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

    // Literals: their keys are deleted, and `t()` of a deleted key returns the
    // key itself, which would never match. `actions.*` keys are live (#2598).
    expect(html, 'panel heading').not.toContain('Pending Requests')
    expect(html, 'PendingRequestRow kicker').not.toContain('Collab Invite')
    expect(html, 'PendingRequestRow kicker').not.toContain('Duel Challenge')
    expect(html, 'AwaitingSubmissionRow kicker').not.toContain('Your turn')
    expect(i18n.t('common:actions.accept'), 'guard: key resolves').toBe('Accept')
    expect(html, 'accept').not.toContain(i18n.t('common:actions.accept'))
    expect(html, 'decline').not.toContain(i18n.t('common:actions.decline'))
  })

  it('still badges the count on the collapsed handle', () => {
    const html = render(true)
    expect(html).toContain('aria-label="Expand sidebar — 3 pending requests"')
    expect(html).toContain('>3<')
  })

  // #1457: badged in both states.
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
