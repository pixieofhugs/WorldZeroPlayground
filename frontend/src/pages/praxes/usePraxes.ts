/**
 * usePraxes — the praxis-feed data lift shared by the desktop list and the
 * mobile stream (#499, rewritten for #644, filters moved to the URL in #1366).
 *
 * The old three-call (solo / collab / duel) fetch is collapsed into ONE
 * `listPraxes` call so filter/search/sort sit on top of a single date-ordered
 * stream (§1). The growing window (§8) lives in the shared `usePagedResource`
 * hook (#645); every filter setter calls its `resetWindow`.
 *
 * EVERY filter axis rides in the URL (#1361 ruling 7) — faction, voted, sort and
 * era scope joined `?q=` (#660) and `?task_id=` (#1050) there. There is no
 * mirrored `useState`: the URL is the state, so a filtered feed is a link you
 * can share and reload, and the two pages plus the filter bar all read one copy.
 * The derivations live in `./feedFilterParams.ts` where a DOM-less harness can
 * reach them.
 *
 * `?task_id=` (#1050) stays a special case: it is set by task surfaces rather
 * than by the bar, it is optional (a bare `/praxis` is the whole feed), and both
 * pages announce it, so a narrowed feed never looks like the whole register.
 * See `./taskFilterParam.ts`.
 */
import { useSearchParams } from 'react-router-dom'
import { listPraxes, type PraxisCardOut } from '../../api/praxis'
import type { FactionOut } from '../../api/factions'
import { useAuth } from '../../auth/AuthContext'
import { useFactions } from '../../hooks/useFactions'
import { usePagedResource, viewerCacheKey } from '../../hooks/usePagedResource'
import { AMBIENT_TTL_MS, createKeyedResourceCache } from '../../hooks/cachedResource'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useSearchQueryParam } from '../../hooks/useSearchQueryParam'
import {
  selectEmptyState,
  type EmptyStateKind,
} from '../../components/ui/FilterBar'
import {
  readFeedFilters,
  nextFeedFilterParams,
  clearedFeedParams,
  narrowingFilterCount,
  LANDING_FILTERS,
  FEED_FILTER_NAV_OPTIONS,
  type PraxisFeedFilters,
} from './feedFilterParams'
import {
  readTaskIdParam,
  withoutTaskIdParam,
  TASK_FILTER_NAV_OPTIONS,
} from './taskFilterParam'

/** How many rows a page fetches; "load more" grows the window by this step. */
const PAGE_LIMIT = 50

/**
 * The feed's first page, per filter combination, for five minutes (#2432) —
 * **Class B** (ADR-0072), alongside the task browse.
 *
 * Keyed on the viewer as well as the filters: `voted` is answered against the
 * caller's own votes, so a key without the viewer would show one player's
 * "already voted" set to another after a sign-in. Emptied by an era rollover
 * and by any write — voting is a write, so a card's counts cannot age behind
 * your own tap.
 */
const PRAXIS_PAGE_CACHE = createKeyedResourceCache<PraxisCardOut[]>(AMBIENT_TTL_MS)

export type { PraxisFeedFilters, VotedFilter, SortOrder, EraScope } from './feedFilterParams'

export interface PraxesFeedState {
  /** The single date-ordered proof stream (§1). */
  items: PraxisCardOut[]
  loading: boolean
  error: Error | null
  /** No results came back. */
  isEmpty: boolean
  /**
   * Which of the three empty states to show when `isEmpty` (#1361 ruling 9) —
   * decided by `selectEmptyState`, so the "All caught up" claim is only made
   * where it is checkable.
   */
  emptyState: EmptyStateKind

  /** Reference data for the faction picker. */
  factions: FactionOut[]

  /** Every filter axis, read from the URL. */
  filters: PraxisFeedFilters
  /** Patch one or more axes (resets the growing window). */
  setFilters: (patch: Partial<PraxisFeedFilters>) => void
  /** Every axis back to its unfiltered value, search and task filter included. */
  clearAllFilters: () => void
  /**
   * Whether the voted rail may be shown (#1361 ruling 8). `list_praxes` ignores
   * `voted` for an anonymous viewer, so logged out the control did nothing —
   * hide it rather than render it dead (STYLE §1.4).
   */
  canFilterByVote: boolean

