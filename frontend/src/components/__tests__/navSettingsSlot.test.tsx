/**
 * #2761 — the slot `e2e/guest.spec.ts` now uses to prove a session exists.
 *
 * THE SEAM is the nav's `{user && ...}` settings link. The spec used to assert
 * a logout button that #2155 removed from the bar, so it had to re-anchor onto
 * something authenticated-only; `data-testid="nav-settings"` is that anchor.
 *
 * `e2eAnchors.test.ts` already checks the slot still exists SOMEWHERE in the
 * app — which is the rename it guards against. It cannot check the property the
 * e2e assertion actually rests on: that the slot is absent for a guest. A slot
 * that started rendering signed-out would leave `guest.spec.ts` green while
 * proving nothing, which is the exact failure mode that file was written about.
 * Both halves of the gate are pinned here, so moving the link out of `{user &&}`
 * fails in the PR suite rather than in a nightly nobody reads.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import type { CurrentUser } from '../../api/auth'

const authMock = vi.fn()
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => authMock(),
}))

// Same three stubs as `navCharacterLink.test.tsx`: `useTheme` throws outside its
// provider by design (#701) and the panels come over the network (#1344).
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
    // The slot's own tag, then its attributes — not one welded pattern. React
    // and react-router order these however they like (`data-discover` lands in
    // the middle), and the claim is about the ELEMENT: it is an `<a>`, so
    // Playwright's `toHaveRole('link')` holds, and it goes to `/settings`.
    const tag = /<a ([^>]*data-testid="nav-settings"[^>]*)>/.exec(html)?.[1]
    expect(tag, 'the slot is on an anchor').toBeDefined()
    expect(tag).toContain('href="/settings"')
  })

  it('is absent for a guest — otherwise the e2e assertion proves nothing', () => {
    authMock.mockReturnValue({ user: null })
    expect(render()).not.toContain(SLOT)
  })
})
