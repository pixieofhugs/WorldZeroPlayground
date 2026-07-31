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
  it('links the bell to /updates when signed in', () => {
    authMock.mockReturnValue(signedIn)
    const html = render()
    expect(html).toContain('href="/updates"')
  })

  it('omits the bell when signed out', () => {
    authMock.mockReturnValue(signedOut)
    const html = render()
    expect(html).not.toContain('href="/updates"')
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
