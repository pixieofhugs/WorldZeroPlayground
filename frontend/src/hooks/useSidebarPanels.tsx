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
  /** True until the first response lands. Drives the FieldDesk's task skeleton. */
  loading: boolean
  /** Re-read all three panels. One call, so one request — the panels move together. */
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
 * The rail's data, read ONCE for the whole app (#1344).
 *
 * WHY THIS IS A PROVIDER AND NOT A HOOK IN THE RAIL
 * -------------------------------------------------
 * Two reasons, and the first is the point of the issue.
 *
 * 1. It has to fire in the FIRST wave. `ShellContent` only mounts the rail when
 *    `!isMobile && Boolean(user)`, so anything the rail owns is by construction
 *    gated on `/auth/me` resolving — a whole round trip before the request even
 *    leaves. Mounted up here beside `AuthProvider`, the fetch goes out with
 *    `/auth/me` instead of after it. It needs no argument to do that: the route
 *    resolves the viewer from the JWT cookie, so there is nothing to wait for.
 *
 *    The client therefore asks before it knows whether anyone is signed in, and
 *    a guest's answer is 401. `SESSION_PROBES` in `api/sessionRedirect` excludes
 *    this URL from the expired-session redirect for exactly that reason — without it,
 *    every guest opening any deep link would be thrown to `/` by a full document
 *    navigation, from chrome that mounts on every route.
 *
 * 2. It is read from four places — the rail, the collapsed handle's badge, the
 *    mobile header's bell, and the mobile FieldDesk. Those used to be three
 *    separate hooks holding per-instance state with no shared cache, so each
 *    consumer meant another request; the desktop home fired the same two
 *    byte-identical calls twice over. One context above all four is what makes
 *    "one request" true rather than "one request per consumer".
 */
export function SidebarProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [panels, setPanels] = useState<SidebarPanels>(EMPTY_PANELS)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(() => {
    setLoading(true)
    getSidebar()
      // ponytail: a failure empties the panels rather than keeping the last good
      // copy. That is right for the case that actually happens — a 401 after
      // signing out, where stale panels would be someone else's data — and the
      // cost in the case that doesn't is a blank rail until the next refetch.
      // No retry, no stale-while-error: upgrade path is a query cache
      // (react-query), the same one `utils/requestsBus` names.
      .then(setPanels)
      .catch(() => setPanels(EMPTY_PANELS))
      .finally(() => setLoading(false))
  }, [])

  // The first wave: on mount, gated on nothing. Also the subscription that keeps
  // the panels honest after an accept/decline/submit anywhere in the app (#346)
  // — one refetch now refreshes all three, where it used to take two.
  useEffect(() => {
    refetch()
    return onRequestsChanged(refetch)
  }, [refetch])

  /**
   * ...and again whenever the session changes under us.
   *
   * The mount fetch is never *wrong* — the server read the cookie, not our idea
   * of who is signed in — so it must not be repeated when `/auth/me` merely
   * lands. `settledCharacterId` records the life the app settled on the first
   * time auth resolved; only a CHANGE after that is a refetch. Without the
   * guard, every signed-in load would fire this twice and the issue's whole
   * saving would be handed straight back.
   *
   * The settled value is the CHARACTER ID, not the `user` object (#1390). The
   * object is a fresh one on every `refetch()` of `/auth/me`, so an identity
   * comparison never matched and this fired the rail's three-panel read — the
   * widest server fan-out on the page — every time the viewer cast a star.
   * Sign-in, sign-out and a character switch all move the id, which is what
   * "the session changed under us" was always reaching for.
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

/**
 * Read the rail's panels. Free — every caller shares the provider's one fetch,
 * so adding a consumer costs no request.
 *
 * Named for the endpoint (`/me/sidebar`) rather than for the desktop rail: the
 * mobile header's bell and the FieldDesk read the same three panels.
 */
export function useSidebarPanels(): SidebarState {
  return useContext(SidebarContext)
}
