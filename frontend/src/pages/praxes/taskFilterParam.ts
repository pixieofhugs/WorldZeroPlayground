/** `?task_id=` on the praxis feed (#1050), optional; the pure, testable half. */

export const TASK_FILTER_PARAM = 'task_id'

/** Replace, never push, so Back returns to the task. */
export const TASK_FILTER_NAV_OPTIONS = { replace: true } as const

/** `null` = no filter, including every malformed value. */
export function readTaskIdParam(params: URLSearchParams): number | null {
  const raw = params.get(TASK_FILTER_PARAM)
  if (raw === null) return null
  const trimmed = raw.trim()
  // Digits only, before Number() coerces '1e3', '0x2', '' etc.
  if (!/^\d+$/.test(trimmed)) return null
  const taskId = Number(trimmed)
  return Number.isSafeInteger(taskId) && taskId > 0 ? taskId : null
}

/** Drops the task filter; keeps every other param (notably `?q=`). */
export function withoutTaskIdParam(previous: URLSearchParams): URLSearchParams {
  const nextParams = new URLSearchParams(previous)
  nextParams.delete(TASK_FILTER_PARAM)
  return nextParams
}
