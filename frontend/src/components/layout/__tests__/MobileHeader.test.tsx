import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
// Initialize the i18n catalog so nav/settings copy keys resolve to English text.
import '../../../i18n'
import type { CurrentUser } from '../../../api/auth'

// useAuth reads from context whose value is populated by an async effect that
// never runs under renderToStaticMarkup — mock it to control signed-in state.
const authMock = vi.fn()
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => authMock(),
}))

// The rail's panels come over the network (#1344); mock the read to control
// the badge. The bell shares the desktop rail's ONE response — it no longer
// makes a second, byte-identical limit-100 feed call of its own.
const pendingMock = vi.fn()
vi.mock('../../../hooks/useSidebarPanels', () => ({
  useSidebarPanels: () => pendingMock(),
}))

import MobileHeader from '../MobileHeader'
import { REQUESTS_QUEUE_LINK } from '../../../pages/updates/requestsQueueAnchor'

function render(): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={['/']}>
      <MobileHeader />
    </MemoryRouter>,
  )
}

const signedIn = { user: { character: null } as unknown as CurrentUser }
const signedOut = { user: null }

beforeEach(() => {
  pendingMock.mockReturnValue({
    pending_requests_count: 0,
    global_activity: [],
    active_praxes: [],
    refetch: vi.fn(),
    loading: false,
  })
})

describe('MobileHeader bell', () => {
  it('links the bell to the Requests queue when signed in (#2083)', () => {
    authMock.mockReturnValue(signedIn)
    const html = render()
    // The queue's own anchor, not the top of the stream: the destination is one
    // of the three places the bell has to say what it counts.
    expect(html).toContain(`href="${REQUESTS_QUEUE_LINK}"`)
  })

  it('omits the bell when signed out', () => {
    authMock.mockReturnValue(signedOut)
    const html = render()
    expect(html).not.toContain('href="/updates')
  })

  /**
   * #2083 - the bell is a QUEUE OF THINGS AWAITING AN ANSWER, not a generic
   * notification bell.
   *
   * It counts `pending_requests_count`; the mobile home's row counts
   * `global_activity`, which is the same feed minus those obligations
   * (ADR-0070). Someone changing a vote on your praxis is an event, so it lands
   * on the home row and correctly leaves this silent - and a bell whose whole
   * accessible name was "Updates" left that reading as a broken bell.
   *
   * Asserted on the accessible name AND the tooltip because they are the two
   * halves the badge cannot carry: `PendingBadge` is `aria-hidden` by contract,
   * so a screen reader meets only the name, and a sighted reader hovering a
   * bare icon meets only the title.
   */
  it('names the queue in its accessible name and its tooltip, at zero', () => {
    authMock.mockReturnValue(signedIn)
    const html = render()
    expect(html).toContain('aria-label="Requests \u2014 nothing waiting on you"')
    expect(html).toContain('title="Requests \u2014 nothing waiting on you"')
    expect(html, 'a bare page name says nothing about what it counts').not.toContain(
      'aria-label="Updates"',
    )
  })

  it('carries the count in both, since the badge itself is aria-hidden', () => {
    authMock.mockReturnValue(signedIn)
    pendingMock.mockReturnValue({
      pending_requests_count: 3,
      global_activity: [],
      active_praxes: [],
      refetch: vi.fn(),
      loading: false,
    })
    const html = render()
    expect(html).toContain('aria-label="Requests \u2014 3 waiting on you"')
    expect(html).toContain('title="Requests \u2014 3 waiting on you"')
  })

  it('shows the pending-request badge only when there are requests', () => {
    authMock.mockReturnValue(signedIn)
    // No requests → no badge.
    expect(render()).not.toContain('>3<')

    // Three pending requests → badge count is rendered.
    pendingMock.mockReturnValue({
      pending_requests_count: 3,
      global_activity: [],
      active_praxes: [],
      refetch: vi.fn(),
      loading: false,
    })
    expect(render()).toContain('>3<')
  })
})
