/**
 * `/` must not serialize its chunk download behind `/auth/me` (#1380).
 *
 * Observed via the module registry: a `vi.mock` factory flags when a page
 * module is first imported, i.e. whether `RootLanding` asked for it while the
 * session was resolving. Wire overlap is `npm run measure`'s job.
 *
 * Warm ONE landing, not both (both measured ~270ms slower on Slow 4G). And no
 * signed-in surface may render before the session resolves, whatever the hint.
 */
import { Suspense } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'

import '../i18n'
import { AuthContext } from '../auth/AuthContext'
import type { CurrentUser } from '../api/auth'
// Safe: `vi.mock` is hoisted above it.
import { RootLanding } from '../App'

/** Set by the mock factories the first time each page module is imported. */
const imported = vi.hoisted(() => ({ home: false, fieldDesk: false }))

vi.mock('../pages/Home', () => {
  imported.home = true
  return { default: () => <div data-page="home" /> }
})
vi.mock('../pages/FieldDesk', () => {
  imported.fieldDesk = true
  return { default: () => <div data-page="field-desk" /> }
})

const SIGNED_IN = { account_id: 1, character: null, is_admin: false } as unknown as CurrentUser

/** Node has no `localStorage`; unstubbed means "no hint". */
function withSessionHint(hint: string | null): void {
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => (key === 'wz_session_hint' ? hint : null),
    setItem: () => {},
    removeItem: () => {},
  })
}

function renderRoot(session: { user: CurrentUser | null; loading: boolean }): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <AuthContext.Provider value={{ ...session, refetch: async () => {}, applyUser: () => {}, signOut: async () => {} }}>
        {/* App's Suspense boundary, with a distinctive fallback. */}
        <Suspense fallback={<div data-page="suspended" />}>
          <RootLanding />
        </Suspense>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0))

/** `lazy` suspends on first render even when cached; the second render resolves. */
async function renderResolved(session: { user: CurrentUser | null; loading: boolean }): Promise<string> {
  renderRoot(session)
  await nextTick()
  return renderRoot(session)
}

// Order matters: "not imported" must be asserted before any test imports it.
describe('the root route warms one landing before the auth answer (#1380)', () => {
  it('warms Home, and only Home, for a browser with no session hint', async () => {
    expect({ ...imported }).toEqual({ home: false, fieldDesk: false })

    renderRoot({ user: null, loading: true })
    await nextTick()

    expect({ ...imported }).toEqual({ home: true, fieldDesk: false })
  })

  it('warms FieldDesk instead when the last visit had a session', async () => {
    expect(imported.fieldDesk).toBe(false)
    withSessionHint('true')

    renderRoot({ user: null, loading: true })
    await nextTick()

    expect(imported.fieldDesk).toBe(true)
    vi.unstubAllGlobals()
  })
})

describe('the root route shows no signed-in surface it should not', () => {
  it('renders the loading surface, not a page, while the session is unresolved', () => {
    const markup = renderRoot({ user: null, loading: true })

    expect(markup).not.toContain('data-page="field-desk"')
    expect(markup).not.toContain('data-page="home"')
    expect(markup).toContain('Loading')
  })

  it('renders the loading surface even when the hint claims a session', () => {
    withSessionHint('true')

    const markup = renderRoot({ user: null, loading: true })

    // The hint picks a download, never a surface.
    expect(markup).not.toContain('data-page="field-desk"')
    expect(markup).toContain('Loading')
    vi.unstubAllGlobals()
  })

  it('renders Home for a resolved signed-out viewer, hint or no hint', async () => {
    withSessionHint('true')

    const markup = await renderResolved({ user: null, loading: false })

    expect(markup).toContain('data-page="home"')
    expect(markup).not.toContain('data-page="field-desk"')
    vi.unstubAllGlobals()
  })

  it('renders FieldDesk for a resolved signed-in viewer', async () => {
    const markup = await renderResolved({ user: SIGNED_IN, loading: false })

    expect(markup).toContain('data-page="field-desk"')
    expect(markup).not.toContain('data-page="home"')
  })
})
