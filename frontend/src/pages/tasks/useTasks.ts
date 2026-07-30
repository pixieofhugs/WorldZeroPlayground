/**
 * useTasks — the shared task-browse data + filter state, extracted verbatim from
 * the legacy Tasks.tsx so the desktop list and the mobile browse skin consume
 * one source of truth (mirrors useTaskDetail for the detail page).
 *
 * The factions/factionConfigs fetch on mount, the status/faction/level filter
 * state, the task read keyed on those filters + the viewer's character id, and
 * the signup → navigate-to-edit handler with its inline message. The free-text search (#661) rides
 * alongside them, debounced 200ms via `useDebouncedValue` — the idiom #644 set on
 * the praxis feed — but its value lives in the URL (`?q=`, via
 * `useSearchQueryParam`, #660) rather than local state, so a pasted or refreshed
 * link restores it. The read runs through the shared `usePagedResource` growing
 * window (#645): filter setters (search included) reset the window and a full
 * page exposes "load more".
 *
 * The level filter's OPTIONS are not state — they are derived from the live
 * era's `level_thresholds` off the same `/game-config` payload the faction
 * modifiers ride on (#1046), never a hardcoded range. See `./levelFilters.ts`.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listTasks, type TaskOut, type TaskType } from '../../api/tasks'
import { createPraxis } from '../../api/praxis'
import { getFactions, type FactionOut } from '../../api/factions'
import type { FactionConfigOut } from '../../api/gameConfig'
import { useGameConfig } from '../../hooks/useGameConfig'
import { extractError } from '../../utils/errors'
import { useAuth } from '../../auth/AuthContext'
import { computeDisplayPoints, computeFactionMultiplier } from '../../utils/points'
import { usePagedResource } from '../../hooks/usePagedResource'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useSearchQueryParam } from '../../hooks/useSearchQueryParam'
import { levelFiltersFromThresholds } from './levelFilters'
import type { CurrentUser } from '../../api/auth'

/** How many rows a page fetches; "load more" grows the window by this step. */
const PAGE_LIMIT = 50

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
  /**
   * The level values the filter offers, derived from the live era's
   * `level_thresholds` rather than a literal (#1046). Empty until
   * `/game-config` lands — callers hide the control while it is.
   */
  levelFilters: number[]
  statusFilters: string[]

  // Filter state (setters reset the growing window).
  /**
   * Browse mode (#934): 'standard' lists ordinary tasks (the default, metatasks
   * excluded backend-side), 'metatask' lists issuing-faction metatask rows —
   * informational, never signed up for.
   */
  taskType: TaskType
  setTaskType: (taskType: TaskType) => void
  status: string
  setStatus: (status: string) => void
  faction: string
  setFaction: (faction: string) => void
  level: number | ''
  setLevel: (level: number | '') => void
  /** Raw search box value (bind directly); the fetch reads a debounced copy (#661). */
  query: string
  setQuery: (query: string) => void

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

  const [factions, setFactions] = useState<FactionOut[]>([])
  // One `/game-config` read for the whole app (#1141) — the shared cache in
  // `useGameConfig`, derived rather than mirrored into two more `useState`s.
  // Both slices are empty until it lands, which is what they were before: the
  // faction modifier settles at 1.0 and the level filter stays hidden (#1046).
  const gameConfig = useGameConfig()
  const factionConfigs: FactionConfigOut[] = gameConfig?.factions ?? []
  const levelThresholds = gameConfig?.level_thresholds ?? []
  const [taskType, setTaskTypeState] = useState<TaskType>('standard')
  const [status, setStatusState] = useState('All')
  const [faction, setFactionState] = useState('')
  const [level, setLevelState] = useState<number | ''>('')
  const [query, setQueryState] = useSearchQueryParam()
  const [signupMsg, setSignupMsg] = useState<SignupMessage | null>(null)

  // Debounced so a refetch fires once the typing settles, not per keystroke —
  // the same 200ms the praxis feed uses (#644).
  const debouncedQuery = useDebouncedValue(query, 200)

  useEffect(() => {
    getFactions().then(setFactions).catch(() => {})
  }, [])

  const trimmedQuery = debouncedQuery.trim()
  const { data, loading, error, hasMore, loadMore, resetWindow } = usePagedResource(
    (limit) =>
      listTasks({
        // 'standard' → omit task_type so the backend applies its default
        // (metatasks excluded); 'metatask' → list only metatask rows.
        task_type: taskType === 'metatask' ? 'metatask' : undefined,
        status: status === 'All' ? undefined : status,
        faction: faction || undefined,
        level: level === '' ? undefined : level,
        q: trimmedQuery || undefined,
        // The server excludes the authenticated viewer's own started tasks by
        // default (#1229). Echoing the character id back here added an
        // auth-dependent dep that made the page fetch twice.
        limit,
      }),
    [taskType, status, faction, level, trimmedQuery],
    PAGE_LIMIT,
  )
  const tasks = data ?? []

  // Every filter change resets the window so "load more" can't strand a grown
  // page against a freshly-narrowed result set.
  const setTaskType = (next: TaskType) => { setTaskTypeState(next); resetWindow() }
  const setStatus = (next: string) => { setStatusState(next); resetWindow() }
  const setFaction = (next: string) => { setFactionState(next); resetWindow() }
  const setLevel = (next: number | '') => { setLevelState(next); resetWindow() }
  const setQuery = (next: string) => { setQueryState(next); resetWindow() }

  const handleSignup = async (id: number) => {
    setSignupMsg(null)
    try {
      const praxis = await createPraxis({ task_id: id, type: 'solo' })
      navigate(`/praxis/${praxis.id}/edit`)
    } catch (err) {
      setSignupMsg({ id, msg: extractError(err, 'Could not sign up — make sure you are logged in.'), ok: false })
    }
  }

  const statusFilters = ['All', 'active']
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
    levelFilters: levelFiltersFromThresholds(levelThresholds),
    statusFilters,

    taskType,
    setTaskType,
    status,
    setStatus,
    faction,
    setFaction,
    level,
    setLevel,
    query,
    setQuery,

    hasMore,
    loadMore,

    signupMsg,
    handleSignup,

    displayPointsFor,
    displayMultiplierFor,
  }
}
