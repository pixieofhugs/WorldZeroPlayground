/**
 * useTasks — the shared task-browse data + filter state, so the desktop list and
 * the mobile browse skin consume one source of truth (mirrors useTaskDetail for
 * the detail page).
 *
 * The factions/factionConfigs reads (both app-wide cached hooks), the filter
 * state, and the task read keyed on those filters. Signing up is `useTaskSignup`
 * and is only re-exported through here — this hook held the third byte-identical
 * copy of it until #2188.
 *
 * EVERY axis lives in the URL (#1367, epic #1361 ruling 7) — type, sort, status,
 * faction and eligibility joined `?q=`, which `useSearchQueryParam` has owned
 * since #660. There is no mirrored `useState` for any of them: the URL is the
 * single source of truth, so a pasted or refreshed link restores the whole
 * filter set, and "clear all" is one param write rather than five setter calls.
 * Writes replace rather than push, for the reason `useSearchQueryParam` gives:
 * Back should leave the page, not walk the filters one at a time.
 *
 * The free-text search is debounced 200ms via `useDebouncedValue` — the idiom
 * #644 set on the praxis feed. The read runs through the shared
 * `usePagedResource` growing window (#645): filter setters (search included)
 * reset the window and a full page exposes "load more".
 *
 * The level filter is gone (#1130). It selected `level_required >= level` — the
 * tasks you are locked OUT of — and no level number could express WOW's
 * once-a-level jump or the Ephemerists' retired-task access, so both abilities
 * were invisible in the browse. `canSignUp` asks the server the question the
 * game actually answers; every rule stays backend-side, so nothing here reads
 * an era value and #1046's "never hardcode an EraConfig value" is not reopened.
 *
 * Eligibility is the ONE axis whose default is viewer-relative (#1972, narrowed
 * by #2025): ON while the character is at level 0, OFF once it is past that,
 * unavailable to a viewer carrying no character at all. Level 0 is the tutorial
 * state with exactly one task to do, so opening the board on that one task is
 * the whole point; from level 1 the player has run the loop once and a board
 * that quietly hides rows is the surprise #1367 spent an epic removing. The
 * server answers which of the three this viewer is —
 * {@link EligibilityDefault}, never a `character.level` compared here. See
 * {@link readTaskFilters} for the tri-state param that costs, and what a shared
 * link does about it.
 */
import { useSearchParams } from 'react-router-dom'
import {
  listTasks,
  type TaskOut,
  type TaskSort,
  type TaskType,
} from '../../api/tasks'
import type { FactionOut } from '../../api/factions'
import type { FactionConfigOut } from '../../api/gameConfig'
import {
  selectEmptyState,
  type EmptyStateKind,
} from '../../components/ui/FilterBar'
import { useFactions } from '../../hooks/useFactions'
import { useGameConfig } from '../../hooks/useGameConfig'
import { readOneOf } from '../../utils/urlParams'
import { hadSessionLastVisit, useAuth } from '../../auth/AuthContext'
import { computeDisplayPoints, computeFactionMultiplier } from '../../utils/points'
import { usePagedResource, viewerCacheKey } from '../../hooks/usePagedResource'
import { AMBIENT_TTL_MS, createKeyedResourceCache } from '../../hooks/cachedResource'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useTaskSignup } from '../../hooks/useTaskSignup'
import {
  SEARCH_QUERY_PARAM,
  useSearchQueryParam,
} from '../../hooks/useSearchQueryParam'
import type { CurrentUser } from '../../api/auth'

/** How many rows a page fetches; "load more" grows the window by this step. */
const PAGE_LIMIT = 50

/**
 * The browse's first page, per filter combination, for five minutes (#2432) —
 * **Class B** (ADR-0072), and one of the class's first two consumers.
 *
 * Every filter change used to be a full uncached `GET /tasks`, clearing a
 * filter included, so leaving a view and coming back cost exactly what arriving
 * at it cost. Keyed on the viewer plus every axis in the URL, so a combination
 * you have already seen is free; emptied by an era rollover and by any write.
 *
 * Module scope, not the hook body: the point is that the desktop list and the
 * mobile browse skin, and a second visit to either, share one held page.
 */
const TASK_PAGE_CACHE = createKeyedResourceCache<TaskOut[]>(AMBIENT_TTL_MS)