  /** Raw search box value (bind directly); the fetch reads a debounced copy. */
  query: string
  setQuery: (query: string) => void

  /**
   * The task the feed is narrowed to, from `?task_id=` (#1050); `null` for the
   * whole feed, including when the param is junk. Pages render a notice when
   * it's set — a filtered feed that looks identical to the unfiltered one is the
   * bug this fixes.
   */
  taskId: number | null
  /** Drop the task filter (keeps every other param, including `?q=`). */
  clearTaskFilter: () => void

  // Growing window (§8).
  hasMore: boolean
  loadMore: () => void
}

export function usePraxes(): PraxesFeedState {
  // App-wide cached, one request per page load across all five consumers (#1284).
  const factions: FactionOut[] = useFactions() ?? []
  const { user, loading: authLoading } = useAuth()
  const [query, setQueryState] = useSearchQueryParam()
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = readFeedFilters(searchParams)
  const taskId = readTaskIdParam(searchParams)
  const canFilterByVote = user !== null

  const debouncedQuery = useDebouncedValue(query, 200)
  const trimmedQuery = debouncedQuery.trim()
  // Arrays are compared by identity in a dep list, so the union travels as a key.
  const factionKey = filters.factions.join(',')

  const { data, loading, error, hasMore, loadMore, resetWindow } = usePagedResource(
    (limit) =>
      listPraxes({
        status: 'submitted',
        // Optional by design (#1050): absent → the whole feed, exactly as before.
        task_id: taskId ?? undefined,
        // An empty union must be absent, not `[]` — see `listPraxes`.
        faction: filters.factions.length > 0 ? filters.factions : undefined,
        voted: filters.voted === 'all' ? undefined : filters.voted,
        sort: filters.sort,
        era_scope: filters.eraScope,
        q: trimmedQuery || undefined,
        limit,
      }),
    [taskId, factionKey, filters.voted, filters.sort, filters.eraScope, trimmedQuery],
    PAGE_LIMIT,
    // Nothing is HELD until the viewer is known. Unlike the task browse this
    // feed does not wait for `/auth/me` before reading (#644's cold-paint
    // budget), and the cookie rides along regardless — so a cold read is
    // already viewer-relative while `user` still says anonymous, and filing it
    // under `anon` would be a lie. Skipping the write costs one page.
    authLoading
      ? undefined
      : { cache: PRAXIS_PAGE_CACHE, viewer: viewerCacheKey(user) },
  )

  // Every filter/search change resets the window so "load more" can't strand a
  // grown page against a freshly-narrowed result set.
  const setFilters = (patch: Partial<PraxisFeedFilters>) => {
    setSearchParams(
      (previous) => nextFeedFilterParams(previous, patch),
      FEED_FILTER_NAV_OPTIONS,
    )
    resetWindow()
  }
  const clearAllFilters = () => {
    setSearchParams(clearedFeedParams, FEED_FILTER_NAV_OPTIONS)
    resetWindow()
  }
  const setQuery = (next: string) => { setQueryState(next); resetWindow() }
  const clearTaskFilter = () => {
    setSearchParams(withoutTaskIdParam, TASK_FILTER_NAV_OPTIONS)
    resetWindow()
  }

  const items = data ?? []
  // A vote filter the viewer cannot use is not narrowing anything — the server
  // drops it for anonymous readers, so it must not colour the empty state either.
  const votedApplied = canFilterByVote && filters.voted !== LANDING_FILTERS.voted
  const appliedCount = narrowingFilterCount(
    { ...filters, voted: votedApplied ? filters.voted : LANDING_FILTERS.voted },
    { query: trimmedQuery, taskId },
  )

  return {
    items,
    loading,
    error,
    isEmpty: items.length === 0,
    emptyState: selectEmptyState(appliedCount, votedApplied && filters.voted === 'no'),

    factions,

    filters,
    setFilters,
    clearAllFilters,
    canFilterByVote,

    query,
    setQuery,
    taskId,
    clearTaskFilter,

    // A full page implies there may be more (§8) — via the shared usePagedResource.
    hasMore,
    loadMore,
  }
}
