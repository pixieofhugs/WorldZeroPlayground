import { useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth, hadSessionLastVisit } from './AuthContext'
import type { CurrentUser } from '../api/auth'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  /**
   * Loader for `children`'s lazy chunk (`App`'s `importX`). Required so no route forgets it.
   * ponytail: pairing held by a source scan in `protectedRoute.test.tsx`, not types;
   * upgrade is a `page` prop carrying the lazy component + loader.
   */
  warm: () => Promise<unknown>
  adminOnly?: boolean
}

/**
 * Redirect target for a sessionless guard, or `null`. `hadUser`: THIS guard once
 * rendered a viewer, so the session ended here — plain landing, matching
 * `api/sessionRedirect.ts` (#3099). Otherwise a guest gets the login notice.
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
  // Decided here, not by the caller navigating first: that navigation is a
  // transition onto a lazy chunk and can still be pending when the session drops.
  const hadUser = useRef(false)
  if (user) hadUser.current = true
  const redirect = guardRedirect(hadUser.current, user, loading)
  const { t } = useTranslation('common')

  if (loading) {
    // Warm the chunk in parallel with `/auth/me` (#1483). Gated on the hint so a
    // guest about to bounce doesn't download it (docs/agents/load-time.md).
    // `adminOnly` warms too: only admins see the link. The hint picks a download,
    // never a surface — only `user` renders the page.
    if (hadSessionLastVisit()) void warm()
    return <div className="page font-body text-muted">{t('loading')}</div>
  }

  if (redirect) return <Navigate to={redirect} replace />
  // Unreachable; narrows the type.
  if (!user) return null

  // `is_admin`, never `character.level`: level is a stat, not a permission (#1488).
  if (adminOnly && !user.is_admin) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