/**
 * The URL params the task browse owns, beside `useSearchQueryParam`'s `?q=`.
 * Named here rather than inline so a typo can't silently drop an axis, and so
 * "clear all" can enumerate them.
 */
export const TASK_FILTER_PARAMS = {
  taskType: 'type',
  sort: 'sort',
  status: 'status',
  faction: 'faction',
  canSignUp: 'can_sign_up',
} as const

/**
 * The status axis, which is NOT a backend enum: `All` is the page's own "no
 * status filter" value and the other three are `TaskStatus`. Whether the viewer
 * may SEE `retired` / `pending` is a separate, server-owned question — see
 * `statusFilters`, which is what the control offers.
 */
export type TaskStatusFilter = 'All' | 'active' | 'retired' | 'pending'

/** Browse mode default: ordinary tasks, metatasks excluded backend-side. */
export const TASK_TYPE_DEFAULT: TaskType = 'standard'
/**
 * Sort default (#1361 ruling 6). NOT the first segment and NOT `newest`: the
 * page has always been `level_required ASC, point_value DESC`, which it got by
 * sending no `sort` at all. Naming that ordering is what stops a bare
 * newest/oldest pair from silently deleting it.
 */
export const TASK_SORT_DEFAULT: TaskSort = 'level'
export const TASK_STATUS_DEFAULT: TaskStatusFilter = 'All'
/**
 * The eligibility axis is a TRI-STATE, not a flag (#1972): `1` on, `0` off,
 * absent = whatever this viewer's default is. Every other axis can spell its
 * default by omission because the default is the same for everyone; this one
 * cannot, so both states are written out.
 */
export const CAN_SIGN_UP_ON = '1'
export const CAN_SIGN_UP_OFF = '0'

/**
 * What eligibility means for THIS viewer — the one viewer-relative input the
 * two readers below take (#2025). Three states, not two booleans, because the
 * middle one is exactly the case the pair would let you spell wrongly:
 *
 *   - `'unavailable'` — no character. There is nothing to ask the server about,
 *     so the axis is forced off whatever the URL says, and the rail is hidden.
 *   - `'off'` — a character past the tutorial. The axis works; the board opens
 *     whole.
 *   - `'on'` — a level-0 character. The board opens on what they can start.
 *
 * Which one a viewer is comes from `/auth/me`'s
 * `task_browse_defaults_to_eligible` plus whether a character is carried at all
 * — never a level compared here, per the capability-flag rule in `api/auth.ts`.
 */
export type EligibilityDefault = 'unavailable' | 'off' | 'on'

/**
 * The legal value of each enumerated axis, for {@link readOneOf} (#1537). A URL
 * is untrusted input: `GET /tasks` 422s on an unknown `sort` (#1443), so a stale
 * bookmark or a hand-edited link has to degrade to the default view here rather
 * than surface the browse error state.
 *
 * Status is whitelisted against EVERY status, not against the viewer-gated
 * `statusFilters` — those depend on `/auth/me`, which settles after first
 * render, so gating the read would flip a shared `?status=retired` link back to
 * `All` mid-load. A viewer who may not see retired tasks is told so by the
 * server, which owns that rule.
 */
const TASK_TYPES: readonly TaskType[] = ['standard', 'metatask']
const TASK_SORTS: readonly TaskSort[] = ['newest', 'oldest', 'level']
const TASK_STATUSES: readonly TaskStatusFilter[] = [
  'All',
  'active',
  'retired',
  'pending',
]

/** Navigation options for every filter write: replace, never push. */
const FILTER_NAV_OPTIONS = { replace: true } as const

/** Every filter axis the browse owns, as read out of the address bar. */
export interface TaskFilterAxes {
  taskType: TaskType
  sort: TaskSort
  status: TaskStatusFilter
  factions: string[]
  canSignUp: boolean
}

