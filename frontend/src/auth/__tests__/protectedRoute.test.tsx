/**
 * A protected route warms its chunk before `/auth/me` answers (#1483) yet
 * renders children only for a resolved, entitled session. Seams: a spy on the
 * `warm` loader, and a source scan of `App.tsx` pairing each guard's `warm`
 * with its child's `lazy()` loader.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, afterEach } from 'vitest'

// Resolves `t('loading')` to real English copy instead of the bare key.
import '../../i18n'
import { AuthContext } from '../AuthContext'
import ProtectedRoute, { guardRedirect } from '../ProtectedRoute'
import type { CurrentUser } from '../../api/auth'

// `Navigate` acts in an effect (never runs here); render its target instead.
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  Navigate: ({ to, replace }: { to: string; replace?: boolean }) => (
    <div data-redirect={to} data-replace={String(replace ?? false)} />
  ),
}))

const PAGE = <div data-page="protected" />

/** Level and admin kept independent so a level-gated admin check is catchable (#1488). */
const signedIn = (level: number, isAdmin = false): CurrentUser =>
  ({ account_id: 1, is_admin: isAdmin, character: { level } } as unknown as CurrentUser)

/** Node has no `localStorage`, which reads as "no hint". */
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
    <MemoryRouter>
      <AuthContext.Provider value={{ ...session, refetch: async () => {}, applyUser: () => {}, signOut: async () => {} }}>
        <ProtectedRoute warm={warm} adminOnly={adminOnly}>
          {PAGE}
        </ProtectedRoute>
      </AuthContext.Provider>
    </MemoryRouter>,
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
    const warm = vi.fn(async () => {})

    renderGuard({ user: null, loading: true }, { warm })

    expect(warm).not.toHaveBeenCalled()
  })

  it('warms an adminOnly route on the same terms', () => {
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

  it('redirects a non-admin away from an adminOnly route at any character level', () => {
    const markup = renderGuard({ user: signedIn(7), loading: false }, { adminOnly: true })

    expect(markup).toContain('data-redirect="/"')
    expect(markup).not.toContain('data-page="protected"')
  })

  it('renders its children for a resolved signed-in viewer', () => {
    const markup = renderGuard({ user: signedIn(0), loading: false })

    expect(markup).toContain('data-page="protected"')
  })

  it('renders its children on an adminOnly route for an admin', () => {
    const markup = renderGuard({ user: signedIn(3, true), loading: false }, { adminOnly: true })

    expect(markup).toContain('data-page="protected"')
    expect(markup).not.toContain('data-redirect')
  })

  it('renders its children on an adminOnly route for an admin at character level 0', () => {
    const markup = renderGuard({ user: signedIn(0, true), loading: false }, { adminOnly: true })

    expect(markup).toContain('data-page="protected"')
    expect(markup).not.toContain('data-redirect')
  })
})

/** #3099. Seam: `guardRedirect` — the ref it feeds needs two renders, which static markup can't give. */
describe('a protected route tells a lost session from a guest (#3099)', () => {
  const viewer = signedIn(0)

  it('sends a viewer whose session ended on this page to the plain landing', () => {
    expect(guardRedirect(true, null, false)).toBe('/')
  })

  it('sends a guest who never had a session here to the login prompt', () => {
    expect(guardRedirect(false, null, false)).toBe('/?login=required')
  })

  it('redirects nobody who has a session', () => {
    expect(guardRedirect(true, viewer, false)).toBeNull()
    expect(guardRedirect(false, viewer, false)).toBeNull()
  })

  it('redirects nobody while the session is still resolving', () => {
    expect(guardRedirect(true, null, true)).toBeNull()
    expect(guardRedirect(false, null, true)).toBeNull()
  })

  it('replaces the entry, so Back does not return to the page and raise the notice', () => {
    const markup = renderGuard({ user: null, loading: false })

    expect(markup).toContain('data-redirect="/?login=required"')
    expect(markup).toContain('data-replace="true"')
  })

  it('renders no redirect while loading', () => {
    expect(renderGuard({ user: null, loading: true })).not.toContain('data-redirect')
  })
})

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
    // Guards the scan: a multi-line route would silently drop out.
    expect(guards).toHaveLength(source.split('<ProtectedRoute').length - 1)
    expect(guards.length).toBeGreaterThan(0)
  })

  it.each(guards)('$child warms its own loader', ({ child, warm }) => {
    expect(loaderByComponent.get(child), `${child} is not a lazy(loader) page`).toBeDefined()
    expect(warm).toBe(loaderByComponent.get(child))
  })
})
