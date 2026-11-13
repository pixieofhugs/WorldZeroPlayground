import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { ApiError } from '../api/apiError'
import { getMe, logout, type CurrentUser } from '../api/auth'
import { dropAllCaches } from '../utils/cacheEpoch'
import { setAlbescentGlimpsed, setAlbescentRevealed } from '../utils/factions'

interface AuthState {
  user: CurrentUser | null
  loading: boolean
  refetch: () => Promise<void>
  /**
   * Adopt a `CurrentUser` a mutation just returned (#1383), skipping `/auth/me`.
   * Only for a WHOLE, freshly-built `CurrentUser`; anything partial uses `refetch`.
   */
  applyUser: (user: CurrentUser) => void
  /** End the session locally too; no `refetch()`, which could only 401 (#1349). */
  signOut: () => Promise<void>
}

/** Exported for tests: under `renderToStaticMarkup` effects never run, so `AuthProvider` can't supply a user. */
export const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  refetch: async () => {},
  applyUser: () => {},
  signOut: async () => {},
})

export const SESSION_HINT_KEY = 'wz_session_hint'

/**
 * Whether the last `/auth/me` on this browser was a session. A HINT, NEVER AN
 * AUTHORITY (#1380): only lets `RootLanding` prefetch the likely chunk; nothing
 * renders off it, so a stale hint costs one unused chunk.
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
    // Storage refused: the hint is optional.
  }
}

/** Sign-out wiring, extracted to be testable without a DOM. */
export function runSignOut(
  endSession: () => Promise<void>,
  forgetViewer: () => void,
): () => Promise<void> {
  return async () => {
    await endSession()
    forgetViewer()
  }
}

/**
 * The `/auth/me` wiring behind `refetch()`. ONLY A 401 MEANS SIGNED OUT (#3134):
 * a network error or 5xx leaves viewer, Albescent flags and hint untouched, so a
 * blip after a save doesn't eject the player. Never rejects; callers await it bare.
 */
export function runSessionProbe(
  whoAmI: () => Promise<CurrentUser>,
  adoptViewer: (me: CurrentUser | null) => void,
  rememberSession: (signedIn: boolean) => void,
  settle: () => void,
): () => Promise<void> {
  return async () => {
    try {
      adoptViewer(await whoAmI())
      rememberSession(true)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        adoptViewer(null)
        rememberSession(false)
      }
    } finally {
      settle()
    }
  }
}

/** Re-read on tab return (#3169): others' votes stale `can_vote` with no client event. */
export function refetchWhenVisible(
  isVisible: () => boolean,
  refetch: () => Promise<void>,
): () => void {
  return () => {
    if (isVisible()) void refetch()
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  /**
   * The ONE place the viewer changes, so the one place the module-level
   * Albescent flags in `utils/factions` are set (#1891, #2770). `null` fails closed.
   */
  const adoptViewer = (me: CurrentUser | null) => {
    setAlbescentRevealed(me?.albescent_revealed ?? false)
    setAlbescentGlimpsed(me?.albescent_glimpsed ?? false)
    setUser(me)
  }

  const fetchUser = runSessionProbe(getMe, adoptViewer, rememberSession, () => setLoading(false))

  // A built `CurrentUser` proves the session is live. Also how joining Albescent reveals it.
  const applyUser = (me: CurrentUser) => {
    adoptViewer(me)
    rememberSession(true)
    setLoading(false)
  }

  const signOut = runSignOut(logout, () => {
    adoptViewer(null)
    rememberSession(false)
    setLoading(false)
    // Caches are viewer-scoped (Albescent visibility), not deploy-scoped (ADR-0072).
    dropAllCaches()
  })

  useEffect(() => {
    void fetchUser()
  }, [])

  // Only for a signed-in viewer: a guest's re-read could only 401.
  const signedIn = user !== null
  useEffect(() => {
    if (!signedIn) return
    const onVisible = refetchWhenVisible(() => document.visibilityState === 'visible', fetchUser)
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [signedIn])

  return (
    <AuthContext.Provider value={{ user, loading, refetch: fetchUser, applyUser, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  return useContext(AuthContext)
}
