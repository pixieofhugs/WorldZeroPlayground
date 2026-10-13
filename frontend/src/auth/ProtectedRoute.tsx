import { useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth, hadSessionLastVisit } from './AuthContext'
import type { CurrentUser } from '../api/auth'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  /**
   * The loader for `children`'s lazy chunk — `App`'s `importX` for the very
   * page it wraps. Required so a new protected route cannot forget it.
   *
   * ponytail: the pairing is a convention, held by a source scan in
   * `__tests__/protectedRoute.test.tsx` rather than by the types. The upgrade,
   * if a wrong warm ever ships, is a `page` prop holding the lazy component
   * with its loader attached, which makes a mismatch unrepresentable — at the
   * cost of `ProtectedRoute` no longer wrapping arbitrary children.
   */
  warm: () => Promise<unknown>
  adminOnly?: boolean
}

/**
 * Where a guard with no session sends its viewer, or `null` when it sends
 * them nowhere (a session exists, or the answer is still loading).
 *
 * `hadUser` is whether THIS mounted guard has ever rendered a viewer. If it
 * has, the session ended while they sat on the page — they signed out, or it
 * expired — and they get the plain landing, which is also where the 401 path
 * (`api/sessionRedirect.ts`) sends an expired session (#3099). If it never
 * has, this is a guest who opened a protected URL, and the notice is for them.
 *
 * Exported for tests only: a ref means nothing in one static render, so the
 * decision it feeds is pure and tested as such.
 */
export function guardRedirect(
  hadUser: boolean,
  user: CurrentUser | null,
  loading: boolean,
): '/' | '/?login=required' | null {
  if (loading || user) return null
  return hadUser ? '/' : '/?login=required'
}

export default function ProtectedRoute({ children, warm, adminOnly = false }: Props) {
  const { user, loading } = useAuth()
  // Decided here, not by navigating before the sign-out in the caller:
  // `BrowserRouter` commits a location inside `startTransition` and `/` is a
  // lazy chunk, so that navigation can still be pending when the session drops
  // and this guard — still mounted — answers anyway. Once the viewer is on `/`
  // the guard is unmounted, so a later guest visit starts with a fresh ref.
  const hadUser = useRef(false)
  if (user) hadUser.current = true
  const redirect = guardRedirect(hadUser.current, user, loading)
  const { t } = useTranslation('common')

  if (loading) {
    // WHETHER the page renders needs the auth answer; downloading its chunk
    // does not. Rendering the loading surface *instead of* children meant no
    // lazy element ever mounted, so the chunk was not requested until
    // `/auth/me` answered and the two costs added instead of overlapping
    // (#1483, generalising #1380). `import()` is memoised by the module
    // registry, so this warm and the render that follows share one request.
    //
    // Gated on the stored hint for the same reason `/` is: a signed-out
    // visitor is about to be bounced to `/`, and a chunk they will never
    // render would arrive on the same link as the one they will —
    // "preloading can make things much worse" (docs/agents/load-time.md).
    // A wrong hint costs one unused chunk, which is what the wait cost anyway.
    //
    // `adminOnly` is warmed on the same terms deliberately: the admin nav link
    // is hidden from non-admins, so a non-admin here has typed the URL, and
    // that rare load pays one unused chunk. Skipping it would instead charge
    // every real admin the full serialization this issue exists to remove.
    //
    // The hint chooses a download, never a surface: `user` below is still the
    // only thing that can put a protected page on screen.
    if (hadSessionLastVisit()) void warm()
    return <div className="page font-body text-muted">{t('loading')}</div>
  }

  if (redirect) return <Navigate to={redirect} replace />
  // Unreachable — `guardRedirect` answers for every resolved guest — and here
  // only so the types know `user` is set below.
  if (!user) return null

  // `is_admin`, never `character.level`: level is a game stat and admin is a
  // permission, and reading the stat was wrong both ways — it admitted every
  // levelled player and turned away an admin whose life had not scored (#1488).
  // `CurrentUser`'s server-computed flags are the whole permission surface.
  if (adminOnly && !user.is_admin) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
