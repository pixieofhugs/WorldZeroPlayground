import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { getSidebar, type SidebarPanels } from '../api/sidebar'
import { useAuth } from '../auth/AuthContext'
import { onRequestsChanged } from '../utils/requestsBus'

const EMPTY_PANELS: SidebarPanels = {
  pending_requests_count: 0,
  global_activity: [],
  global_activity_count: 0,
  active_praxes: [],
}

interface SidebarState extends SidebarPanels {
  loading: boolean
  /** Re-read all three panels in one request. */
  refetch: () => void
}

const SidebarContext = createContext<SidebarState>({
  ...EMPTY_PANELS,
  loading: true,
  refetch: () => {},
})

/** Sentinel for "auth has not resolved even once", distinct from a signed-out `null`. */
const UNSETTLED = Symbol('auth-unsettled')

/**
 * The rail's data, read ONCE for the whole app (#1344). A provider beside
 * `AuthProvider` so the fetch leaves with `/auth/me`, not after it (the route
 * reads the cookie), and so its four consumers share one request.
 *
 * Guests get 401; `SESSION_PROBES` in `api/sessionRedirect` exempts this URL
 * from the expired-session redirect.
 */
export function SidebarProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [panels, setPanels] = useState<SidebarPanels>(EMPTY_PANELS)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(() => {
    setLoading(true)
    getSidebar()
      // ponytail: failure empties the panels (right for a post-sign-out 401), no
      // retry; upgrade: a query cache (react-query), as `utils/requestsBus` names.
      .then(setPanels)
      .catch(() => setPanels(EMPTY_PANELS))
      .finally(() => setLoading(false))
  }, [])

  // On mount, gated on nothing; plus request-change refreshes (#346).
  useEffect(() => {
    refetch()
    return onRequestsChanged(refetch)
  }, [refetch])

  /**
   * Refetch only when the session CHANGES after first settling (the mount fetch
   * already used the cookie). Compare the character id, not `user`: that object
   * is new on every `/auth/me` refetch (#1390).
   */
  const settledCharacterId = useRef<unknown>(UNSETTLED)
  const characterId = user?.character?.id
  useEffect(() => {
    if (authLoading) return
    if (settledCharacterId.current === characterId) return
    const first = settledCharacterId.current === UNSETTLED
    settledCharacterId.current = characterId
    if (!first) refetch()
  }, [authLoading, characterId, refetch])

  return (
    <SidebarContext.Provider value={{ ...panels, loading, refetch }}>
      {children}
    </SidebarContext.Provider>
  )
}

/** Shares the provider's one fetch; named for `/me/sidebar`, not the desktop rail. */
export function useSidebarPanels(): SidebarState {
  return useContext(SidebarContext)
}
