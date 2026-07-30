/**
 * usePraxes — the praxis-feed data lift shared by the desktop list and the
 * mobile stream (#499, rewritten for #644).
 *
 * The old three-call (solo / collab / duel) fetch is collapsed into ONE
 * `listPraxes` call so filter/search/sort can sit on top of a single date-ordered
 * stream (§1). Filter state (type / faction / voted / sort) lives here via
 * `useState` and is keyed into the fetch, so a chip tap rekeys it — mirroring
 * `pages/tasks/useTasks.ts`. The search query is the one axis that rides in the
 * URL instead (`?q=`, via `useSearchQueryParam`, #660), so a pasted or refreshed
 * link restores it. The growing window (§8) lives in the shared
 * `usePagedResource` hook (#645); filter setters call its `resetWindow`. Filter
 * values + setters ride on the returned state so `MobilePraxisFeed` and the
 * desktop page stay presentation-only.
 *
 * The second URL-borne axis is `?task_id=` (#1050): task surfaces have always
 * linked "view all praxis" here with it, and the API has always accepted it, but
 * this hook read no params so the filter was dropped on arrival. It is optional
 * — a bare `/praxis` is still the whole feed — and the pages announce it when
 * set, so a narrowed feed never looks like the whole register. See
 * `./taskFilterParam.ts`.
 */
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listPraxes, type PraxisCardOut, type PraxisType } from '../../api/praxis'
import type { FactionOut } from '../../api/factions'
import { useFactions } from '../../hooks/useFactions'
import { usePagedResource } from '../../hooks/usePagedResource'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useSearchQueryParam } from '../../hooks/useSearchQueryParam'
import {
  readTaskIdParam,
  withoutTaskIdParam,
  TASK_FILTER_NAV_OPTIONS,
} from './taskFilterParam'

/** How many rows a page fetches; "load more" grows the window by this step. */
const PAGE_LIMIT = 50

export type PraxisTypeFilter = 'all' | PraxisType
export type VotedFilter = '' | 'yes' | 'no'
export type SortOrder = 'newest' | 'oldest'

export interface PraxesFeedState {
  /** The single date-ordered proof stream (§1). */
  items: PraxisCardOut[]
  loading: boolean
  error: Error | null
  /** No results came back. */
  isEmpty: boolean
  /** True when a filter/search is narrowing the feed — lets the page tell a
   *  filtered-to-nothing result apart from a genuinely empty register. */
  hasActiveFilters: boolean

  /** Reference data for the faction filter. */
  factions: FactionOut[]

  // Filter state (setters reset the growing window).
  type: PraxisTypeFilter
  setType: (type: PraxisTypeFilter) => void
  faction: string
  setFaction: (faction: string) => void
  voted: VotedFilter
  setVoted: (voted: VotedFilter) => void
  sort: SortOrder
  setSort: (sort: SortOrder) => void
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
  const [type, setTypeState] = useState<PraxisTypeFilter>('all')
  const [faction, setFactionState] = useState('')
  const [voted, setVotedState] = useState<VotedFilter>('')
  const [sort, setSortState] = useState<SortOrder>('newest')
  const [query, setQueryState] = useSearchQueryParam()
  const [searchParams, setSearchParams] = useSearchParams()

  // The URL owns the task filter, so a shared or refreshed link keeps it.
  const taskId = readTaskIdParam(searchParams)

  const debouncedQuery = useDebouncedValue(query, 200)

  const trimmedQuery = debouncedQuery.trim()
  const { data, loading, error, hasMore, loadMore, resetWindow } = usePagedResource(
    (limit) =>
      listPraxes({
        status: 'submitted',
        // Optional by design (#1050): absent → the whole feed, exactly as before.
        task_id: taskId ?? undefined,
        type: type === 'all' ? undefined : type,
        faction: faction || undefined,
        voted: voted || undefined,
        sort,
        q: trimmedQuery || undefined,
        limit,
      }),
    [taskId, type, faction, voted, sort, trimmedQuery],
    PAGE_LIMIT,
  )

  // Every filter/search change resets the window so "load more" can't strand a
  // grown page against a freshly-narrowed result set.
  const setType = (next: PraxisTypeFilter) => { setTypeState(next); resetWindow() }
  const setFaction = (next: string) => { setFactionState(next); resetWindow() }
  const setVoted = (next: VotedFilter) => { setVotedState(next); resetWindow() }
  const setSort = (next: SortOrder) => { setSortState(next); resetWindow() }
  const setQuery = (next: string) => { setQueryState(next); resetWindow() }
  const clearTaskFilter = () => {
    setSearchParams(withoutTaskIdParam, TASK_FILTER_NAV_OPTIONS)
    resetWindow()
  }

  const items = data ?? []
  // The task filter counts: without it, a task with no proof yet would read as
  // "no praxes yet. Be the first." for the whole register.
  const hasActiveFilters =
    taskId !== null || type !== 'all' || faction !== '' || voted !== '' || trimmedQuery !== ''

  return {
    items,
    loading,
    error,
    isEmpty: items.length === 0,
    hasActiveFilters,

    factions,

    type,
    setType,
    faction,
    setFaction,
    voted,
    setVoted,
    sort,
    setSort,
    query,
    setQuery,
    taskId,
    clearTaskFilter,

    // A full page implies there may be more (§8) — via the shared usePagedResource.
    hasMore,
    loadMore,
  }
}
