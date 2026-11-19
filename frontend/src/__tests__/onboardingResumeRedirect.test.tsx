/**
 * `/` is the welcome flow, and a returning OAuth round trip resumes it in place (#1861, #3541).
 *
 * Every OAuth callback lands on `/` (`auth.py::_signed_in_redirect`), so the
 * `sessionStorage` mark read by `RootLanding` is the whole mechanism. No effects
 * run here, so the page shows as which stub rendered.
 */
import { Suspense } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, afterEach, vi } from 'vitest'

import '../i18n'
import { AuthContext } from '../auth/AuthContext'
import type { CurrentUser } from '../api/auth'
import { RootLanding } from '../App'

vi.mock('../pages/Onboarding', () => ({ default: () => <div data-page="flow" /> }))
vi.mock('../pages/FieldDesk', () => ({ default: () => <div data-page="field-desk" /> }))

const NO_CHARACTER = { account_id: 1, character: null, is_admin: false } as unknown as CurrentUser
const PLAYER = { account_id: 1, character: { id: 7 }, is_admin: false } as unknown as CurrentUser

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
  it('shows a guest the flow', async () => {
    withHandoff(false)

    expect(await renderRoot(null)).toContain('data-page="flow"')
  })

  it('shows a signed-in account with no character the flow', async () => {
    withHandoff(false)

    expect(await renderRoot(NO_CHARACTER)).toContain('data-page="flow"')
  })

  it('leaves a player with a character on their desk', async () => {
    withHandoff(false)

    const markup = await renderRoot(PLAYER)

    expect(markup).toContain('data-page="field-desk"')
    expect(markup).not.toContain('data-page="flow"')
  })

  it('resumes the flow in place for a player carrying the mark: the contract is recorded there', async () => {
    withHandoff(true)

    const markup = await renderRoot(PLAYER)

    expect(markup).toContain('data-page="flow"')
    expect(markup).not.toContain('data-page="field-desk"')
  })
})
