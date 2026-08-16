/**
 * #1457 — the desktop nav's `Updates` entry carries the pending-request count.
 *
 * Two things make this more than decoration, and the second is why it is pinned
 * rather than left to review:
 *
 * 1. After ADR-0070, `/updates` is the only surface an unanswered obligation
 *    can be answered on, and this is the desktop's one permanent route there.
 * 2. `SidebarColumn` is `hidden lg:block` and only mounts signed in, so between
 *    768px and 1023px a signed-in player sees this bar and NO rail. Neither
 *    sidebar handle state exists at that width — this badge is the only pending
 *    signal there is.
 *
 * The badge is `aria-hidden` and colour-carried, so the count has to ride the
 * LINK's accessible name. Both halves are asserted.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
// Initialize the catalog so the nav copy keys resolve to English text.
import '../../i18n'
import type { CurrentUser } from '../../api/auth'

const authMock = vi.fn()
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => authMock(),
}))

// `useTheme` throws outside its provider by design (#701), and the panels come
// over the network (#1344); the static renderer supplies neither.
vi.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggle: () => {} }),
}))

const pendingMock = vi.fn()
vi.mock('../../hooks/useSidebarPanels', () => ({
  useSidebarPanels: () => pendingMock(),
}))

vi.mock('../../api/auth', () => ({ loginWith: () => {} }))

import NavBar from '../NavBar'

function render(): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={['/tasks']}>
      <NavBar />
    </MemoryRouter>,
  )
}

function panels(pending_requests_count: number) {
  return {
    pending_requests_count,
    global_activity: [],
    active_praxes: [],
    refetch: vi.fn(),
    loading: false,
  }
}

const signedIn = { user: { character: null } as unknown as CurrentUser, signOut: () => {} }
const signedOut = { user: null, signOut: () => {} }

beforeEach(() => {
  authMock.mockReturnValue(signedIn)
  pendingMock.mockReturnValue(panels(0))
})

describe('NavBar Updates badge', () => {
  it('badges the count on the Updates link', () => {
    pendingMock.mockReturnValue(panels(3))
    const html = render()
    expect(html).toContain('>3<')
  })

  it('reports the count in the link accessible name, not colour alone', () => {
    pendingMock.mockReturnValue(panels(3))
    expect(render()).toContain('aria-label="Updates — 3 pending requests"')
  })

  it('speaks singular for one request', () => {
    pendingMock.mockReturnValue(panels(1))
    expect(render()).toContain('aria-label="Updates — 1 pending request"')
  })

  it('draws no badge and renames nothing with an empty queue', () => {
    const html = render()
    expect(html).not.toContain('>0<')
    expect(html).not.toContain('pending request')
    // The link itself is untouched — this is a badge, not a route change.
    expect(html).toContain('href="/updates"')
  })

  it('shows a guest no badge — the guest read is a 401 emptied to 0', () => {
    authMock.mockReturnValue(signedOut)
    const html = render()
    expect(html).toContain('href="/updates"')
    expect(html).not.toContain('pending request')
  })
})
