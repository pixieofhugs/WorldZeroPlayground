import { useEffect, useState } from 'react'
import { getFactionStatus, type FactionOut, type FactionPageOut } from '../../api/factions'
import { useAuth } from '../../auth/AuthContext'
import { useFactions } from '../../hooks/useFactions'
import { isFactionConcealed } from '../../utils/factions'

/**
 * The factions-directory read, shared by both form factors (#1116).
 *
 * `/factions` itself is no longer fetched here: it comes from the app-wide
 * `useFactions` cache (#1284), so arriving from any other surface costs nothing.
 * What this hook still owns is the viewer's per-faction membership status, which
 * is per-character and not cacheable app-wide.
 *
 * The response's `invitations` array is no longer read here. #2310 deleted the
 * "Recent Invitations" panel that was its only consumer on this page, and the
 * request stays exactly as it was: `/factions/status` is fetched for the STATUS
 * MAP, and the letters have ridden along on that same payload since #1384. So
 * there is no dead request to drop — only a field the directory stopped
 * exposing. `pages/factionDetail/useFactionDetail.ts` still reads the letters off
 * its own copy of the response.
 *
 * The desktop grid and the phone directory used to own a private copy of this
 * effect, which made `/factions` the one page dispatcher whose data lived BELOW
 * the form-factor switch: crossing 767px swapped the branch, remounted whichever
 * container was arriving, and fired all three requests again. Hoisting the fetch
 * to the dispatcher means the state outlives the swap and the surfaces below stay
 * presentation-only, which is what ADR-0035 §1 asks of a form-factor axis anyway.
 *
 * The failure is returned raw rather than as a message: the two surfaces phrase
 * their own fallback copy, and a shared hook has no business picking one.
 */
export interface FactionsDirectoryState {
  readonly factions: FactionOut[]
  /** The viewer's per-faction membership status; null while signed out. */
  readonly factionPage: FactionPageOut | null
  readonly loading: boolean
  readonly error: unknown
}

export function useFactionsDirectory(): FactionsDirectoryState {
  const { user } = useAuth()
  const characterId = user?.character?.id ?? null

  // The directory list itself is app-wide cached (#1284) — this page no longer
  // owns the request, it derives from the shared hook.
  const factions = useFactions()
  const [factionPage, setFactionPage] = useState<FactionPageOut | null>(null)
  const [membershipLoading, setMembershipLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    let cancelled = false
    setMembershipLoading(true)
    setError(null)

    const load = async () => {
      if (characterId == null) return
      const statusData = await getFactionStatus()
      if (cancelled) return
      setFactionPage(statusData)
    }

    load()
      .catch((err: unknown) => {
        if (!cancelled) setError(err)
      })
      .finally(() => {
        if (!cancelled) setMembershipLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [characterId])

  return {
    // THE CONCEALED ROW IS DROPPED HERE, once, for both form factors (#2770).
    //
    // `/factions` still serves every faction to every caller — ADR-0082 §5 put
    // the boundary on the client on purpose, and #2770 leaves that follow-on
    // (#2540) open rather than putting auth back on a public read. So the
    // absence is built here, at the one place both directories take their list
    // from: the desktop grid's `visibleFactions`, the phone's `visible`, and
    // the phone's stripe legend all derive from this array, so filtering it
    // drops the tile AND its stripe together. A per-surface filter would have
    // been three, and the stripe would have been the one someone forgot — a
    // gap in the legend is exactly the tell the concealed state exists to
    // avoid.
    factions: (factions ?? []).filter((f) => !isFactionConcealed(f.slug)),
    factionPage,
    // Still one flag, and it still means "nothing to draw yet": the grid needs
    // the faction list, so a settled membership read with `factions` still null
    // is not loaded. Keeping the two apart would flash an empty grid.
    loading: membershipLoading || factions === null,
    error,
  }
}
