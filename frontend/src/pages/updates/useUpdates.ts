import { useCallback, useEffect, useState } from 'react'
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
import {
  clearedUpdatesParams,
  nextUpdatesParams,
  readUpdatesFilters,
  toFeedQuery,
  UPDATES_NAV_OPTIONS,
  type UpdatesFilters,
} from './updatesFilters'

/** How many rows a page fetches; "load older" grows the window by this step. */
const PAGE_LIMIT = 20

const EMPTY_COUNTS: FeedCounts = {
  all: 0,
  friends: 0,
  foes: 0,
  your_stuff: 0,
  global_count: 0,
  requests: 0,
  by_type: {},
}

export interface UpdatesState {
  items: ActivityFeedItem[]
  counts: FeedCounts
  /** Read from the URL, never mirrored in `useState`. */
  filters: UpdatesFilters
  /** Writes the URL; the URL drives the fetch. */
  setFilters: (patch: Partial<UpdatesFilters>) => void
  clearFilters: () => void
  loading: boolean
  loadingMore: boolean
  nextCursor: string | null
  fetchError: string | null
  loadMoreError: string | null
  loadMore: () => Promise<void>
  archivedView: boolean
  /** Counts only, after a single archive: the row's slot holds its undo strip. */
  refreshCounts: () => void
  archiveAll: () => Promise<void>
  restoreAll: () => Promise<void>
  bulkPending: boolean
  bulkError: string | null
  /**
   * "Archive all" is withheld with a type selection: `dismiss-all` takes no
   * types, so it would archive more than shown.
   *
   * ponytail: ceiling is the endpoint signature; teach
   * `dismiss_feed_items_for_filter` the `types` axis (#1420), then make it `true`.
   */
  bulkArchiveAvailable: boolean
}

/**
 * The Updates page's data + filter state (#1421). Every axis lives in the URL;
 * the pure param half is `./updatesFilters.ts`.
 */
export function useUpdates(): UpdatesState {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readUpdatesFilters(searchParams)
  const { filter, archived, types } = toFeedQuery(filters)

  const [items, setItems] = useState<ActivityFeedItem[]>([])
  const [counts, setCounts] = useState<FeedCounts>(EMPTY_COUNTS)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const [bulkPending, setBulkPending] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)
  // Bumped on any request answer or bulk archive; re-runs the load effect.
  const [refreshKey, setRefreshKey] = useState(0)

  // `filters` is a fresh object per render, so deps are primitives; joining is
  // safe since a feed type never contains a comma.
  const typesKey = (types ?? []).join(',')

  const fetchPage = useCallback(
    (cursor?: string) =>
      getActivityFeed({
        filter,
        archived,
        types: typesKey === '' ? undefined : typesKey.split(','),
        before: cursor,
        limit: PAGE_LIMIT,
      }),
    [filter, archived, typesKey],
  )

  // Initial load, and every filter change.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFetchError(null)
    setLoadMoreError(null)
    fetchPage()
      .then((response) => {
        if (cancelled) return
        setItems(response.items)
        setCounts(response.counts)
        setNextCursor(response.next_cursor)
        setLoading(false)
      })
      .catch((error) => {
        if (cancelled) return
        setFetchError(extractError(error, i18n.t('feed:page.loadError')))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [fetchPage, refreshKey])

  // Refresh the current view after any accept/decline/submit.
  useEffect(() => onRequestsChanged(() => setRefreshKey((key) => key + 1)), [])

  const setFilters = useCallback(
    (patch: Partial<UpdatesFilters>) => {
      setSearchParams(
        (previous) => nextUpdatesParams(previous, patch),
        UPDATES_NAV_OPTIONS,
      )
    },
    [setSearchParams],
  )

  const clearFilters = useCallback(() => {
    setSearchParams(clearedUpdatesParams, UPDATES_NAV_OPTIONS)
  }, [setSearchParams])

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    setLoadMoreError(null)
    try {
      const response = await fetchPage(nextCursor)
      setItems((previous) => [...previous, ...response.items])
      setNextCursor(response.next_cursor)
    } catch (error) {
      setLoadMoreError(extractError(error, i18n.t('feed:page.loadMoreError')))
    }
    setLoadingMore(false)
  }

  /** Counts only: reloading `items` would yank the card's undo strip. */
  const refreshCounts = useCallback(() => {
    getActivityFeed({
      filter,
      archived,
      types: typesKey === '' ? undefined : typesKey.split(','),
      limit: 1,
    })
      .then((response) => setCounts(response.counts))
      .catch(() => {
        /* a stale badge is not worth an error surface */
      })
  }, [filter, archived, typesKey])

  /** Server re-runs the feed for `filter`; types don't reach it (see `bulkArchiveAvailable`). */
  const archiveAll = async () => {
    if (bulkPending) return
    setBulkPending(true)
    setBulkError(null)
    try {
      await dismissAllFeedItems(filter)
      setRefreshKey((key) => key + 1)
    } catch (error) {
      setBulkError(extractError(error, i18n.t('feed:archive.error')))
    }
    setBulkPending(false)
  }

  /** Empty the whole archive; it has no relationship slicing. */
  const restoreAll = async () => {
    if (bulkPending) return
    setBulkPending(true)
    setBulkError(null)
    try {
      await restoreAllFeedItems()
      setRefreshKey((key) => key + 1)
    } catch (error) {
      setBulkError(extractError(error, i18n.t('feed:archive.restoreError')))
    }
    setBulkPending(false)
  }

  return {
    items,
    counts,
    filters,
    setFilters,
    clearFilters,
    loading,
    loadingMore,
    nextCursor,
    fetchError,
    loadMoreError,
    loadMore,
    archivedView: filters.archived,
    refreshCounts,
    archiveAll,
    restoreAll,
    bulkPending,
    bulkError,
    bulkArchiveAvailable: filters.types.length === 0,
  }
}
