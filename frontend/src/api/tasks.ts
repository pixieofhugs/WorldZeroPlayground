import api from './axios'
import type { PraxisType } from './praxis'

export type TaskType = 'standard' | 'metatask'

export interface TaskOut {
  id: number
  title: string
  description: string | null
  point_value: number
  level_required: number
  status: string
  task_type: TaskType
  created_by: number
  primary_faction_slug: string | null
  metatask_faction_slug: string | null
  created_at: string
  // Derived, read-time count of characters actively working on this task —
  // active-signup population (in_progress + pending), consistent with
  // GET /tasks/{id}/signups (#1021). Always present on a live backend
  // response; optional here (rather than a mechanical update of every
  // existing TaskOut test fixture, which is out of this backend-scoped
  // change's remit) so pre-#1021 mocks stay valid. Consumers should treat
  // an absent value as 0.
  in_progress_count?: number
  // The proposing character, for the task-detail author row (#1029).
  // `created_by` above stays the bare id (what a profile link needs); these
  // four are the denormalised byline. Always present on a live backend
  // response; optional here for the same reason `in_progress_count` is, so
  // pre-#1029 mocks stay valid. Treat an absent name/avatar as '' and an
  // absent level as 0.
  created_by_display_name?: string
  created_by_avatar_url?: string
  // The author's MEMBER faction, not the task's `primary_faction_slug`.
  created_by_faction_slug?: string | null
  // The author's level in the current era.
  created_by_level?: number
  // Server-driven viewer-specific flags. Backend computes these for the
  // authenticated viewer. Default to permissive values when absent (older
  // clients / unauthenticated reads).
  can_sign_up: boolean
  allowed_modes: string[]
  eligible_for_current_user: boolean
  // Why sign-up is open or shut for this viewer — the flag above says whether,
  // this says which, so the CTA can read "Begin again" without the client
  // re-deriving a server rule (#1497). A live backend response ALWAYS carries the
  // key (null when there is nothing to explain, e.g. an anonymous read); optional
  // here for the same reason `in_progress_count` is — so existing TaskOut fixtures
  // stay valid rather than taking a mechanical edit. `signupCtaKey` maps absent,
  // null and unrecognised alike to the plain CTA, so the widening is inert.
  signup_reason?: string | null
}

export interface TaskCreate {
  title: string
  description?: string
  point_value: number
  level_required: number
  primary_faction_slug?: string
  // Metatask branch — optional; when task_type='metatask' the backend
  // expects metatask_faction_slug too.
  task_type?: TaskType
  metatask_faction_slug?: string
}

/**
 * The orderings `GET /tasks` accepts (#1364). An ABSENT sort still means
 * `level` — `level_required ASC, point_value DESC`, the browse ordering the
 * page has always had. `level` is ascending only; there is no descending twin.
 */
export type TaskSort = 'newest' | 'oldest' | 'level'

export interface TaskFilters {
  status?: string
  /**
   * Repeated `?faction=` — a UNION, not an intersection (#1364). One slug
   * narrows to one faction; none at all filters nothing. See
   * {@link REPEATED_QUERY_PARAMS} for why the serializer is not the default.
   */
  faction?: string[]
  /**
   * Narrow the list to tasks the authenticated viewer could claim right now
   * (#1130). The server evaluates its own sign-up predicate, so a faction
   * ability that bends the level bar (WOW's once-a-level jump, the Ephemerists'
   * retired-task access) is honoured without the client knowing any rule.
   * Replaces the old `level` filter, which asked a question the game does not
   * answer. Anonymous callers get an empty list — hence the hidden control.
   */
  can_sign_up?: boolean
  created_by?: number
  task_type?: TaskType
  /**
   * Free-text search over task title, task description, and author name/handle
   * (#661; author axis added in #681).
   */
  q?: string
  sort?: TaskSort
  limit?: number
  offset?: number
}

/**
 * Axios renders an array param as `faction[]=a&faction[]=b` by default. FastAPI
 * reads a repeated `faction: list[str] = Query(None)` — the bracketed key is
 * simply not the parameter, so the union filter would silently do NOTHING and
 * the page would show an unfiltered list with faction chips on it.
 * `indexes: null` is axios's "repeat the bare key" mode.
 */
export const REPEATED_QUERY_PARAMS = { indexes: null } as const

export async function listTasks(filters?: TaskFilters): Promise<TaskOut[]> {
  const { data } = await api.get<TaskOut[]>('/tasks', {
    params: filters,
    paramsSerializer: REPEATED_QUERY_PARAMS,
  })
  return data
}

export async function getTask(id: number): Promise<TaskOut> {
  const { data } = await api.get<TaskOut>(`/tasks/${id}`)
  return data
}

export async function proposeTask(body: TaskCreate): Promise<TaskOut> {
  const { data } = await api.post<TaskOut>('/tasks', body)
  return data
}

/**
 * One row of GET /tasks/{id}/signups.
 *
 * This mirrors the backend `TaskSignupOut`, which is now the route's real
 * `response_model` — it was `list[dict]`, so this type described a schema the
 * route did not actually return (#1051). The two fields that were wrong:
 * `status` was never emitted (the route sends the praxis's *type*), and
 * `signed_up_at` is really `joined_at`.
 */
export interface TaskSignupOut {
  character_id: number
  display_name: string
  avatar_url: string
  faction_slug: string
  // Current-era level, for the roster row's "lvl N" (#1029). Always present on
  // a live backend response; optional here so pre-#1029 mocks stay valid.
  level?: number
  /** Which kind of praxis the character is working the task through. */
  praxis_type: PraxisType
  /** When the character joined the praxis (`PraxisMember.joined_at`). */
  joined_at: string
}

/**
 * No callers as of #1262, deliberately.
 *
 * `useTaskDetail` used to call this on every task-detail load and discard the
 * result — no skin rendered a roster (owner ruling 2026-07-28, reversing epic
 * #1028 decision 3) and it was the slowest request in its wave. The route,
 * `TaskSignupOut` and this client survive because "who signed up for this task"
 * is a plausible future surface and they cost nothing at rest. Calling it again
 * means adding a round trip, so it wants a designed consumer, not a re-wire.
 */
export async function getTaskSignups(taskId: number): Promise<TaskSignupOut[]> {
  const { data } = await api.get<TaskSignupOut[]>(`/tasks/${taskId}/signups`)
  return data
}
