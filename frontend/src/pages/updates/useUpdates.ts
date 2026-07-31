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
  /** Every filter axis, read from the URL — never mirrored in `useState`. */
  filters: UpdatesFilters
  /** Patch one or more axes. Writes the URL; the URL drives the fetch. */
  setFilters: (patch: Partial<UpdatesFilters>) => void
  /** Every axis back to its unfiltered value, the state segment included. */
  clearFilters: () => void
  loading: boolean
  loadingMore: boolean
  nextCursor: string | null
  fetchError: string | null
  loadMoreError: string | null
  loadMore: () => Promise<void>
  /** True while the archive is on screen. Drives the restore-shaped controls,
   *  the "still waiting" tag, and which empty state is drawn. */
  archivedView: boolean
  /** Refresh the counts WITHOUT touching `items`. Called after a single archive
   *  write: dropping the item would delete the slot its undo strip is standing
   *  in, so the row stays and only the badges catch up. */
  refreshCounts: () => void
  /** Archive everything the current view shows / empty the whole archive. */
  archiveAll: () => Promise<void>
  restoreAll: () => Promise<void>
  bulkPending: boolean
  bulkError: string | null
  /**
   * Whether "Archive all" may be offered at all.
   *
   * `POST /activity-feed/dismiss-all` is scoped by `filter` and takes no type
   * selection, so with the type facet on it would archive strictly MORE than
   * the list on screen — tick "Nudge", press the button, lose the whole inbox.
   * The button's contract has always been "exactly what you are looking at",
   * so the honest move is to withhold it rather than silently widen it
   * (CLAUDE.md: hide unusable controls, never draw them disabled).
   *
   * ponytail: the ceiling is the endpoint's signature. The upgrade path is to
   * teach `dismiss_feed_items_for_filter` the same `types` axis the read side
   * learned in #1420, at which point this can simply become `true`.
   */
  bulkArchiveAvailable: boolean
}

/**
 * The Updates page's data + filter state — one responsive surface since #1421,
 * so there is no longer a desktop/mobile pair consuming it.
 *
 * EVERY filter axis lives in the URL (epic #1419 decision 23) — relationship,
 * Inbox/Archived state and the type multi-select. There is no mirrored
 * `useState` for any of them: the URL is the single source of truth, so a
 * pasted or refreshed link restores the whole filter set, Back undoes a filter
 * change, and "clear all" is one param write rather than three setter calls.
 *
 * That is a real fix, not a tidy-up. The page used to read `?filter=` exactly
 * once, in a `useState` initializer, and `setFilter` never wrote back: clicking
 * a tab left the address bar saying something else entirely.
 *
 * The pure half — reading, writing and normalising those params — is
 * `./updatesFilters.ts`, where a harness with no DOM can reach it.
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
  // Bumped when a request is accepted/declined/submitted anywhere, or after a
  // bulk archive; re-runs the load effect so the counts resolve without a
  // reload.
  const [refreshKey, setRefreshKey] = useState(0)

  // `filters` is derived fresh from the URL on every render, so it is a new
  // object each time and cannot be an effect dependency. The axes go in as
  // PRIMITIVES instead — the selection as a joined string, which is sound
  // because a feed type is an identifier and can never contain a comma.
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

  /**
   * Counts only. Archiving one card must not reload `items`: the card's slot is
   * standing there showing an undo strip, and refetching would pull the item
   * out from under it and jump the list — exactly what the design's
   * strip-in-its-own-slot rule exists to prevent. The badges are worth one
   * small request; the ordering is not worth breaking.
   */
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

  /** Archive everything this view currently shows. The server re-runs the feed
   *  for the same filter, so the scope cannot drift from what is on screen —
   *  which is exactly why `bulkArchiveAvailable` withholds the button once a
   *  type selection is on, since that axis does NOT reach the endpoint. */
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

  /** Empty the archive. No filter — "Restore all" on the archive means
   *  everything, and the archive has no relationship slicing of its own. */
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
