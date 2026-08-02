/**
 * The praxis feed's filter axes, as URL params — the pure half of `usePraxes`
 * (#1366, epic #1361 ruling 7).
 *
 * Before this, faction / voted / sort lived in component `useState` and died on
 * refresh; only `?q=` (#660) and `?task_id=` (#1050) rode in the URL. Every axis
 * now rides there, so a filtered feed is a link you can share, bookmark and
 * reload — and the three surfaces that read it (desktop page, mobile stream,
 * filter bar) read ONE state rather than three copies.
 *
 * Kept separate from the hook because the repo's harness is
 * `renderToStaticMarkup` only: a self-fetching feed cannot be driven from a
 * test, so the derivations that carry the guarantees live where they can be
 * asserted. Same posture as `./taskFilterParam.ts`.
 *
 * Param names are the API's own (`faction`, `voted`, `sort`, `era_scope`), so
 * the feed URL and the request it makes read alike — and `?task_id=` was
 * already snake_case for the same reason.
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

/**
 * Replace, never push. A rail tap is a re-read of the same page, not a new one;
 * pushing would make Back walk the player's filter history one segment at a
 * time instead of leaving the feed. Matches `SEARCH_QUERY_NAV_OPTIONS`.
 */
export const FEED_FILTER_NAV_OPTIONS = { replace: true } as const

export interface PraxisFeedFilters {
  /** Multi-select faction union — OR-ed server-side (#1362). */
  factions: string[]
  voted: VotedFilter
  sort: SortOrder
  eraScope: EraScope
}

/**
 * What a bare `/praxis` shows. Note `eraScope: 'this_era'` — the landing feed is
 * deliberately narrowed (#1361 ruling 6), which is exactly why the era rail is
 * the one axis whose landing value is NOT its unfiltered value.
 */
export const LANDING_FILTERS: PraxisFeedFilters = {
  factions: [],
  voted: 'all',
  sort: 'newest',
  eraScope: 'this_era',
}

/**
 * "Not filtering by era" — the era rail's `defaultValue`, and NOT its landing
 * value.
 *
 * `deriveChips` raises a chip for any rail off its `defaultValue`, so pointing
 * the era rail's default at `all_eras` is what puts the "This era" chip on the
 * feed on first load, present and removable, which #1366 requires. Pointing it
 * at the landing value instead would leave the feed quietly narrowed with
 * nothing on screen saying so.
 *
 * The counterpart to that choice is {@link narrowingFilterCount}: era stays out
 * of the count, so the chip's presence cannot block the "All caught up" empty
 * state or make an empty register read as "nothing filed under those terms".
 */
export const UNFILTERED_ERA_SCOPE: EraScope = 'all_eras'

const SORT_ORDERS: readonly SortOrder[] = ['newest', 'oldest', 'most_voted', 'least_voted']
const VOTED_FILTERS: readonly VotedFilter[] = ['all', 'yes', 'no']
const ERA_SCOPES: readonly EraScope[] = ['this_era', 'all_eras']

/**
 * A URL is untrusted input and the list route 422s on an unknown `sort`,
 * `voted` or `era_scope` — so a hand-edited or truncated link degrades to the
 * landing value via {@link readOneOf} rather than turning the feed into an
 * error. That whitelist is now shared with the task browse (#1537).
 */
export function readFeedFilters(params: URLSearchParams): PraxisFeedFilters {
  return {
    // Unknown slugs are left alone: `/factions` is fetched separately and a
    // slug that matches nothing simply returns no rows, which is honest.
    factions: params.getAll(FACTION_PARAM).filter((slug) => slug !== ''),
    voted: readOneOf(params.get(VOTED_PARAM), VOTED_FILTERS, LANDING_FILTERS.voted),
    sort: readOneOf(params.get(SORT_PARAM), SORT_ORDERS, LANDING_FILTERS.sort),
    eraScope: readOneOf(params.get(ERA_SCOPE_PARAM), ERA_SCOPES, LANDING_FILTERS.eraScope),
  }
}

/**
 * The next param set for a filter change. Landing values are REMOVED rather
 * than written, so the common URL stays `/praxis` instead of accumulating
 * `?voted=all&sort=newest&era_scope=this_era`. Every param this module does not
 * own — `?q=`, `?task_id=` — is carried through untouched.
 */
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
 * "Clear all filters" — every axis to its UNFILTERED value, which for era means
 * `all_eras` rather than the narrower landing scope: the button promises to
 * show everything, so it has to.
 *
 * `?task_id=` goes too. It is not a chip (it keeps its own notice and its own
 * clear link, #1050) but it is a filter, and a "clear all filters" button that
 * leaves an empty feed empty is a dead end.
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
 * How many filters are NARROWING the feed — the number `selectEmptyState` reads
 * (#1361 ruling 9), not the number of chips on screen.
 *
 * Sort and era scope are excluded on purpose. A sort reorders a list and can
 * never empty one; the era rail either sits on the site-wide landing scope or
 * widens past it. Counting either would mean "All caught up" could not appear
 * on the default feed — which is the one place it is for — and an empty
 * register would claim to be filtered.
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