/**
 * Hydrate the whole filter set from a param set — the hook's entire URL read,
 * pulled out where the no-DOM harness can drive it. Counterpart to the praxis
 * feed's `readFeedFilters`.
 *
 * The three enumerated axes go through the shared whitelist, so an unknown value
 * clamps to the default instead of riding out to a route that 422s on it.
 *
 * `eligibilityDefault` is the only viewer-relative input, and it decides the
 * whole eligibility axis (#1972, narrowed by #2025):
 *
 *   - **`'unavailable'`: no character, no eligibility.** There is no question to
 *     ask the server, so the axis is forced off whatever the URL says. `/tasks`
 *     is public and it is the shop window — a stranger gets all 65 tasks, never
 *     an empty page.
 *   - **`'on'`: a level-0 character, so ON unless the URL says `0`.** The
 *     tutorial state can start one task out of 65; opening the board on that
 *     one is the point.
 *   - **`'off'`: a character past level 0, so OFF unless the URL says `1`.**
 *     They have run the loop once and know the board exists; hiding rows from
 *     them is the surprise, not the help.
 *
 * The URL still wins over the default in both directions — that is what makes
 * the axis shareable at all, and what keeps the field desk's
 * `/tasks?can_sign_up=1` CTA landing narrowed for a player of any level.
 *
 * That answers the shareable-link question the ruling leaves open. The axis is
 * viewer-relative, so it cannot round-trip faithfully; what it round-trips
 * instead is the viewer's *intent*, clamped to what the recipient can do. A
 * pasted `can_sign_up=0` shows everyone the full board, so switching the filter
 * off is a link you can send. A pasted `can_sign_up=1` is a request the
 * recipient honours only if they carry a character — for anyone else it
 * degrades to the full board rather than to nothing at all. A bare `/tasks`
 * link means "the board, as it opens for you", which is now different for a
 * brand-new player, a levelled one and a stranger by design.
 */
export function readTaskFilters(
  params: URLSearchParams,
  eligibilityDefault: EligibilityDefault,
): TaskFilterAxes {
  const asked = params.get(TASK_FILTER_PARAMS.canSignUp)
  return {
    taskType: readOneOf(
      params.get(TASK_FILTER_PARAMS.taskType),
      TASK_TYPES,
      TASK_TYPE_DEFAULT,
    ),
    sort: readOneOf(params.get(TASK_FILTER_PARAMS.sort), TASK_SORTS, TASK_SORT_DEFAULT),
    status: readOneOf(
      params.get(TASK_FILTER_PARAMS.status),
      TASK_STATUSES,
      TASK_STATUS_DEFAULT,
    ),
    // Unknown slugs are left alone, as on the praxis feed: `/factions` is
    // fetched separately and a slug that matches nothing simply returns no rows.
    factions: params.getAll(TASK_FILTER_PARAMS.faction).filter((slug) => slug !== ''),
    // Anything the axis cannot read — absent, blank, hand-typed nonsense —
    // falls through to the viewer's default, the same clamp the enumerated
    // axes get above.
    canSignUp:
      eligibilityDefault !== 'unavailable' &&
      (asked === CAN_SIGN_UP_ON ||
        (asked !== CAN_SIGN_UP_OFF && eligibilityDefault === 'on')),
  }
}

/**
 * The next param set for one axis. Non-default values only: an axis sitting on
 * its default is REMOVED from the URL rather than spelled out, so a clean
 * browse has a clean address. Every other param carries through untouched.
 */
export function nextFilterParams(
  previous: URLSearchParams,
  key: string,
  value: string,
  defaultValue: string,
): URLSearchParams {
  const next = new URLSearchParams(previous)
  if (value === defaultValue) next.delete(key)
  else next.set(key, value)
  return next
}

/** Multi-select faction as the repeated `?faction=` union B2 (#1364) accepts. */
export function nextFactionParams(
  previous: URLSearchParams,
  slugs: string[],
): URLSearchParams {
  const next = new URLSearchParams(previous)
  next.delete(TASK_FILTER_PARAMS.faction)
  for (const slug of slugs) next.append(TASK_FILTER_PARAMS.faction, slug)
  return next
}

/**
 * Every axis off, search included — what "clear all filters" means. Params this
 * page does not own are left alone.
 *
 * "Off", not "back to its default", and which of the two takes the extra write
 * INVERTS with the default (#2025). A button that says it cleared the filters
 * has to leave a list with no filters on it — and this is the same tap
 * `CanSignUpEmpty` offers as "see everything" — so:
 *
 *   - `'on'` (a level-0 character): deleting the param would hand them straight
 *     back to the filtered board, so the explicit `0` is written out.
 *   - `'off'` / `'unavailable'`: off IS the default, so spelling it out would
 *     leave a param behind on the majority of clears for no effect. Deleting is
 *     both the honest clear and the clean address `nextFilterParams` aims for.
 *
 * Both branches end in the same place — `readTaskFilters` reading `false` — and
 * `taskFilterParams.test.ts` asserts that round trip rather than the string.
 */
