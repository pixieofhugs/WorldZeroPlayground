import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getMe, logout, type CurrentUser } from '../api/auth'
import { dropAllCaches } from '../utils/cacheEpoch'

interface AuthState {
  user: CurrentUser | null
  loading: boolean
  refetch: () => Promise<void>
  /**
   * Adopt a `CurrentUser` a mutation just handed back, with no `/auth/me` trip.
   *
   * The same move as `signOut` (#1349), pointed the other way: when the client
   * has *caused* the new state and the server has already answered with it,
   * re-asking is a round trip for a value we are already holding.
   * `POST /factions/choose` and `POST /me/active-character` both answer the
   * refreshed `CurrentUser` (#1383) — every caller used to discard it and
   * `refetch()`.
   *
   * Only for a WHOLE, freshly-built `CurrentUser`. Anything partial belongs on
   * `refetch`, or the context starts drifting from what `/auth/me` would say.
   */
  applyUser: (user: CurrentUser) => void
  /**
   * End the session and drop the app to its logged-out state.
   *
   * Exists so that signing out does not have to `logout()` and then `refetch()`
   * (#1349). That second call was a request whose answer the client already
   * held: the cookie is gone, so `/auth/me` can only 401, and `/auth/me` is a
   * `SESSION_PROBE` (`api/sessionRedirect.ts`) precisely so that 401 is
   * swallowed. It cost a round trip to reach the `user = null` the caller had
   * already caused.
   */
  signOut: () => Promise<void>
}

/** Exported for tests only: the harness is `renderToStaticMarkup`, so a
 *  component that reads the signed-in character has no other way to be given
 *  one — `AuthProvider` fetches, and effects never run there. */
export const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  refetch: async () => {},
  applyUser: () => {},
  signOut: async () => {},
})

const SESSION_HINT_KEY = 'wz_session_hint'

/**
 * Whether the last answer from `/auth/me` on this browser was a session.
 *
 * A HINT, NEVER AN AUTHORITY (#1380). The JWT is an httpOnly cookie, so nothing
 * on the client can know synchronously whether anyone is signed in — and this
 * does not try to. It exists so `RootLanding` can start downloading the *likely*
 * `/` landing chunk while `/auth/me` is still in flight instead of downloading
 * both and making them compete for the link. Nothing renders off it: what the
 * viewer is shown still waits for the real answer, so a stale hint costs one
 * unused chunk (which is what the wait cost anyway), never a leaked surface.
 */
export function hadSessionLastVisit(): boolean {
  try {
    return localStorage.getItem(SESSION_HINT_KEY) === 'true'
  } catch {
    return false
  }
}

function rememberSession(signedIn: boolean): void {
  try {
    localStorage.setItem(SESSION_HINT_KEY, String(signedIn))
  } catch {
    // Storage refused (private mode, quota): the hint is optional, and being
    // wrong about it only costs the pre-fix chunk ordering.
  }
}

/**
 * The sign-out wiring, extracted so it is unit-testable in a DOM-less env
 * (`renderToStaticMarkup`, no jsdom — effects never run, so the provider's own
 * closure is unreachable from a test). Lives here rather than beside a page
 * because both sign-out buttons — the desktop NavBar and the mobile Settings
 * surface — route through the one context method.
 */
export function runSignOut(
  endSession: () => Promise<void>,
  forgetViewer: () => void,
): () => Promise<void> {
  return async () => {
    await endSession()
    forgetViewer()
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = async () => {
    try {
      const me = await getMe()
      setUser(me)
      rememberSession(true)
    } catch {
      setUser(null)
      // Covers sign-out and expiry too: both land here via `refetch`.
      rememberSession(false)
    } finally {
      setLoading(false)
    }
  }

  // See `AuthState.applyUser`. `rememberSession(true)` because being handed a
  // built `CurrentUser` is itself proof the session is live — the same fact
  // `fetchUser` records on a successful `/auth/me`.
  const applyUser = (me: CurrentUser) => {
    setUser(me)
    rememberSession(true)
    setLoading(false)
  }

  // No `/auth/me` follow-up: ending the session IS the new state, and the
  // provider owns both halves of it — see `AuthState.signOut`.
  const signOut = runSignOut(logout, () => {
    setUser(null)
    rememberSession(false)
    setLoading(false)
    // Deploy-scoped is not viewer-scoped: `/factions` hides Albescent from an
    // account that has not been revealed to it, and a session-lifetime cache
    // would hand the departing viewer's directory to whoever signs in next in
    // this tab (ADR-0072).
    dropAllCaches()
  })

  useEffect(() => {
    void fetchUser()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, refetch: fetchUser, applyUser, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  return useContext(AuthContext)
}
