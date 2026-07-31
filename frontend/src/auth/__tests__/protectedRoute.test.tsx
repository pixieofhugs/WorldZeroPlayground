/**
 * A protected route must not serialize its chunk download behind `/auth/me`
 * (#1483) — and must still show nobody a page they are not entitled to.
 *
 * WHAT THIS TESTS, AND WHAT IT CANNOT
 * -----------------------------------
 * The harness is `renderToStaticMarkup` — no jsdom, no network, effects never
 * run — so nothing here observes a waterfall. Two seams are available and both
 * are used:
 *
 * 1. THE LOADER CALL. `ProtectedRoute` is handed the loader for its child's
 *    chunk, so a spy records whether the guard *asked for* that chunk while
 *    the session was still resolving. That is the defect exactly: before the
 *    fix the guard returned the loading surface instead of children, so no
 *    lazy element mounted and no `import()` was issued until `/auth/me`
 *    answered. Whether the two then overlap on the wire is a measurement, not
 *    a unit test.
 *
 * 2. THE PAIRING. A spy cannot tell that `/updates` warms *Updates*. `App.tsx`
 *    is scanned as source so every `<ProtectedRoute warm={…}>` is checked
 *    against the loader its child was `lazy()`-built from. A copy-pasted route
 *    that warms the wrong chunk is otherwise silent: harmless, and useless.
 *
 * Neither proves "no second round trip": `React.lazy` suspends on its first
 * render even when the module is already in the ES module cache (see
 * `factions/lazyArchetype.tsx`), so warmed and cold look identical in markup.
 *
 * Last, and the thing worth breaking the build over: reordering work around an
 * auth gate is how a signed-out viewer ends up seeing a signed-in surface for
 * a frame. The guard must render its children only for a *resolved* session
 * that passes every check — never while loading, whatever the hint says. The
 * hint chooses a download, never a surface.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi, afterEach } from 'vitest'

// Resolves `t('loading')` to real English copy instead of the bare key.
import '../../i18n'
import { AuthContext } from '../AuthContext'
import ProtectedRoute from '../ProtectedRoute'
import type { CurrentUser } from '../../api/auth'

// `Navigate` redirects from an effect, which never runs here — it would render
// as nothing and a redirect would be indistinguishable from a blank page. This
// makes the destination observable in markup; everything else is the real thing.
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  Navigate: ({ to }: { to: string }) => <div data-redirect={to} />,
}))

const PAGE = <div data-page="protected" />

const signedIn = (level: number): CurrentUser =>
  ({ account_id: 1, is_admin: level >= 1, character: { level } } as unknown as CurrentUser)

/** The node test env has no `localStorage`; `hadSessionLastVisit` treats that
 *  as "no hint", which is the guest default. */
function withSessionHint(hint: string | null): void {
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => (key === 'wz_session_hint' ? hint : null),
    setItem: () => {},
    removeItem: () => {},
  })
}

