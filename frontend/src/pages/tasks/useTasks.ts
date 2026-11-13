/**
 * useTasks: shared task-browse data + filter state for desktop and mobile.
 *
 * Every axis lives in the URL (#1367), no mirrored `useState`; writes replace,
 * not push, so Back leaves the page. Search is debounced 200ms; the read is a
 * `usePagedResource` growing window (#645). `canSignUp` asks the server (#1130),
 * so no era rule is read here. Eligibility's default is viewer-relative; see
 * {@link EligibilityDefault}.
 */
import { useSearchParams } from 'react-router-dom'
import {
  listTasks,
  type TaskOut,
  type TaskSort,
  type TaskType,
} from '../../api/tasks'
import type { FactionOut } from '../../api/factions'
import {
  selectEmptyState,
  type EmptyStateKind,
} from '../../components/ui/FilterBar'
import { useFactions } from '../../hooks/useFactions'
import { readOneOf } from '../../utils/urlParams'
import { hadSessionLastVisit, useAuth } from '../../auth/AuthContext'
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
 * The browse's first page per filter combination, Class B (ADR-0072, #2432).
 * Keyed on viewer + every URL axis. Module scope so both skins share it.
 */
const TASK_PAGE_CACHE = createKeyedResourceCache<TaskOut[]>(AMBIENT_TTL_MS)

/** The URL params the task browse owns besides `?q=`; "clear all" enumerates them. */
export const TASK_FILTER_PARAMS = {
  taskType: 'type',
  sort: 'sort',
  status: 'status',
  faction: 'faction',
  canSignUp: 'can_sign_up',
} as const

/** `All` is the page's own "no filter" value; the rest are `TaskStatus`. */
type TaskStatusFilter = 'All' | 'active' | 'retired' | 'pending'

export const TASK_TYPE_DEFAULT: TaskType = 'standard'
/** `level_required ASC, point_value DESC`, what an absent `sort` means server-side. */
export const TASK_SORT_DEFAULT: TaskSort = 'level'
export const TASK_STATUS_DEFAULT: TaskStatusFilter = 'All'
/** Tri-state (#1972): `1` on, `0` off, absent = this viewer's default. */
export const CAN_SIGN_UP_ON = '1'
export const CAN_SIGN_UP_OFF = '0'

/**
 * What eligibility means for this viewer (#2025):
 *   - `'unavailable'`: no character; axis forced off, rail hidden.
 *   - `'off'`: past level 0; board opens whole.
 *   - `'on'`: level 0; board opens on what they can start.
 * From `task_browse_defaults_to_eligible` + carrying a character, never a level.
 */
export type EligibilityDefault = 'unavailable' | 'off' | 'on'

/**
 * Legal values per enumerated axis (#1537): `GET /tasks` 422s on unknowns.
 * Status is whitelisted against every status, not viewer-gated `statusFilters`,
 * which settle after `/auth/me` and would flip a shared link mid-load.
 */
const TASK_TYPES: readonly TaskType[] = ['standard', 'metatask']
const TASK_SORTS: readonly TaskSort[] = ['newest', 'oldest', 'level']
const TASK_STATUSES: readonly TaskStatusFilter[] = [
  'All',
  'active',
  'retired',
  'pending',
]

const FILTER_NAV_OPTIONS = { replace: true } as const

interface TaskFilterAxes {
  taskType: TaskType
  sort: TaskSort
  status: TaskStatusFilter
  factions: string[]
  canSignUp: boolean
}

