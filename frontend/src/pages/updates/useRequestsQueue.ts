import { useCallback, useEffect, useState } from 'react'
import { getActivityFeed, type ActivityFeedItem } from '../../api/activityFeed'
import i18n from '../../i18n'
import { extractError } from '../../utils/errors'
import { onRequestsChanged } from '../../utils/requestsBus'
import { QUEUE_FILTER, QUEUE_LIMIT, queueItems } from './requestsQueueCursor'

export interface RequestsQueueState {
  /** The outstanding obligations, newest first — the feed's own order. */
  items: ActivityFeedItem[]
  loading: boolean
  error: string | null
  /**
   * Refetch. Wired to the chassis's `onArchiveChange`, which the requests bus
   * does NOT cover: archiving goes through `dismissFeedItem` and answers
   * nothing (ADR-0065), so it fires no request-changed event — but the item
   * does leave the live view, and a queue still drawing it would be lying.
   */
  refresh: () => void
}

/**
 * What the Requests queue is holding (#1422).
 *
 * A SECOND read of `/activity-feed`, deliberately: the page's own fetch no
 * longer contains these items at all. ADR-0070 drops the four request types out
 * of the live `all` and `your_stuff` streams, so the queue asks for
 * `?filter=requests` — the wire filter, which still exists; #1421 deleted the
 * TAB, which under ADR-0070 was byte-for-byte this queue's contents.
 *
 * No cursor and no "load older". A pile you are meant to clear is not a river
 * you scroll, and a player holding more than {@link QUEUE_LIMIT} unanswered
 * obligations has a problem pagination will not fix.
 *
 * Split from the component for the same reason `useUpdates` is: this harness is
 * `renderToStaticMarkup` with no effects, so a self-fetching hook cannot be
 * driven from a test and is mocked instead — which then pins what the container
 * DRAWS for a given state. The rules worth asserting live in
 * `./requestsQueue.ts`, with no React around them at all.
 */
export function useRequestsQueue(): RequestsQueueState {
  const [items, setItems] = useState<ActivityFeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Bumped by the requests bus. Every accept, decline, submit, leave and
  // archive in the app fires it from the API layer, so the queue does not need
  // to know which card answered — or even that the answer happened here rather
  // than on a praxis page in another tab of the same session.
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
