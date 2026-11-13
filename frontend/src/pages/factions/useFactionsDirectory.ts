import { useEffect, useState } from 'react'
import { getFactionStatus, type FactionOut, type FactionPageOut } from '../../api/factions'
import { useAuth } from '../../auth/AuthContext'
import { useFactions } from '../../hooks/useFactions'
import { isFactionConcealed } from '../../utils/factions'

/**
 * The factions-directory read, shared by both form factors and run in the
 * dispatcher so state survives a form-factor swap (#1116, ADR-0035 §1).
 * The list comes from the `useFactions` cache (#1284); this owns only the
 * per-character status. The error is raw: each surface phrases its own copy.
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
    // The concealed row is dropped once here (#2770, ADR-0082 §5), so the
    // tile and its stripe vanish together on every surface.
    factions: (factions ?? []).filter((f) => !isFactionConcealed(f.slug)),
    factionPage,
    // One flag: separating them would flash an empty grid.
    loading: membershipLoading || factions === null,
    error,
  }
}
