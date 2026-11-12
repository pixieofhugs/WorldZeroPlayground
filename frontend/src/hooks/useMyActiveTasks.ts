import { useCallback, useEffect, useState } from 'react'
import { listPraxes, type PraxisCardOut } from '../api/praxis'
import { useAuth } from '../auth/AuthContext'
import { onRequestsChanged } from '../utils/requestsBus'

/**
 * The current character's in-progress praxes, by membership (so accepted collabs
 * count, like the slot count). Keyed on character id, not `user` (#1390); also
 * refetches on `requestsBus` (#1867) for changes that don't move the id.
 */
export function useMyActiveTasks() {
  const { user } = useAuth()
  const characterId = user?.character?.id
  const [activeTasks, setActiveTasks] = useState<PraxisCardOut[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(() => {
    if (characterId == null) {
      setActiveTasks([])
      setLoading(false)
      return
    }
    setLoading(true)
    listPraxes({ member_id: characterId, status: 'in_progress' })
      .then((praxes) => setActiveTasks(praxes))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [characterId])

  useEffect(() => {
    refetch()
    return onRequestsChanged(refetch)
  }, [refetch])

  return { activeTasks, loading, refetch } as const
}
