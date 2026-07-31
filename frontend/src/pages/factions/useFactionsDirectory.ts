import { useEffect, useState } from 'react'
import {
  getFactionStatus,
  type FactionOut,
  type FactionPageOut,
  type InvitationLetterOut,
} from '../../api/factions'
import { useAuth } from '../../auth/AuthContext'
import { useFactions } from '../../hooks/useFactions'

/**
 * The factions-directory read, shared by both form factors (#1116).
 *
 * `/factions` itself is no longer fetched here: it comes from the app-wide
 * `useFactions` cache (#1284), so arriving from any other surface costs nothing.
 * What this hook still owns is the viewer's membership status + invitations,
 * which are per-character and not cacheable app-wide. Those two arrive together
 * on `/factions/status` (#1384) — the letters ride on the same payload as the
 * status map they were derived from, so this is one request, not two.
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
/** Stable identity for the signed-out / not-yet-loaded case. */
const NO_INVITATIONS: InvitationLetterOut[] = []

export interface FactionsDirectoryState {
  readonly factions: FactionOut[]
  /** The viewer's per-faction membership status; null while signed out. */
  readonly factionPage: FactionPageOut | null
  readonly invitations: InvitationLetterOut[]
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
      // The invitations feed backs the letters PANEL only — never card state.
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
    factions: factions ?? [],
    factionPage,
    invitations: factionPage?.invitations ?? NO_INVITATIONS,
    // Still one flag, and it still means "nothing to draw yet": the grid needs
    // the faction list, so a settled membership read with `factions` still null
    // is not loaded. Keeping the two apart would flash an empty grid.
    loading: membershipLoading || factions === null,
    error,
  }
}
