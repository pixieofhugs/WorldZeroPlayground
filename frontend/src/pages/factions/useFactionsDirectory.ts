import { useEffect, useState } from 'react'
import {
  getFactions,
  getFactionStatus,
  getInvitations,
  type FactionOut,
  type FactionPageOut,
  type InvitationLetterOut,
} from '../../api/factions'
import { useAuth } from '../../auth/AuthContext'

/**
 * The `/factions` directory fetch, shared by both form factors (#1116).
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
  readonly invitations: InvitationLetterOut[]
  readonly loading: boolean
  readonly error: unknown
}

export function useFactionsDirectory(): FactionsDirectoryState {
  const { user } = useAuth()
  const characterId = user?.character?.id ?? null

  const [factions, setFactions] = useState<FactionOut[]>([])
  const [factionPage, setFactionPage] = useState<FactionPageOut | null>(null)
  const [invitations, setInvitations] = useState<InvitationLetterOut[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const load = async () => {
      const factionsData = await getFactions()
      if (cancelled) return
      setFactions(factionsData)
      if (characterId == null) return
      // The invitations feed backs the letters PANEL only — never card state.
      const [statusData, invitesData] = await Promise.all([getFactionStatus(), getInvitations()])
      if (cancelled) return
      setFactionPage(statusData)
      setInvitations(invitesData)
    }

    load()
      .catch((err: unknown) => {
        if (!cancelled) setError(err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [characterId])

  return { factions, factionPage, invitations, loading, error }
}
