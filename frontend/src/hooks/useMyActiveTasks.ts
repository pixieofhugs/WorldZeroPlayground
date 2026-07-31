import { useCallback, useEffect, useState } from 'react'
import { listPraxes, type PraxisCardOut } from '../api/praxis'
import { useAuth } from '../auth/AuthContext'

/**
 * Hook to fetch the current character's in-progress praxes.
 *
 * Filters by membership (`member_id`), not authorship, so accepted collab
 * invites appear too — matching the slot count, which also counts memberships.
 *
 * Re-fetches when the CHARACTER changes, not when the auth object does (#1390).
 * `/auth/me` mints a fresh `CurrentUser` on every `refetch()` — a faction join,
 * a character switch, a sign-out, a praxis submit — so no memo upstream can make
 * that object stable. The character id is the only thing this request is
 * actually keyed on, and it survives all of them.
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
  }, [refetch])

  return { activeTasks, loading, refetch } as const
}
