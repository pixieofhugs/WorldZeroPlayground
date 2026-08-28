import { apiGet, apiPost } from './client'
import type { components } from './generated/schema'

export type TaskType = components['schemas']['TaskType']

/** The three states an admin can move a task between. */
export type TaskStatus = components['schemas']['TaskStatus']

/**
 * A task, as every read surface sees it.
 *
 * Field notes the generated type has nowhere to put:
 *
 * - `description` and `primary_faction_slug` are `string`, never null: both
 *   columns are `nullable=False` on `Task` (`server_default=""` and `"na"`),
 *   and `schemas/task.py` declares both `str`. A cross-faction task is
 *   `'na'`, an undescribed one is `''`.
 * - `in_progress_count` is the derived, read-time count of characters actively
 *   working this task — the active-signup population (in_progress + pending),
 *   the same set `GET /tasks/{id}/signups` exposes (#1021). `0` on a metatask
 *   row, which is never a signup target.
 * - `created_by_display_name` / `_avatar_url` / `_faction_slug` / `_level` are
 *   the denormalised byline (#1029); `created_by` above stays the bare id,
 *   which is what a profile link needs. `created_by_faction_slug` is the
 *   author's MEMBER faction, not the task's `primary_faction_slug` — a Coven
 *   member may propose an `na` task. `created_by_level` is the author's level
 *   in the CURRENT era (ADR-0042). All four default (`''`/`''`/null/`0`) on a
 *   metatask row in a praxis seal stack, which draws no byline.
 * - `can_sign_up`, `allowed_modes` and `eligible_for_current_user` are
 *   viewer-relative, computed server-side for the authenticated caller.
 * - `signup_reason` says WHY sign-up is open or shut for this viewer, where
 *   the flag above says whether — so the CTA can read "Begin again" without
 *   the client re-deriving a server rule (#1497). Null when there is nothing
 *   to explain, e.g. an anonymous read; `signupCtaKey` maps null and
 *   unrecognised alike to the plain CTA.
 */
export type TaskOut = components['schemas']['TaskOut']

export type TaskCreate = components['schemas']['TaskCreate']

/**
 * The orderings `GET /tasks` accepts (#1364). An ABSENT sort still means
 * `level` — `level_required ASC, point_value DESC`, the browse ordering the
 * page has always had. `level` is ascending only; there is no descending twin.
 */
export type TaskSort = 'newest' | 'oldest' | 'level'

interface TaskFilters {
  status?: string
  /**
   * Repeated `?faction=` — a UNION, not an intersection (#1364). One slug
   * narrows to one faction; none at all filters nothing.
   *
   * REPEATED BARE keys, never `faction[]=` — the bracketed spelling is simply
   * not the parameter FastAPI declared, so the union filter would do NOTHING
   * while the request still answered 200 and the bar still showed its chips.
   * This module carried a `paramsSerializer` to force that shape out of axios;
   * `./client` writes it by default, and `__tests__/client.test.ts` pins the
   * URL it builds for this very route rather than trusting the default (#1400).
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

export async function listTasks(filters?: TaskFilters): Promise<TaskOut[]> {
  const { data } = await apiGet('/tasks', { params: { query: filters } })
  return data
}

export async function getTask(id: number): Promise<TaskOut> {
  const { data } = await apiGet('/tasks/{task_id}', { params: { path: { task_id: id } } })
  return data
}

export async function proposeTask(body: TaskCreate): Promise<TaskOut> {
  const { data } = await apiPost('/tasks', { body })
  return data
}

/**
 * One row of GET /tasks/{id}/signups.
 *
 * `level` is the character's level in the CURRENT era (ADR-0042), for the
 * roster row's "lvl N" (#1029); `praxis_type` is which kind of praxis they are
 * working the task through; `joined_at` is `PraxisMember.joined_at`.
 */
export type TaskSignupOut = components['schemas']['TaskSignupOut']

/**
 * No callers as of #1262, deliberately.
 *
 * `useTaskDetail` used to call this on every task-detail load and discard the
 * result — no skin rendered a roster (owner ruling 2026-07-28, reversing epic
 * #1028 decision 3) and it was the slowest request in its wave. The route,
 * `TaskSignupOut` and this client survive because "who signed up for this task"
 * is a plausible future surface and they cost nothing at rest. Calling it again
 * means adding a round trip, so it wants a designed consumer, not a re-wire.
 *
 * The ruling was reaffirmed in #1386, which was explicit that it covers THIS
 * CLIENT and not only the route. It has since survived the dead-endpoint sweep
 * of #1667: that issue listed the route, `TaskSignupOut` and this wrapper for
 * deletion on the correct observation that nothing imports it, and the owner
 * reinstated all three. So a caller-count of zero is not new information here,
 * and it is not the finding it looks like — it is the recorded state. Anything
 * that removes this needs a fresh owner ruling, not a grep.
 */
export async function getTaskSignups(taskId: number): Promise<TaskSignupOut[]> {
  const { data } = await apiGet('/tasks/{task_id}/signups', {
    params: { path: { task_id: taskId } },
  })
  return data
}
