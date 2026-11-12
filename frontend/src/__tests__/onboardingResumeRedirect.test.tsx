/**
 * `/` puts a returning OAuth round trip back into the onboarding flow (#1861).
 *
 * Every OAuth callback lands on `/` (`auth.py::_signed_in_redirect`), so the
 * `sessionStorage` mark read by `RootLanding` is the whole mechanism. No effects
 * run here, so the redirect shows as the ABSENCE of Home and FieldDesk.
 */
import { Suspense } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, afterEach, vi } from 'vitest'

import '../i18n'
import { AuthContext } from '../auth/AuthContext'
import type { CurrentUser } from '../api/auth'
import { RootLanding } from '../App'

vi.mock('../pages/Home', () => ({ default: () => <div data-page="home" /> }))
vi.mock('../pages/FieldDesk', () => ({ default: () => <div data-page="field-desk" /> }))

const SIGNED_IN = { account_id: 1, character: null, is_admin: false } as unknown as CurrentUser

function withHandoff(marked: boolean): void {
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => (marked && key === 'wz_onboarding_handoff' ? 'true' : null),
    setItem: () => {},
    removeItem: () => {},
  })
}

const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0))

/** Markup after `lazy` has travelled Pending → microtask → Resolved. */
async function renderRoot(user: CurrentUser | null): Promise<string> {
  const tree = (
    <MemoryRouter>
      <AuthContext.Provider
        value={{ user, loading: false, refetch: async () => {}, applyUser: () => {}, signOut: async () => {} }}
      >
        <Suspense fallback={<div data-page="suspended" />}>
          <RootLanding />
        </Suspense>
      </AuthContext.Provider>
    </MemoryRouter>
  )
  renderToStaticMarkup(tree)
  await nextTick()
  return renderToStaticMarkup(tree)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the root route and the onboarding handoff mark', () => {
  it('sends a signed-in viewer carrying the mark back into the flow', async () => {
    withHandoff(true)

    const markup = await renderRoot(SIGNED_IN)

    expect(markup).not.toContain('data-page="field-desk"')
    expect(markup).not.toContain('data-page="home"')
  })

  it('leaves a signed-in viewer without the mark on their desk', async () => {
    withHandoff(false)

    expect(await renderRoot(SIGNED_IN)).toContain('data-page="field-desk"')
  })

  it('does not pull a guest into the flow, mark or no mark', async () => {
    // No account to bind consent to; a stale mark must not cost a guest the homepage.
    withHandoff(true)

    expect(await renderRoot(null)).toContain('data-page="home"')
  })
})
