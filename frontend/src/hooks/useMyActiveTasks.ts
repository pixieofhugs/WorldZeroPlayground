import { useCallback, useEffect, useState } from 'react'
import { listPraxes, type PraxisCardOut } from '../api/praxis'
import { useAuth } from '../auth/AuthContext'

/**
 * Hook to fetch the current character's in-progress praxes.
 *
 * Filters by membership (`member_id`), not authorship, so accepted collab
 * invites appear too — matching the slot count, which also counts memberships.
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
    listPraxes({ member_id: user.character.id, status: 'in_progress' })
      .then((praxes) => setActiveTasks(praxes))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { activeTasks, loading, refetch } as const
}
