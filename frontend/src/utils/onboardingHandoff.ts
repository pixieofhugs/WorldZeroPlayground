import { listTasks, type TaskOut } from '../api/tasks'

/**
 * Where a character goes next (#1861, SPEC-onboarding § The hand-off). Never
 * claims on their behalf (a claim fills the task bank). Reads only the server's
 * `task.start_here` (`services.task.start_here_for_viewer`), the same field the
 * task mark and `/start` use, so the three can never disagree.
 */

export function startHereTask(tasks: TaskOut[]): TaskOut | undefined {
  return tasks.find((task) => task.start_here)
}

/** Pure so the DOM-less test harness can drive the hand-off. */
export function handoffDestination(tasks: TaskOut[], fallback: string): string {
  const task = startHereTask(tasks)
  return task === undefined ? fallback : `/tasks/${task.id}`
}

/**
 * ponytail: the onboarding task is the only level-0 task, so it is row one of a
 * `level` sort. Ceiling: more level-0 tasks than a page; upgrade: a
 * `start_here=true` filter on `GET /tasks`.
 */
export const HANDOFF_PAGE_SIZE = 50

/** Failures are swallowed on purpose: throwing would strand a new character on a dead form. */
export async function resolveHandoffDestination(fallback: string): Promise<string> {
  try {
    return handoffDestination(
      await listTasks({ sort: 'level', limit: HANDOFF_PAGE_SIZE }),
      fallback,
    )
  } catch {
    return fallback
  }
}
