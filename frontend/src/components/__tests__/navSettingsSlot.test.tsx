/**
 * #2761: `e2e/guest.spec.ts` proves a session via `data-testid="nav-settings"`.
 * `e2eAnchors.test.ts` checks it exists; this checks it is absent for a guest,
 * which the e2e assertion silently relies on.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import type { CurrentUser } from '../../api/auth'

const authMock = vi.fn()
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => authMock(),
}))

// Same stubs as `navCharacterLink.test.tsx`.
vi.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggle: () => {} }),
}))
vi.mock('../../hooks/useSidebarPanels', () => ({
  useSidebarPanels: () => ({
    pending_requests_count: 0,
    global_activity: [],
    active_praxes: [],
    refetch: vi.fn(),
    loading: false,
  }),
}))
vi.mock('../../api/auth', () => ({ loginWith: () => {} }))

import NavBar from '../NavBar'

function render(): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={['/']}>
      <NavBar />
    </MemoryRouter>,
  )
}

const SLOT = 'data-testid="nav-settings"'

describe('the nav settings slot is a session, not a decoration (#2761)', () => {
  it('renders for a signed-in account, as a link to /settings', () => {
    authMock.mockReturnValue({
      user: { character: { id: 42, display_name: 'Mollusk' } } as unknown as CurrentUser,
    })
    const html = render()
    expect(html).toContain(SLOT)
    // Attribute order varies; the claim is that it is an `<a>` to /settings.
    const tag = /<a ([^>]*data-testid="nav-settings"[^>]*)>/.exec(html)?.[1]
    expect(tag, 'the slot is on an anchor').toBeDefined()
    expect(tag).toContain('href="/settings"')
  })

  it('is absent for a guest — otherwise the e2e assertion proves nothing', () => {
    authMock.mockReturnValue({ user: null })
    expect(render()).not.toContain(SLOT)
  })
})
