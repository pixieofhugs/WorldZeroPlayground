import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
// Initialize the i18n catalog so nav/settings copy keys resolve to English text.
import '../../../i18n'
import type { CurrentUser } from '../../../api/auth'
import type { ActivityFeedItem } from '../../../api/activityFeed'

// useAuth reads from context whose value is populated by an async effect that
// never runs under renderToStaticMarkup — mock it to control signed-in state.
const authMock = vi.fn()
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => authMock(),
}))

// usePendingRequests fetches over the network; mock it to control the badge.
const pendingMock = vi.fn()
vi.mock('../../../hooks/usePendingRequests', () => ({
  usePendingRequests: () => pendingMock(),
}))

import MobileLayout from '../MobileLayout'

function render(): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={['/']}>
      <MobileLayout>
        <div>content</div>
      </MobileLayout>
    </MemoryRouter>,
  )
}

const signedIn = { user: { character: null } as unknown as CurrentUser }
const signedOut = { user: null }

beforeEach(() => {
  pendingMock.mockReturnValue({ pendingRequests: [], refetch: vi.fn(), loading: false })
})

describe('MobileLayout header bell', () => {
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
      pendingRequests: [{}, {}, {}] as ActivityFeedItem[],
      refetch: vi.fn(),
      loading: false,
    })
    expect(render()).toContain('>3<')
  })
})
