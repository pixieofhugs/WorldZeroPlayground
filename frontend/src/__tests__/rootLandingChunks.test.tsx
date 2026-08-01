/**
 * `/` must not serialize its chunk download behind `/auth/me` (#1380).
 *
 * WHAT THIS TESTS, AND WHAT IT CANNOT
 * -----------------------------------
 * The harness is `renderToStaticMarkup` — no jsdom, no network, effects never
 * run — so nothing here observes a waterfall. What it *can* observe is the
 * module registry: `vi.mock`'s factory runs the first time a module is
 * imported, so a flag set inside that factory records whether `RootLanding`
 * asked for a page module at all while the session was still resolving.
 *
 * That is the defect exactly. Before the fix neither `import()` was issued
 * until `loading` flipped false — i.e. until `/auth/me` had answered — and the
 * order of requests in a real browser follows from when the import is issued.
 * Whether the two then overlap on the wire is a measurement (`npm run
 * measure`), not a unit test.
 *
 * The other half of the fix is that it warms ONE landing, not both: warming
 * both measured as a ~270ms REGRESSION for signed-in viewers on Slow 4G. So
 * "the other chunk stays untouched" is asserted, not incidental.
 *
 * It does NOT prove "no second round trip": `React.lazy` suspends on its first
 * render even when the module is already in the ES module cache (see the long
 * comment in `factions/lazyArchetype.tsx`), so warmed and cold look identical
 * in markup. `renderResolved` below pays that one microtask deliberately; in
 * the browser it is a microtask too, not a fetch.
 *
 * Last: reordering work around an auth gate is how a signed-out viewer ends up
 * seeing a signed-in surface for a frame. `RootLanding` must render FieldDesk
 * only for a resolved signed-in session, Home only for a resolved signed-out
 * one, and neither while loading — whatever the hint says.
 */
import { Suspense } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'

// Resolves `t('loading')` to real English copy instead of the bare key.
import '../i18n'
import { AuthContext } from '../auth/AuthContext'
import type { CurrentUser } from '../api/auth'
// Static import is safe: `vi.mock` is hoisted above it, so App's page modules
// are already stubbed by the time anything imports them.
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

/** The node test env has no `localStorage`; `hadSessionLastVisit` treats that
 *  as "no hint", which is the guest default. */
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
      <AuthContext.Provider value={{ ...session, refetch: async () => {}, signOut: async () => {} }}>
        {/* Stands in for App's one Suspense boundary. A distinctive fallback so
            "chunk still in flight" is never mistaken for a rendered page. */}
        <Suspense fallback={<div data-page="suspended" />}>
          <RootLanding />
        </Suspense>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0))

/** Markup after `lazy` has travelled Pending → microtask → Resolved. The first
 *  render only attaches to the module promise; the second one renders it. */
async function renderResolved(session: { user: CurrentUser | null; loading: boolean }): Promise<string> {
  renderRoot(session)
  await nextTick()
  return renderRoot(session)
}

// These two run in order on purpose: a module can only be imported for the
// first time once, so each "was NOT imported" assertion has to be made before
// any later test pulls that module in.
describe('the root route warms one landing before the auth answer (#1380)', () => {
  it('warms Home, and only Home, for a browser with no session hint', async () => {
    // First render in the file: nothing else can have imported these two.
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

    // The hint chooses a download, never a surface: `user` is still the only
    // thing that can put FieldDesk on screen.
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
