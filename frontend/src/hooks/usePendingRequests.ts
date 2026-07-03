import { useCallback, useEffect, useState } from 'react'
import { getActivityFeed, type ActivityFeedItem } from '../api/activityFeed'
import { useAuth } from '../auth/AuthContext'

/**
 * Hook to fetch pending collab invites and duel challenges.
 * Re-fetches when the authenticated user changes; `refetch` lets callers
 * refresh after responding to a request (#346).
 */
export function usePendingRequests() {
  const { user } = useAuth()
  const [pendingRequests, setPendingRequests] = useState<ActivityFeedItem[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(() => {
    if (!user) {
      setPendingRequests([])
      setLoading(false)
      return
    }
    setLoading(true)
    getActivityFeed({ filter: 'requests', limit: 5 })
      .then((response) => setPendingRequests(response.items))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { pendingRequests, loading, refetch } as const
}
