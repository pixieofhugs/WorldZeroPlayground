import { useCallback, useEffect, useState } from 'react'
import { listPraxes, type PraxisCardOut } from '../api/praxis'
import { useAuth } from '../auth/AuthContext'

/**
 * Hook to fetch the current character's in-progress praxes — anything they're
 * a member of, not just ones they created, so a joined collab draft shows up
 * for every co-owner (ADR-0013).
 * Re-fetches when the authenticated user changes.
 */
export function useMyActiveTasks() {
  const { user } = useAuth()
  const [activeTasks, setActiveTasks] = useState<PraxisCardOut[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(() => {
    if (!user?.character) {
      setActiveTasks([])
      setLoading(false)
      return
    }
    setLoading(true)
    listPraxes({ member_of: user.character.id, status: 'in_progress' })
      .then((praxes) => setActiveTasks(praxes))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { activeTasks, loading, refetch } as const
}
