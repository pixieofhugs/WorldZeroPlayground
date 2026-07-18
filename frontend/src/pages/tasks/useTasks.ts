/**
 * useTasks — the shared task-browse data + filter state, extracted verbatim from
 * the legacy Tasks.tsx so the desktop list and the mobile browse skin consume
 * one source of truth (mirrors useTaskDetail for the detail page).
 *
 * The factions/factionConfigs fetch on mount, the status/faction/level filter
 * state, the task read keyed on those filters + the viewer's character id, and
 * the signup → navigate-to-edit handler with its inline message. The read runs
 * through the shared `usePagedResource` growing window (#645): filter setters
 * reset the window and a full page exposes "load more".
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listTasks, type TaskOut } from '../../api/tasks'
import { createPraxis } from '../../api/praxis'
import { getFactions, type FactionOut } from '../../api/factions'
import { getGameConfig, type FactionConfigOut } from '../../api/gameConfig'
import { extractError } from '../../utils/errors'
import { useAuth } from '../../auth/AuthContext'
import { computeDisplayPoints } from '../../utils/points'
import { usePagedResource } from '../../hooks/usePagedResource'
import type { CurrentUser } from '../../api/auth'

export const LEVEL_FILTERS = [0, 1, 2, 3, 4, 5]

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
  levelFilters: number[]
  statusFilters: string[]

  // Filter state (setters reset the growing window).
  status: string
  setStatus: (status: string) => void
  faction: string
  setFaction: (faction: string) => void
  level: number | ''
  setLevel: (level: number | '') => void

  // Growing window (#645).
  hasMore: boolean
  loadMore: () => void

  // Signup
  signupMsg: SignupMessage | null
  handleSignup: (id: number) => Promise<void>

  // Derived helper — the modified point value for a task given the viewer's faction.
  displayPointsFor: (task: TaskOut) => number
}

export function useTasks(): TasksState {
  const { user } = useAuth()
  const navigate = useNavigate()
  const characterId = user?.character?.id

  const [factions, setFactions] = useState<FactionOut[]>([])
  const [factionConfigs, setFactionConfigs] = useState<FactionConfigOut[]>([])
  const [status, setStatusState] = useState('All')
  const [faction, setFactionState] = useState('')
  const [level, setLevelState] = useState<number | ''>('')
  const [signupMsg, setSignupMsg] = useState<SignupMessage | null>(null)

  useEffect(() => {
    getFactions().then(setFactions).catch(() => {})
    getGameConfig()
      .then((config) => setFactionConfigs(config.factions))
      .catch(() => {})
  }, [])

  const { data, loading, error, hasMore, loadMore, resetWindow } = usePagedResource(
    (limit) =>
      listTasks({
        status: status === 'All' ? undefined : status,
        faction: faction || undefined,
        level: level === '' ? undefined : level,
        exclude_character_id: characterId,
        limit,
      }),
    [status, faction, level, characterId],
    PAGE_LIMIT,
  )
  const tasks = data ?? []

  // Every filter change resets the window so "load more" can't strand a grown
  // page against a freshly-narrowed result set.
  const setStatus = (next: string) => { setStatusState(next); resetWindow() }
  const setFaction = (next: string) => { setFactionState(next); resetWindow() }
  const setLevel = (next: number | '') => { setLevelState(next); resetWindow() }

  const handleSignup = async (id: number) => {
    setSignupMsg(null)
    try {
      const praxis = await createPraxis({ task_id: id, type: 'solo' })
      navigate(`/praxes/${praxis.id}/edit`)
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

  return {
    user,

    tasks,
    loading,
    error,

    factions,
    factionConfigs,
    levelFilters: LEVEL_FILTERS,
    statusFilters,

    status,
    setStatus,
    faction,
    setFaction,
    level,
    setLevel,

    hasMore,
    loadMore,

    signupMsg,
    handleSignup,

    displayPointsFor,
  }
}