export function clearedFilterParams(
  previous: URLSearchParams,
  eligibilityDefault: EligibilityDefault,
): URLSearchParams {
  const next = new URLSearchParams(previous)
  for (const key of Object.values(TASK_FILTER_PARAMS)) next.delete(key)
  next.delete(SEARCH_QUERY_PARAM)
  if (eligibilityDefault === 'on') next.set(TASK_FILTER_PARAMS.canSignUp, CAN_SIGN_UP_OFF)
  return next
}

/**
 * How many axes are narrowing the list — the input to `selectEmptyState`.
 *
 * It counts the SEARCH box, which raises no chip in the bar but absolutely
 * narrows the list. Without it, "search for xyzzy with eligibility on" would
 * pick the caught-up empty state and claim nothing is open to you, when the
 * search is what emptied the page — the same unchecked claim `selectEmptyState`
 * exists to avoid.
 */
export function appliedFilterCount(state: TasksState): number {
  return (
    state.selectedFactions.length +
    (state.taskType === TASK_TYPE_DEFAULT ? 0 : 1) +
    (state.sort === TASK_SORT_DEFAULT ? 0 : 1) +
    (state.status === TASK_STATUS_DEFAULT ? 0 : 1) +
    (state.canSignUp ? 1 : 0) +
    (state.query.trim() ? 1 : 0)
  )
}

/** The task browse's own empty state, beside the three `selectEmptyState` owns. */
export const PENDING_WINDOW_EMPTY = 'pendingWindow' as const

/**
 * Which empty state the TASK list gets — `selectEmptyState` plus one axis only
 * this page has (#1695).
 *
 * A proposal is admin-only for its first `pending_task_admin_review_hours`, so a
 * level-3 player can open the pending tab their unlock earned them, find nothing
 * ripe, and read the generic "No tasks match your filters" as a broken filter.
 *
 * Two guards, both for the reason `selectEmptyState` states about `caughtUp`:
 * with a SECOND filter applied, "nothing has ripened" is unknowable from here,
 * so the honest answer is the filtered sentence; and with the window unknown
 * (`/game-config` not landed) the sentence has no number to give, so it defers
 * rather than assuming one. Split out of `TaskListEmpty` so the decision is a
 * pure function — the harness runs no effects, so a hook-shaped version of this
 * branch could never be driven.
 */
export function selectTaskEmptyState(
  status: string,
  appliedCount: number,
  canSignUp: boolean,
  adminReviewHours: number | null,
): EmptyStateKind | typeof PENDING_WINDOW_EMPTY {
  if (status === 'pending' && appliedCount === 1 && adminReviewHours !== null) {
    return PENDING_WINDOW_EMPTY
  }
  return selectEmptyState(appliedCount, canSignUp)
}

export interface TasksState {
  // Viewer
  user: CurrentUser | null

  // Data
  tasks: TaskOut[]
  loading: boolean
  error: Error | null

  // Reference data
  factions: FactionOut[]
  factionConfigs: FactionConfigOut[]
  /** Viewer-gated: `retired` / `pending` only for a viewer allowed to see them. */
  statusFilters: string[]

  // Filter state. Every setter writes the URL and resets the growing window.
  /**
   * Browse mode (#934): 'standard' lists ordinary tasks (the default, metatasks
   * excluded backend-side), 'metatask' lists issuing-faction metatask rows —
   * informational, never signed up for.
   */
  taskType: TaskType
  setTaskType: (taskType: TaskType) => void
  /** Ordering (#1364). Defaults to `level`; see {@link TASK_SORT_DEFAULT}. */
  sort: TaskSort
  setSort: (sort: TaskSort) => void
  status: string
  setStatus: (status: string) => void
  /** Faction multi-select — a union, empty meaning "every faction". */
  selectedFactions: string[]
  setSelectedFactions: (slugs: string[]) => void
  /**
   * "Tasks I can sign up for" (#1130). Defaults **ON** for a level-0 character,
   * OFF for one past that, and is unavailable to a viewer carrying none
   * (#1972, #2025) — see {@link EligibilityDefault} and
   * {@link readTaskFilters}. Callers hide the control entirely for a viewer
   * with no character: the server answers `[]` for an anonymous viewer, so it
   * is a control that cannot work.
   */
  canSignUp: boolean
  setCanSignUp: (canSignUp: boolean) => void
  /** Raw search box value (bind directly); the fetch reads a debounced copy (#661). */
  query: string
  setQuery: (query: string) => void
  /** Every axis back to its default, search included. */
  clearFilters: () => void

