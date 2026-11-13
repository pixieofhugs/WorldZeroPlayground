/**
 * The praxis feed's filter axes as URL params: the pure, testable half of
 * `usePraxes` (#1366, #1361 ruling 7). Param names match the API's.
 */
import { readOneOf } from '../../utils/urlParams'


/** Account-scoped vote filter. `all` = no filter (#644 §6). */
export type VotedFilter = 'all' | 'yes' | 'no'
/** One rail, one `ORDER BY` (#1361 ruling 5). Matches `PraxisSort`. */
export type SortOrder = 'newest' | 'oldest' | 'most_voted' | 'least_voted'
/** Matches `PraxisEraScope` (#1362). */
export type EraScope = 'this_era' | 'all_eras'

export const FACTION_PARAM = 'faction'
export const VOTED_PARAM = 'voted'
export const SORT_PARAM = 'sort'
export const ERA_SCOPE_PARAM = 'era_scope'

/** Replace, never push, so Back leaves the feed rather than walking filters. */
export const FEED_FILTER_NAV_OPTIONS = { replace: true } as const

export interface PraxisFeedFilters {
  /** Multi-select faction union — OR-ed server-side (#1362). */
  factions: string[]
  voted: VotedFilter
  sort: SortOrder
  eraScope: EraScope
}

/** A bare `/praxis`. Era lands narrowed (#1361 ruling 6), unlike other axes. */
export const LANDING_FILTERS: PraxisFeedFilters = {
  factions: [],
  voted: 'all',
  sort: 'newest',
  eraScope: 'this_era',
}

/**
 * The era rail's `defaultValue`, NOT its landing value, so `deriveChips` shows
 * a removable "This era" chip on first load (#1366). Era stays out of
 * {@link narrowingFilterCount}.
 */
export const UNFILTERED_ERA_SCOPE: EraScope = 'all_eras'

const SORT_ORDERS: readonly SortOrder[] = ['newest', 'oldest', 'most_voted', 'least_voted']
const VOTED_FILTERS: readonly VotedFilter[] = ['all', 'yes', 'no']
const ERA_SCOPES: readonly EraScope[] = ['this_era', 'all_eras']

/** Unknown values degrade to landing; the list route 422s on them. */
export function readFeedFilters(params: URLSearchParams): PraxisFeedFilters {
  return {
    // Unknown slugs pass through: they just return no rows.
    factions: params.getAll(FACTION_PARAM).filter((slug) => slug !== ''),
    voted: readOneOf(params.get(VOTED_PARAM), VOTED_FILTERS, LANDING_FILTERS.voted),
    sort: readOneOf(params.get(SORT_PARAM), SORT_ORDERS, LANDING_FILTERS.sort),
    eraScope: readOneOf(params.get(ERA_SCOPE_PARAM), ERA_SCOPES, LANDING_FILTERS.eraScope),
  }
}

/** Landing values are removed, not written; unowned params pass through. */
export function nextFeedFilterParams(
  previous: URLSearchParams,
  patch: Partial<PraxisFeedFilters>,
): URLSearchParams {
  const next = new URLSearchParams(previous)
  if (patch.factions !== undefined) {
    next.delete(FACTION_PARAM)
    for (const slug of patch.factions) next.append(FACTION_PARAM, slug)
  }
  setOrDelete(next, VOTED_PARAM, patch.voted, LANDING_FILTERS.voted)
  setOrDelete(next, SORT_PARAM, patch.sort, LANDING_FILTERS.sort)
  setOrDelete(next, ERA_SCOPE_PARAM, patch.eraScope, LANDING_FILTERS.eraScope)
  return next
}

function setOrDelete(
  params: URLSearchParams,
  key: string,
  value: string | undefined,
  landing: string,
): void {
  if (value === undefined) return
  if (value === landing) params.delete(key)
  else params.set(key, value)
}

/**
 * Every axis to its UNFILTERED value (era → `all_eras`), and `?task_id=` too:
 * not a chip, but a filter, and "clear all" must un-empty a feed.
 */
export function clearedFeedParams(previous: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(previous)
  for (const key of [FACTION_PARAM, VOTED_PARAM, SORT_PARAM, 'q', 'task_id']) {
    next.delete(key)
  }
  next.set(ERA_SCOPE_PARAM, UNFILTERED_ERA_SCOPE)
  return next
}

/**
 * Filters NARROWING the feed, for `selectEmptyState` (#1361 ruling 9). Sort and
 * era are excluded: neither can empty the default feed.
 */
export function narrowingFilterCount(
  filters: PraxisFeedFilters,
  context: { query: string; taskId: number | null },
): number {
  return (
    filters.factions.length +
    (filters.voted === LANDING_FILTERS.voted ? 0 : 1) +
    (context.query === '' ? 0 : 1) +
    (context.taskId === null ? 0 : 1)
  )
}
