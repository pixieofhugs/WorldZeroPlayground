/**
 * `/` puts a returning OAuth round trip back into the onboarding flow (#1861).
 *
 * WHY THE RULE LIVES AT `/` AT ALL. `backend/routers/auth.py::_signed_in_redirect`
 * sends every successful callback to `settings.FRONTEND_URL` — a constant — so
 * a player who tapped a provider from the onboarding auth card arrives at `/`,
 * not at the card they left. Nothing rides on the wire to say otherwise: no
 * query parameter, no return-to path, no backend redirect target. The mark in
 * `sessionStorage` is the whole mechanism, and `RootLanding` is where it is
 * read.
 *
 * WHAT THIS CAN OBSERVE. `renderToStaticMarkup` runs no effects, and
 * `<Navigate>` navigates in one — so the redirect is visible here as the
 * ABSENCE of a landing, which is exactly the distinction that matters: with the
 * mark set, `/` must render neither Home nor FieldDesk.
 *
 * The two negative cases are the ones that would strand someone. A guest
 * carrying a stale mark must still get Home (there is no account to bind
 * consent to), and a signed-in viewer with no mark must get FieldDesk (the flow
 * is not a toll gate on the app).
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
    // There is no account to bind consent to, so resuming at the terms card
    // would be a card that cannot do anything. A stale mark must not cost a
    // logged-out visitor the homepage.
    withHandoff(true)

    expect(await renderRoot(null)).toContain('data-page="home"')
  })
})
