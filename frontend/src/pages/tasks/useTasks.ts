/**
 * useTasks — the shared task-browse data + filter state, so the desktop list and
 * the mobile browse skin consume one source of truth (mirrors useTaskDetail for
 * the detail page).
 *
 * The factions/factionConfigs reads (both app-wide cached hooks), the filter
 * state, the task read keyed on those filters, and the signup →
 * navigate-to-edit handler with its inline message.
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
 */
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  listTasks,
  type TaskOut,
  type TaskSort,
  type TaskType,
} from '../../api/tasks'
import { createPraxis } from '../../api/praxis'
import type { FactionOut } from '../../api/factions'
import type { FactionConfigOut } from '../../api/gameConfig'
import { useFactions } from '../../hooks/useFactions'
import { useGameConfig } from '../../hooks/useGameConfig'
import { extractError } from '../../utils/errors'
import { readOneOf } from '../../utils/urlParams'
import { useAuth } from '../../auth/AuthContext'
import { computeDisplayPoints, computeFactionMultiplier } from '../../utils/points'
import { usePagedResource } from '../../hooks/usePagedResource'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import {
  SEARCH_QUERY_PARAM,
  useSearchQueryParam,
} from '../../hooks/useSearchQueryParam'
import type { CurrentUser } from '../../api/auth'

/** How many rows a page fetches; "load more" grows the window by this step. */
const PAGE_LIMIT = 50

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
/** The eligibility axis is a flag; this is its one non-default value. */
export const CAN_SIGN_UP_ON = '1'

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
 */
export function readTaskFilters(params: URLSearchParams): TaskFilterAxes {
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
    canSignUp: params.get(TASK_FILTER_PARAMS.canSignUp) === CAN_SIGN_UP_ON,
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
 * Every axis back to its default, search included — what "clear all filters"
 * means. Params this page does not own are left alone.
 */
export function clearedFilterParams(previous: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(previous)
  for (const key of Object.values(TASK_FILTER_PARAMS)) next.delete(key)
  next.delete(SEARCH_QUERY_PARAM)
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

export interface SignupMessage {
  id: number
  msg: string
  ok: boolean
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
   * "Tasks I can sign up for" (#1130). Defaults OFF — the tasks page is a
   * catalogue, and hiding most of it by default would make tasks look scarce
   * and tie first paint to auth resolving (against #1229). Callers hide the
   * control entirely when logged out: the server answers `[]` for an anonymous
   * viewer, so it is a control that cannot work.
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

  // Signup
  signupMsg: SignupMessage | null
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
  const { user } = useAuth()
  const navigate = useNavigate()

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
  } = readTaskFilters(searchParams)
  const [query, setQueryState] = useSearchQueryParam()
  const [signupMsg, setSignupMsg] = useState<SignupMessage | null>(null)

  // Debounced so a refetch fires once the typing settles, not per keystroke —
  // the same 200ms the praxis feed uses (#644).
  const debouncedQuery = useDebouncedValue(query, 200)

  const trimmedQuery = debouncedQuery.trim()
  // `getAll` hands back a fresh array every render, so the dep key is the joined
  // string; the array itself only reaches the request body.
  const factionKey = selectedFactions.join(',')
  const { data, loading, error, hasMore, loadMore, resetWindow } = usePagedResource(
    (limit) =>
      listTasks({
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
        // The server excludes the authenticated viewer's own started tasks by
        // default (#1229). Echoing the character id back here added an
        // auth-dependent dep that made the page fetch twice.
        limit,
      }),
    [taskType, sort, status, factionKey, canSignUp, trimmedQuery],
    PAGE_LIMIT,
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
  const setCanSignUp = (next: boolean) =>
    setAxis(TASK_FILTER_PARAMS.canSignUp, next ? CAN_SIGN_UP_ON : '', '')
  const setQuery = (next: string) => { setQueryState(next); resetWindow() }
  const clearFilters = () => writeParams(clearedFilterParams)

  const handleSignup = async (id: number) => {
    setSignupMsg(null)
    try {
      const praxis = await createPraxis({ task_id: id, type: 'solo' })
      navigate(`/praxis/${praxis.id}/edit`)
    } catch (err) {
      setSignupMsg({ id, msg: extractError(err, 'Could not sign up — make sure you are logged in.'), ok: false })
    }
  }

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
    loading,
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
