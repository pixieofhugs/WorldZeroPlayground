import { apiGet, apiPost } from './client'
import type { components } from './generated/schema'

export type TaskType = components['schemas']['TaskType']

export type TaskStatus = components['schemas']['TaskStatus']

/**
 * - `description` / `primary_faction_slug` never null: `''` and `'na'`.
 * - `in_progress_count`: active signups (in_progress + pending), same set as
 *   `GET /tasks/{id}/signups` (#1021); `0` on metatasks.
 * - `created_by_*`: denormalised byline (#1029). `_faction_slug` is the
 *   author's MEMBER faction, not the task's; `_level` is current-era
 *   (ADR-0042). Defaults on metatask rows, which draw no byline.
 * - `can_sign_up`, `allowed_modes`, `eligible_for_current_user`: viewer-relative.
 * - `signup_reason`: WHY sign-up is open/shut, so the CTA needn't re-derive a
 *   rule (#1497). Null when nothing to explain; `signupCtaKey` maps null and
 *   unknown to the plain CTA.
 */
export type TaskOut = components['schemas']['TaskOut']

export type TaskCreate = components['schemas']['TaskCreate']

/** Absent = `level` (`level_required ASC, point_value DESC`), ascending only (#1364). */
export type TaskSort = 'newest' | 'oldest' | 'level'

interface TaskFilters {
  status?: string
  /**
   * Repeated `?faction=`, a UNION (#1364). Must be bare repeated keys, not
   * `faction[]=` (silently ignored); pinned by `__tests__/client.test.ts`.
   */
  faction?: string[]
  /**
   * Tasks the viewer could claim now, by the server's own predicate, so
   * faction abilities apply without client rules (#1130). Anonymous → empty
   * list, hence the hidden control.
   */
  can_sign_up?: boolean
  created_by?: number
  task_type?: TaskType
  /** Searches title, description, author name/handle. */
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

/** `level` is current-era (ADR-0042); `joined_at` is `PraxisMember.joined_at`. */
export type TaskSignupOut = components['schemas']['TaskSignupOut']

/**
 * No callers, deliberately (#1262). The owner reinstated this route, type and
 * wrapper after the #1667 dead-endpoint sweep — removing it needs a fresh
 * owner ruling, not a grep. Re-calling it adds a round trip; design a consumer.
 */
export async function getTaskSignups(taskId: number): Promise<TaskSignupOut[]> {
  const { data } = await apiGet('/tasks/{task_id}/signups', {
    params: { path: { task_id: taskId } },
  })
  return data
}
