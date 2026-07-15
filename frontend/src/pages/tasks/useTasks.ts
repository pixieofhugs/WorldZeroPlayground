/**
 * useTasks — extracts every piece of state and async behaviour from the
 * legacy Tasks.tsx (browse/list page) so the desktop flex-wrap list and the
 * mobile single-column skin can share one data-plumbing contract. Mirrors the
 * taskDetail/useTaskDetail.ts extraction pattern (#494).
 *
 * Behaviour preserved 1:1 from the original page (status/faction/level
 * filters refetch, signup → navigate-to-edit, per-task display points). The
 * only addition is `sort`, which was previously never sent to listTasks() —
 * wiring it through is additive and defaults to the prior (unsorted / level-
 * points) behaviour, so it is not a behaviour change for existing callers.
 */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listTasks, type TaskOut } from '../../api/tasks'
import { createPraxis } from '../../api/praxis'
import { getFactions, type FactionOut } from '../../api/factions'
import { getGameConfig, type FactionConfigOut } from '../../api/gameConfig'
import { extractError } from '../../utils/errors'
import { useAuth } from '../../auth/AuthContext'
import { computeDisplayPoints } from '../../utils/points'

/** Level filter node values — shared by the desktop FilterLevelNodes row and
 *  the mobile chip row so both surfaces filter on the same set. */
export const LEVEL_FILTERS = [0, 1, 2, 3, 4, 5]

export interface TasksState {
  tasks: TaskOut[]
  factions: FactionOut[]
  factionConfigs: FactionConfigOut[]

  status: string
  setStatus: (status: string) => void
  faction: string
  setFaction: (faction: string) => void
  level: number | ''
  setLevel: (level: number | '') => void
  /** '' (default) sorts by level/points; 'newest' orders by creation time —
   *  mirrors TaskFilters['sort'] in api/tasks.ts. */
  sort: string
  setSort: (sort: string) => void

  /** Status stamp options available to the current viewer (retired/pending
   *  gated behind the matching `can_see_*` viewer flags). */
  statusFilters: string[]

  loading: boolean
  fetchError: string | null

  signupMsg: { id: number; msg: string; ok: boolean } | null
  handleSignup: (id: number) => Promise<void>

  /** True once a viewer is authenticated — gates the desktop card's signup CTA. */
  isLoggedIn: boolean

  /** Viewer's own character's faction. This page shows a *mixed* list of tasks
   *  across every faction, so unlike Task Detail there is no single task
   *  faction to key a page-chrome dispatch on; the mobile dispatcher keys on
   *  this instead (see Tasks.tsx). */
  viewerFactionSlug: string | null

  displayPointsFor: (task: TaskOut) => number
}

export function useTasks(): TasksState {
  const { user } = useAuth()
  const navigate = useNavigate()
  const characterId = user?.character?.id

  const [tasks, setTasks] = useState<TaskOut[]>([])
  const [factions, setFactions] = useState<FactionOut[]>([])
  const [factionConfigs, setFactionConfigs] = useState<FactionConfigOut[]>([])
  const [status, setStatus] = useState('All')
  const [faction, setFaction] = useState('')
  const [level, setLevel] = useState<number | ''>('')
  const [sort, setSort] = useState('')
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [signupMsg, setSignupMsg] = useState<{ id: number; msg: string; ok: boolean } | null>(null)

  useEffect(() => {
    getFactions().then(setFactions).catch(() => {})
    getGameConfig()
      .then((config) => setFactionConfigs(config.factions))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setFetchError(null)
    listTasks({
      status: status === 'All' ? undefined : status,
      faction: faction || undefined,
      level: level === '' ? undefined : level,
      sort: sort || undefined,
      exclude_character_id: characterId,
    })
      .then(setTasks)
      .catch((err) => setFetchError(extractError(err, "Couldn't load tasks.")))
      .finally(() => setLoading(false))
  }, [status, faction, level, sort, characterId])

  const handleSignup = useCallback(
    async (id: number) => {
      setSignupMsg(null)
      try {
        const praxis = await createPraxis({ task_id: id, type: 'solo' })
        navigate(`/praxes/${praxis.id}/edit`)
      } catch (err) {
        setSignupMsg({ id, msg: extractError(err, 'Could not sign up — make sure you are logged in.'), ok: false })
      }
    },
    [navigate],
  )

  const statusFilters = ['All', 'active']
  if (user?.can_see_retired_tasks) statusFilters.push('retired')
  if (user?.can_see_pending_tasks) statusFilters.push('pending')

  const displayPointsFor = useCallback(
    (task: TaskOut) =>
      computeDisplayPoints(
        task.point_value,
        user?.character?.faction_slug,
        task.primary_faction_slug,
        factionConfigs,
      ),
    [user?.character?.faction_slug, factionConfigs],
  )

  return {
    tasks,
    factions,
    factionConfigs,

    status,
    setStatus,
    faction,
    setFaction,
    level,
    setLevel,
    sort,
    setSort,

    statusFilters,

    loading,
    fetchError,

    signupMsg,
    handleSignup,

    isLoggedIn: !!user,
    viewerFactionSlug: user?.character?.faction_slug ?? null,

    displayPointsFor,
  }
}
