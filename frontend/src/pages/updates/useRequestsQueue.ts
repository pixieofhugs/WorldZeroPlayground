import { useCallback, useEffect, useState } from 'react'
import { getActivityFeed, type ActivityFeedItem } from '../../api/activityFeed'
import i18n from '../../i18n'
import { extractError } from '../../utils/errors'
import { onRequestsChanged } from '../../utils/requestsBus'
import { QUEUE_FILTER, QUEUE_LIMIT, queueItems } from './requestsQueueCursor'

export interface RequestsQueueState {
  /** Newest first, the feed's own order. */
  items: ActivityFeedItem[]
  loading: boolean
  error: string | null
  /**
   * Refetch, wired to `onArchiveChange`: archiving answers nothing (ADR-0070)
   * so the requests bus doesn't fire, but the item leaves the live view.
   */
  refresh: () => void
}

/**
 * What the Requests queue holds (#1422): a second `/activity-feed` read with
 * `?filter=requests`, since ADR-0070 drops these from the page's own streams.
 * No pagination. Pure rules live in `./requestsQueueCursor.ts`.
 */
export function useRequestsQueue(): RequestsQueueState {
  const [items, setItems] = useState<ActivityFeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Bumped by the requests bus, fired from the API layer on every answer.
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    getActivityFeed({ filter: QUEUE_FILTER, limit: QUEUE_LIMIT })
      .then((response) => {
        if (cancelled) return
        setItems(queueItems(response.items))
        setError(null)
        setLoading(false)
      })
      .catch((caught) => {
        if (cancelled) return
        setError(extractError(caught, i18n.t('feed:queue.error')))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), [])
  useEffect(() => onRequestsChanged(refresh), [refresh])

  return { items, loading, error, refresh }
}