/**
 * Hydrate the whole filter set from a param set (pure, for the no-DOM harness).
 * Enumerated axes clamp to defaults. An explicit eligibility param beats the
 * viewer default both ways, except `'unavailable'` is always off: a pasted `=1`
 * never empties a stranger's board.
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
    // Unknown slugs pass through; they just match no rows.
    factions: params.getAll(TASK_FILTER_PARAMS.faction).filter((slug) => slug !== ''),
    // Anything unreadable falls through to the viewer's default.
    canSignUp:
      eligibilityDefault !== 'unavailable' &&
      (asked === CAN_SIGN_UP_ON ||
        (asked !== CAN_SIGN_UP_OFF && eligibilityDefault === 'on')),
  }
}

/** The next param set for one axis; a default value is removed from the URL. */
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
 * Every axis off, search included; params this page doesn't own are kept.
 * "Off", not "default": for `'on'` viewers the explicit `0` is written (#2025).
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
 * How many axes narrow the list, for `selectEmptyState`. Counts search (no chip)
 * so a search-emptied list isn't misreported as caught-up.
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
 * `selectEmptyState` plus the pending-review window (#1695): proposals are
 * admin-only for `pending_task_admin_review_hours`. Claimed only when pending is
 * the sole filter and the window is known.
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
  /** Viewer-gated: `retired` / `pending` only for a viewer allowed to see them. */
  statusFilters: string[]

  // Filter state. Every setter writes the URL and resets the growing window.
  /** #934: 'metatask' lists issuing-faction rows, never signed up for. */
  taskType: TaskType
  setTaskType: (taskType: TaskType) => void
  sort: TaskSort
  setSort: (sort: TaskSort) => void
  status: string
  setStatus: (status: string) => void
  /** A union; empty means every faction. */
  selectedFactions: string[]
  setSelectedFactions: (slugs: string[]) => void
  /** "Tasks I can sign up for" (#1130); default per {@link EligibilityDefault}. */
  canSignUp: boolean
  setCanSignUp: (canSignUp: boolean) => void
  /** Raw search box value; the fetch reads a debounced copy (#661). */
  query: string
  setQuery: (query: string) => void
  clearFilters: () => void

  // Growing window (#645).
  hasMore: boolean
  loadMore: () => void

  // `useTaskSignup`, re-exported so a skin takes one state object.
  signupMsg: string | null
  handleSignup: (id: number) => Promise<void>

  /** Base × faction modifier as one number; cards take them apart (ADR-0055). */
  displayPointsFor: (task: TaskOut) => number
  /** The raw faction modifier cards render beside base points (ADR-0055). */
  displayMultiplierFor: (task: TaskOut) => number
}

export function useTasks(): TasksState {
  const { user, loading: authLoading } = useAuth()
  // The server's flag, never a level compared here (`api/auth.ts`).
  const eligibilityDefault: EligibilityDefault = !user?.character
    ? 'unavailable'
    : user.task_browse_defaults_to_eligible
      ? 'on'
      : 'off'

  /**
   * Hold the read while the viewer is unknown (#1972), or a signed-in player
   * gets the full board then a jump to their eligible one. `hadSessionLastVisit`
   * is only a hint for whether to wait (#1380); a stranger never waits.
   */
  const viewerPending = authLoading && hadSessionLastVisit()

  // One app-wide `/factions` read (#1284); empty until it lands.
  const factions: FactionOut[] = useFactions() ?? []

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

  // Same 200ms as the praxis feed (#644).
  const debouncedQuery = useDebouncedValue(query, 200)

  const trimmedQuery = debouncedQuery.trim()
  // `getAll` returns a fresh array each render, so the dep is the joined string.
  const factionKey = selectedFactions.join(',')
  const { data, loading, error, hasMore, loadMore, resetWindow } = usePagedResource(
    (limit) =>
      viewerPending
        ? Promise.resolve<TaskOut[]>([])
        : listTasks({
            // 'standard' omits task_type: the backend default excludes metatasks.
            task_type: taskType === 'metatask' ? 'metatask' : undefined,
            status: status === TASK_STATUS_DEFAULT ? undefined : status,
            faction: selectedFactions.length > 0 ? selectedFactions : undefined,
            // Defaults omitted; absent `sort` means level-ascending server-side.
            sort: sort === TASK_SORT_DEFAULT ? undefined : sort,
            can_sign_up: canSignUp || undefined,
            q: trimmedQuery || undefined,
            // No `exclude_character_id` (#2264): `can_sign_up` already hides
            // tasks you're working, and "All tasks" should mean all tasks.
            limit,
          }),
    [taskType, sort, status, factionKey, canSignUp, trimmedQuery, viewerPending],
    PAGE_LIMIT,
    // No cache for the held `[]` placeholder. Viewer-keyed: `can_sign_up` etc.
    // are computed for the caller.
    viewerPending ? undefined : { cache: TASK_PAGE_CACHE, viewer: viewerCacheKey(user) },
  )
  const tasks = data ?? []

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
  // Default '' never matches, so both states are always written out.
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
    Math.round(task.point_value * task.viewer_faction_multiplier)

  const displayMultiplierFor = (task: TaskOut): number => task.viewer_faction_multiplier

  return {
    user,

    tasks,
    // The held read is a load, not an empty board.
    loading: loading || viewerPending,
    error,

    factions,
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
