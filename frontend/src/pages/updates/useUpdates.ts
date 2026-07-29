import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  dismissAllFeedItems,
  getActivityFeed,
  restoreAllFeedItems,
  type ActivityFeedItem,
  type FeedCounts,
} from '../../api/activityFeed'
import i18n from '../../i18n'
import { extractError } from '../../utils/errors'
import { onRequestsChanged } from '../../utils/requestsBus'

export type FeedFilter =
  | 'All'
  | 'Friends'
  | 'Foes'
  | 'Your Stuff'
  | 'Global'
  | 'Requests'
  | 'Archived'

export const ROW_1_FILTERS: FeedFilter[] = ['All', 'Friends', 'Foes', 'Your Stuff']
export const ROW_2_FILTERS: FeedFilter[] = ['Global', 'Requests', 'Archived']
export const ALL_FILTERS: FeedFilter[] = [...ROW_1_FILTERS, ...ROW_2_FILTERS]

/**
 * The seventh tab (#1194). Archived is a FILTER TAB rather than a stacked section
 * below the feed (epic #1192 decision 8): the design sheet stacks it because a
 * sheet has a fixed height, but a real feed is infinite-scroll and would push the
 * archive permanently below the horizon.
 *
 * It is not a member of the API's filter set. Archived-ness is *state* and
 * `?filter=` is a type-set, so the request is `archived=true` crossed with a
 * filter — and the archive ignores the friend/foe/global slicing entirely, so the
 * filter it crosses with is always `all`.
 */
export const ARCHIVED_FILTER: FeedFilter = 'Archived'

/** Map UI filter name to API filter param. */
export const FILTER_API_MAP: Record<FeedFilter, string> = {
  'All': 'all',
  'Friends': 'friends',
  'Foes': 'foes',
  'Your Stuff': 'your_stuff',
  'Global': 'global',
  'Requests': 'requests',
  // The archive shows everything archived; the type-set is not what selects it.
  'Archived': 'all',
}

/**
 * Deep-link token per tab, kept SEPARATE from the API map. `Archived` and `All`
 * send the same API filter, so resolving `?filter=` through `FILTER_API_MAP`
 * would make `?filter=archived` unreachable and `?filter=all` ambiguous. Every
 * other token is unchanged, so links already in the wild (Sidebar → Requests)
 * keep working.
 */
export const FILTER_URL_MAP: Record<FeedFilter, string> = {
  ...FILTER_API_MAP,
  'Archived': 'archived',
}

/**
 * Map filter name to the key in FeedCounts.
 *
 * Archived has NO count, deliberately (#1193). `FeedCounts` would need a second
 * full 15-query count fan-out on every request to carry one, and the counts are
 * defined to describe the LIVE feed — they stay truthful while the player reads
 * the archive rather than going quiet. `0` here means the tab draws no badge; it
 * does not claim the archive is empty.
 */
export function getCount(filter: FeedFilter, counts: FeedCounts): number {
  switch (filter) {
    case 'All': return counts.all
    case 'Friends': return counts.friends
    case 'Foes': return counts.foes
    case 'Your Stuff': return counts.your_stuff
    case 'Global': return counts.global_count
    case 'Requests': return counts.requests
    case 'Archived': return 0
  }
}

const EMPTY_COUNTS: FeedCounts = {
  all: 0,
  friends: 0,
  foes: 0,
  your_stuff: 0,
  global_count: 0,
  requests: 0,
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
  /** True while the Archived tab is on screen. Drives the restore-shaped
   *  controls, the "still waiting" tag, and which empty state is drawn. */
  archivedView: boolean
  /** Refresh the tab counts WITHOUT touching `items`. Called after a single
   *  archive write: dropping the item would delete the slot its undo strip is
   *  standing in, so the row stays and only the badges catch up. */
  refreshCounts: () => void
  /** Archive everything the current tab shows / empty the whole archive. */
  archiveAll: () => Promise<void>
  restoreAll: () => Promise<void>
  bulkPending: boolean
  bulkError: string | null
}

/**
 * Shared Updates state — the one activity-feed fetch (filter tabs + cursor
 * pagination) consumed by both the desktop page and the mobile stream (#532).
 * Presentation-only split: the mobile branch renders the SAME items through the
 * SAME per-faction chassis, so no data/API change is needed — which is also why
 * the Archived tab reaches the phone for free (#1194).
 */
export function useUpdates(): UpdatesState {
  const [searchParams] = useSearchParams()
  const [items, setItems] = useState<ActivityFeedItem[]>([])
  const [counts, setCounts] = useState<FeedCounts>(EMPTY_COUNTS)
  // Deep-link the initial tab from ?filter=<url token> (e.g. Sidebar → Requests).
  const [filter, setFilter] = useState<FeedFilter>(() => {
    const urlFilter = searchParams.get('filter')
    return ALL_FILTERS.find((name) => FILTER_URL_MAP[name] === urlFilter) ?? 'All'
  })
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const [bulkPending, setBulkPending] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)
  // Bumped when a request is accepted/declined/submitted anywhere, or after a
  // bulk archive; re-runs the load effect so the tab counts (esp. Requests)
  // resolve without a reload.
  const [refreshKey, setRefreshKey] = useState(0)

  const archivedView = filter === ARCHIVED_FILTER

  const fetchFeed = useCallback(async (feedFilter: FeedFilter, cursor?: string) => {
    return getActivityFeed({
      filter: FILTER_API_MAP[feedFilter],
      before: cursor,
      limit: 20,
      archived: feedFilter === ARCHIVED_FILTER,
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

  /**
   * Counts only. Archiving one card must not reload `items`: the card's slot is
   * standing there showing an undo strip, and refetching would pull the item out
   * from under it and jump the list — exactly what the design's
   * strip-in-its-own-slot rule exists to prevent. The badges are worth one small
   * request; the ordering is not worth breaking.
   */
  const refreshCounts = useCallback(() => {
    getActivityFeed({ filter: FILTER_API_MAP[filter], limit: 1 })
      .then((response) => setCounts(response.counts))
      .catch(() => { /* a stale badge is not worth an error surface */ })
  }, [filter])

  /** Archive everything this tab currently shows. The server re-runs the feed
   *  for the same filter, so the scope can never drift from what is on screen. */
  const archiveAll = async () => {
    if (bulkPending) return
    setBulkPending(true)
    setBulkError(null)
    try {
      await dismissAllFeedItems(FILTER_API_MAP[filter])
      setRefreshKey((key) => key + 1)
    } catch (err) {
      setBulkError(extractError(err, i18n.t('feed:archive.error')))
    }
    setBulkPending(false)
  }

  /** Empty the archive. No filter — "Restore all" on the Archived tab means
   *  everything, and the archived view has no tabs of its own. */
  const restoreAll = async () => {
    if (bulkPending) return
    setBulkPending(true)
    setBulkError(null)
    try {
      await restoreAllFeedItems()
      setRefreshKey((key) => key + 1)
    } catch (err) {
      setBulkError(extractError(err, i18n.t('feed:archive.restoreError')))
    }
    setBulkPending(false)
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
    archivedView,
    refreshCounts,
    archiveAll,
    restoreAll,
    bulkPending,
    bulkError,
  }
}