  // Growing window (#645).
  hasMore: boolean
  loadMore: () => void

  // Signup — `useTaskSignup`, re-exported so a browse skin takes one state
  // object rather than calling the hook a second time beside this one.
  signupMsg: string | null
  handleSignup: (id: number) => Promise<void>

  /**
   * Derived helper — base × the viewer's faction modifier, as one combined
   * number. Task cards no longer take it (they take base and the factor apart,
   * ADR-0055); it stays for any surface that wants the single figure.
   */
  displayPointsFor: (task: TaskOut) => number
  /**
   * Derived helper — the RAW own/other task modifier the viewer earns on a
   * task. Task cards render this beside base points instead of taking the
   * product (ADR-0055); it is 1.0 for every faction at `era_1` values, so no
   * card shows a modifier badge today.
   */
  displayMultiplierFor: (task: TaskOut) => number
}

export function useTasks(): TasksState {
  const { user, loading: authLoading } = useAuth()
  // The server's answer, not a level compared here (`api/auth.ts`). The flag is
  // false for a viewer carrying no character, so the character check is what
  // separates 'unavailable' from 'off' — the axis being absent from a
  // stranger's board is a different fact from it opening wide for a player.
  const eligibilityDefault: EligibilityDefault = !user?.character
    ? 'unavailable'
    : user.task_browse_defaults_to_eligible
      ? 'on'
      : 'off'

  /**
   * Hold the read while the viewer is still unknown (#1972).
   *
   * The eligibility default is viewer-relative, so a cold load cannot resolve
   * it until `/auth/me` answers. Fetching anyway would send a signed-in player
   * the full board and then swap it for their eligible one: two trips on the
   * heaviest read on the site, and a visible jump from 65 rows to 1.
   *
   * `hadSessionLastVisit` is a HINT and nothing renders off it (#1380) — it
   * only decides whether to wait, so a stale hint costs a wait or an extra
   * fetch, never a wrong list. A stranger has no hint, does not wait, and still
   * paints on one round trip, which is the property #1229 was protecting.
   */
  const viewerPending = authLoading && hadSessionLastVisit()

  // One `/factions` read for the whole app (#1284) and one `/game-config`
  // (#1141) — both from shared module caches, derived rather than mirrored into
  // local `useState`s.
  // Both slices are empty until it lands, which is what they were before: the
  // faction modifier settles at 1.0.
  const factions: FactionOut[] = useFactions() ?? []
  const gameConfig = useGameConfig()
  const factionConfigs: FactionConfigOut[] = gameConfig?.factions ?? []

  const [searchParams, setSearchParams] = useSearchParams()
  const {
    taskType,
    sort,
    status,
    factions: selectedFactions,
    canSignUp,
  } = readTaskFilters(searchParams, eligibilityDefault)
  const [query, setQueryState] = useSearchQueryParam()
  const { signupMsg, handleSignup } = useTaskSignup()

  // Debounced so a refetch fires once the typing settles, not per keystroke —
  // the same 200ms the praxis feed uses (#644).
  const debouncedQuery = useDebouncedValue(query, 200)

  const trimmedQuery = debouncedQuery.trim()
  // `getAll` hands back a fresh array every render, so the dep key is the joined
  // string; the array itself only reaches the request body.
  const factionKey = selectedFactions.join(',')
  const { data, loading, error, hasMore, loadMore, resetWindow } = usePagedResource(
    (limit) =>
      viewerPending
        ? Promise.resolve<TaskOut[]>([])
        : listTasks({
            // 'standard' → omit task_type so the backend applies its default
            // (metatasks excluded); 'metatask' → list only metatask rows.
            task_type: taskType === 'metatask' ? 'metatask' : undefined,
            status: status === TASK_STATUS_DEFAULT ? undefined : status,
            faction: selectedFactions.length > 0 ? selectedFactions : undefined,
            // Every default is omitted rather than spelled out, so the common
            // request keeps the exact shape it had before the axis existed. An
            // absent `sort` already means level-ascending server-side.
            sort: sort === TASK_SORT_DEFAULT ? undefined : sort,
            can_sign_up: canSignUp || undefined,
            q: trimmedQuery || undefined,
            // No `exclude_character_id`, deliberately (#2264). "A task you are
            // already working" is gate 5 of the sign-up predicate, so the
            // `can_sign_up` above already carries it and #1229's hiding is
            // intact on the default view. Switching the eligibility filter off
            // drops the whole predicate, gate 5 with it, which is what makes
            // "All tasks" mean all tasks. Echoing the character id back here
            // would add an auth-dependent dep and buy nothing.
            limit,
          }),
    [taskType, sort, status, factionKey, canSignUp, trimmedQuery, viewerPending],
    PAGE_LIMIT,
    // No cache while the viewer is unknown: that read resolves `[]` without
    // asking the server, and holding a placeholder under a key is worse than
    // not holding one. The key carries the viewer for the reason `TaskOut`
    // gives — `can_sign_up` and friends are computed for the caller.
    viewerPending ? undefined : { cache: TASK_PAGE_CACHE, viewer: viewerCacheKey(user) },
  )
  const tasks = data ?? []

  // Every filter change resets the window so "load more" can't strand a grown
  // page against a freshly-narrowed result set.
  const writeParams = (
    build: (previous: URLSearchParams) => URLSearchParams,
  ): void => {
    setSearchParams(build, FILTER_NAV_OPTIONS)
    resetWindow()
  }
  const setAxis = (key: string, value: string, defaultValue: string): void =>
    writeParams((previous) => nextFilterParams(previous, key, value, defaultValue))

  const setTaskType = (next: TaskType) =>
    setAxis(TASK_FILTER_PARAMS.taskType, next, TASK_TYPE_DEFAULT)
  const setSort = (next: TaskSort) =>
    setAxis(TASK_FILTER_PARAMS.sort, next, TASK_SORT_DEFAULT)
  const setStatus = (next: string) =>
    setAxis(TASK_FILTER_PARAMS.status, next, TASK_STATUS_DEFAULT)
  const setSelectedFactions = (slugs: string[]) =>
    writeParams((previous) => nextFactionParams(previous, slugs))
  // Both states are written out, unlike every other axis: '' is not a value
  // this axis can take, so the "same as default → delete" branch never fires
  // and an omitted param keeps meaning "whatever your default is".
  const setCanSignUp = (next: boolean) =>
    setAxis(
      TASK_FILTER_PARAMS.canSignUp,
      next ? CAN_SIGN_UP_ON : CAN_SIGN_UP_OFF,
      '',
    )
  const setQuery = (next: string) => { setQueryState(next); resetWindow() }
  const clearFilters = () =>
    writeParams((previous) => clearedFilterParams(previous, eligibilityDefault))

  const statusFilters = [TASK_STATUS_DEFAULT, 'active']
  if (user?.can_see_retired_tasks) statusFilters.push('retired')
  if (user?.can_see_pending_tasks) statusFilters.push('pending')

  const displayPointsFor = (task: TaskOut): number =>
    computeDisplayPoints(
      task.point_value,
      user?.character?.faction_slug,
      task.primary_faction_slug,
      factionConfigs,
    )

  const displayMultiplierFor = (task: TaskOut): number =>
    computeFactionMultiplier(
      user?.character?.faction_slug,
      task.primary_faction_slug,
      factionConfigs,
    )

  return {
    user,

    tasks,
    // The held read is a load, not an empty board: `viewerPending` returns no
    // rows, and every consumer's `loading && tasks.length === 0` branch is what
    // keeps the empty state off the screen until the viewer is known.
    loading: loading || viewerPending,
    error,

    factions,
    factionConfigs,
    statusFilters,

    taskType,
    setTaskType,
    sort,
    setSort,
    status,
    setStatus,
    selectedFactions,
    setSelectedFactions,
    canSignUp,
    setCanSignUp,
    query,
    setQuery,
    clearFilters,

    hasMore,
    loadMore,

    signupMsg,
    handleSignup,

    displayPointsFor,
    displayMultiplierFor,
  }
}
