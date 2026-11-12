/**
 * The praxis-feed data shared by desktop and mobile: one `listPraxes` stream
 * paged by `usePagedResource`. Every filter axis lives in the URL (#1361
 * ruling 7; see `./feedFilterParams.ts`, `./taskFilterParam.ts`).
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

const PAGE_LIMIT = 50

/**
 * First page per filter combination, Class B (ADR-0072, #2432). Keyed on the
 * viewer too, since `voted` depends on the caller's votes.
 */
const PRAXIS_PAGE_CACHE = createKeyedResourceCache<PraxisCardOut[]>(AMBIENT_TTL_MS)

export type { PraxisFeedFilters, VotedFilter, SortOrder, EraScope } from './feedFilterParams'

export interface PraxesFeedState {
  items: PraxisCardOut[]
  loading: boolean
  error: Error | null
  isEmpty: boolean
  /** Which empty state to show (#1361 ruling 9). */
  emptyState: EmptyStateKind

  factions: FactionOut[]

  filters: PraxisFeedFilters
  /** Resets the growing window. */
  setFilters: (patch: Partial<PraxisFeedFilters>) => void
  /** Search and task filter included. */
  clearAllFilters: () => void
  /**
   * Hidden for anon (`list_praxes` ignores `voted`, #1361 ruling 8) and when
   * `can_vote === false` (#3169).
   */
  canFilterByVote: boolean

  /** Raw search box value; the fetch reads a debounced copy. */
  query: string
  setQuery: (query: string) => void

  /** From `?task_id=` (#1050); pages show a notice when set. */
  taskId: number | null
  clearTaskFilter: () => void

  hasMore: boolean
  loadMore: () => void
}

export function usePraxes(): PraxesFeedState {
  // App-wide cached (#1284).
  const factions: FactionOut[] = useFactions() ?? []
  const { user, loading: authLoading } = useAuth()
  const [query, setQueryState] = useSearchQueryParam()
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = readFeedFilters(searchParams)
  const taskId = readTaskIdParam(searchParams)
  // A missing `can_vote` is not gated (#3169). The fetch sends the effective
  // `voted`, not the URL's.
  const canFilterByVote = user !== null && user.can_vote !== false
  const voted = canFilterByVote ? filters.voted : LANDING_FILTERS.voted

  const debouncedQuery = useDebouncedValue(query, 200)
  const trimmedQuery = debouncedQuery.trim()
  // Arrays are compared by identity in a dep list, so the union travels as a key.
  const factionKey = filters.factions.join(',')

  const { data, loading, error, hasMore, loadMore, resetWindow } = usePagedResource(
    (limit) =>
      listPraxes({
        status: 'submitted',
        task_id: taskId ?? undefined,
        // An empty union must be absent, not `[]` — see `listPraxes`.
        faction: filters.factions.length > 0 ? filters.factions : undefined,
        voted: voted === 'all' ? undefined : voted,
        sort: filters.sort,
        era_scope: filters.eraScope,
        q: trimmedQuery || undefined,
        limit,
      }),
    [taskId, factionKey, voted, filters.sort, filters.eraScope, trimmedQuery],
    PAGE_LIMIT,
    // No caching until the viewer is known: the read doesn't wait for
    // `/auth/me` (#644), so it is viewer-relative while `user` is still anon.
    authLoading
      ? undefined
      : { cache: PRAXIS_PAGE_CACHE, viewer: viewerCacheKey(user) },
  )

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
  // An unusable vote filter is not narrowing (the server drops it).
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

    hasMore,
    loadMore,
  }
}
