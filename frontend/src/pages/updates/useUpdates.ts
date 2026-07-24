import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getActivityFeed, type ActivityFeedItem, type FeedCounts } from '../../api/activityFeed'
import { extractError } from '../../utils/errors'
import { onRequestsChanged } from '../../utils/requestsBus'

export type FeedFilter = 'All' | 'Friends' | 'Foes' | 'Your Stuff' | 'Global' | 'Requests'

export const ROW_1_FILTERS: FeedFilter[] = ['All', 'Friends', 'Foes', 'Your Stuff']
export const ROW_2_FILTERS: FeedFilter[] = ['Global', 'Requests']
export const ALL_FILTERS: FeedFilter[] = [...ROW_1_FILTERS, ...ROW_2_FILTERS]

/** Map UI filter name to API filter param. */
export const FILTER_API_MAP: Record<FeedFilter, string> = {
  'All': 'all',
  'Friends': 'friends',
  'Foes': 'foes',
  'Your Stuff': 'your_stuff',
  'Global': 'global',
  'Requests': 'requests',
}

/** Map filter name to the key in FeedCounts. */
export function getCount(filter: FeedFilter, counts: FeedCounts): number {
  switch (filter) {
    case 'All': return counts.all
    case 'Friends': return counts.friends
    case 'Foes': return counts.foes
    case 'Your Stuff': return counts.your_stuff
    case 'Global': return counts.global_count
    case 'Requests': return counts.requests
  }
}

export interface UpdatesState {
  items: ActivityFeedItem[]
  counts: FeedCounts
  filter: FeedFilter
  setFilter: (filter: FeedFilter) => void
  loading: boolean
  loadingMore: boolean
  nextCursor: string | null
  fetchError: string | null
  loadMoreError: string | null
  loadMore: () => Promise<void>
}

/**
 * Shared Updates state — the one activity-feed fetch (filter tabs + cursor
 * pagination) consumed by both the desktop page and the mobile stream (#532).
 * Presentation-only split: the mobile branch renders the SAME items through the
 * SAME per-faction FeedCardRouter frames, so no data/API change is needed.
 */
export function useUpdates(): UpdatesState {
  const [searchParams] = useSearchParams()
  const [items, setItems] = useState<ActivityFeedItem[]>([])
  const [counts, setCounts] = useState<FeedCounts>({ all: 0, friends: 0, foes: 0, your_stuff: 0, global_count: 0, requests: 0 })
  // Deep-link the initial tab from ?filter=<api value> (e.g. Sidebar → Requests).
  const [filter, setFilter] = useState<FeedFilter>(() => {
    const apiFilter = searchParams.get('filter')
    return ALL_FILTERS.find((name) => FILTER_API_MAP[name] === apiFilter) ?? 'All'
  })
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  // Bumped when a request is accepted/declined/submitted anywhere; re-runs the
  // load effect so the tab counts (esp. Requests) resolve without a reload.
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchFeed = useCallback(async (feedFilter: FeedFilter, cursor?: string) => {
    return getActivityFeed({
      filter: FILTER_API_MAP[feedFilter],
      before: cursor,
      limit: 20,
    })
  }, [])

  // Initial load + filter changes
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFetchError(null)
    setLoadMoreError(null)
    fetchFeed(filter).then((response) => {
      if (cancelled) return
      setItems(response.items)
      setCounts(response.counts)
      setNextCursor(response.next_cursor)
      setLoading(false)
    }).catch((err) => {
      if (cancelled) return
      setFetchError(extractError(err, "Couldn't load the activity feed."))
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [filter, fetchFeed, refreshKey])

  // Refresh the current filter (items + counts) after any accept/decline/submit.
  useEffect(() => onRequestsChanged(() => setRefreshKey((key) => key + 1)), [])

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    setLoadMoreError(null)
    try {
      const response = await fetchFeed(filter, nextCursor)
      setItems((prev) => [...prev, ...response.items])
      setNextCursor(response.next_cursor)
    } catch (err) {
      setLoadMoreError(extractError(err, "Couldn't load more updates."))
    }
    setLoadingMore(false)
  }

  return {
    items,
    counts,
    filter,
    setFilter,
    loading,
    loadingMore,
    nextCursor,
    fetchError,
    loadMoreError,
    loadMore,
  }
}
