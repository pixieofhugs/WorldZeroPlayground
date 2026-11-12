/**
 * #1457: the desktop nav's `Updates` link carries the pending count. Between
 * 768 and 1023px there is no rail, so this is the only pending signal. The
 * badge is aria-hidden, so the count rides the link's accessible name.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '../../i18n'
import type { CurrentUser } from '../../api/auth'

const authMock = vi.fn()
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => authMock(),
}))

// `useTheme` throws outside its provider (#701).
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
    expect(html).toContain('href="/updates"')
  })

  it('shows a guest no badge — the guest read is a 401 emptied to 0', () => {
    authMock.mockReturnValue(signedOut)
    const html = render()
    expect(html).toContain('href="/updates"')
    expect(html).not.toContain('pending request')
  })
})