function renderGuard(
  session: { user: CurrentUser | null; loading: boolean },
  props: { warm?: () => Promise<unknown>; adminOnly?: boolean } = {},
): string {
  const { warm = async () => {}, adminOnly = false } = props
  return renderToStaticMarkup(
    <AuthContext.Provider value={{ ...session, refetch: async () => {} }}>
      <ProtectedRoute warm={warm} adminOnly={adminOnly}>
        {PAGE}
      </ProtectedRoute>
    </AuthContext.Provider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('a protected route asks for its chunk before the auth answer (#1483)', () => {
  it('warms the child chunk while the session is still resolving', () => {
    withSessionHint('true')
    const warm = vi.fn(async () => {})

    renderGuard({ user: null, loading: true }, { warm })

    expect(warm).toHaveBeenCalledOnce()
  })

  it('leaves the chunk alone for a browser with no session hint', () => {
    // That viewer is about to be bounced to `/?login=required`, where `/`
    // warms its own landing. A chunk they will never render would only
    // compete with the one they will.
    const warm = vi.fn(async () => {})

    renderGuard({ user: null, loading: true }, { warm })

    expect(warm).not.toHaveBeenCalled()
  })

  it('warms an adminOnly route on the same terms', () => {
    // Deliberate: the admin nav link is hidden from non-admins, so a non-admin
    // here typed the URL and pays one unused chunk on a rare load. The
    // alternative charges every real admin the full serialization.
    withSessionHint('true')
    const warm = vi.fn(async () => {})

    renderGuard({ user: null, loading: true }, { warm, adminOnly: true })

    expect(warm).toHaveBeenCalledOnce()
  })
})

describe('a protected route shows no surface it should not', () => {
  it('renders the loading surface, not its children, while the session is unresolved', () => {
    const markup = renderGuard({ user: null, loading: true })

    expect(markup).not.toContain('data-page="protected"')
    expect(markup).toContain('Loading')
  })

  it('renders the loading surface even when the hint claims a session', () => {
    withSessionHint('true')

    const markup = renderGuard({ user: null, loading: true })

    // `user` is still the only thing that can put the page on screen.
    expect(markup).not.toContain('data-page="protected"')
    expect(markup).toContain('Loading')
  })

  it('redirects a resolved signed-out viewer to the login prompt, hint or no hint', () => {
    withSessionHint('true')

    const markup = renderGuard({ user: null, loading: false })

    expect(markup).toContain('data-redirect="/?login=required"')
    expect(markup).not.toContain('data-page="protected"')
  })

  it('redirects a non-admin away from an adminOnly route', () => {
    const markup = renderGuard({ user: signedIn(0), loading: false }, { adminOnly: true })

    expect(markup).toContain('data-redirect="/"')
    expect(markup).not.toContain('data-page="protected"')
  })

  it('renders its children for a resolved signed-in viewer', () => {
    const markup = renderGuard({ user: signedIn(0), loading: false })

    expect(markup).toContain('data-page="protected"')
  })

  it('renders its children on an adminOnly route for a viewer who passes the gate', () => {
    const markup = renderGuard({ user: signedIn(1), loading: false }, { adminOnly: true })

    expect(markup).toContain('data-page="protected"')
    expect(markup).not.toContain('data-redirect')
  })
})

/**
 * Seam 2. Reading `App.tsx` as text is the only way to check the pairing: the
 * route elements are not exported, and rendering `App` would pull the whole
 * chrome in to learn one fact about seven attributes.
 */
describe('every protected route warms the chunk it renders', () => {
  const source = readFileSync(fileURLToPath(new URL('../../App.tsx', import.meta.url)), 'utf8')

  /** `const Updates = lazy(importUpdates)` → `Updates` → `importUpdates`. */
  const loaderByComponent = new Map(
    [...source.matchAll(/const (\w+) = lazy\((\w+)\)/g)].map(([, component, loader]) => [
      component,
      loader,
    ]),
  )

  /** `<ProtectedRoute … warm={importUpdates}> <Updates />` */
  const guards = [...source.matchAll(/<ProtectedRoute\b([^>]*)>\s*<(\w+)\s*\/>/g)].map(
    ([, attributes, child]) => ({
      child,
      warm: /warm=\{(\w+)\}/.exec(attributes)?.[1],
    }),
  )

  it('finds every guard in App.tsx', () => {
    // Guards the scan itself: a route written across more lines than the
    // pattern expects would silently drop out of the checks below.
    expect(guards).toHaveLength(source.split('<ProtectedRoute').length - 1)
    expect(guards.length).toBeGreaterThan(0)
  })

  it.each(guards)('$child warms its own loader', ({ child, warm }) => {
    expect(loaderByComponent.get(child), `${child} is not a lazy(loader) page`).toBeDefined()
    expect(warm).toBe(loaderByComponent.get(child))
  })
})
