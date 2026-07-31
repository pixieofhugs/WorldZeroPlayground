import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getMe, type CurrentUser } from '../api/auth'

interface AuthState {
  user: CurrentUser | null
  loading: boolean
  refetch: () => Promise<void>
}

/** Exported for tests only: the harness is `renderToStaticMarkup`, so a
 *  component that reads the signed-in character has no other way to be given
 *  one — `AuthProvider` fetches, and effects never run there. */
export const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  refetch: async () => {},
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

  useEffect(() => {
    void fetchUser()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, refetch: fetchUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  return useContext(AuthContext)
}
