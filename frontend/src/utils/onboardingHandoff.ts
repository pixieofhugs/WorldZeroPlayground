import { listTasks, type TaskOut } from '../api/tasks'

/**
 * Where a character goes next, derived (#1861, SPEC-onboarding § The hand-off).
 *
 * THE FLOW LANDS THE PLAYER ON THE TASK PAGE, FRAMED — it never claims on their
 * behalf. A claim enters the task bank (`max_task_signups`) and unwinding it
 * means finding the withdraw path on day one, so nothing here writes anything;
 * it only picks a path.
 *
 * ONE RULE, THREE CONSUMERS. `task.start_here` is the server's derivation
 * (`services.task.start_here_for_viewer`): true only on the one game-wide
 * onboarding task, and only for a character who has never completed it. The
 * mark drawn on that task, `CreateCharacter`'s destination and the `/start`
 * flow's stop condition all read that one field, so the flow can never refuse
 * to start someone whose task is simultaneously marked *start here*.
 *
 * DERIVED FROM THE CHARACTER'S OWN STATE, never from a flag onboarding passes
 * in — which is what makes it hold however they arrived: a sticker, a search
 * engine, or a second character years from now.
 */

/** The task carrying the *start here* mark for this viewer, if any is on hand. */
export function startHereTask(tasks: TaskOut[]): TaskOut | undefined {
  return tasks.find((task) => task.start_here)
}

/**
 * The path to send a character to: their marked task, else `fallback`.
 *
 * Pure and exported because the frontend harness has no DOM and effects never
 * run, so a destination decided inside a submit handler could not be driven by
 * a test. This is the seam the hand-off is tested at.
 */
export function handoffDestination(tasks: TaskOut[], fallback: string): string {
  const task = startHereTask(tasks)
  return task === undefined ? fallback : `/tasks/${task.id}`
}

/**
 * How many rows to look through for the mark.
 *
 * ponytail: the onboarding task is the only level-0 standard task on the board
 * (`seed.ensure_onboarding_task`, and `test_seed_task_sync` pins it), and the
 * `level` sort is `level_required ASC` — so it is row one of this page, not
 * somewhere in it. The ceiling is a board that grows more level-0 tasks than
 * this page holds; the upgrade is a `start_here=true` filter on `GET /tasks`,
 * which is a route change nobody needs yet.
 */
export const HANDOFF_PAGE_SIZE = 50

/**
 * Ask the server where this character starts, and fall back on any failure.
 *
 * A hand-off that throws would strand someone who has just made a character on
 * a dead form, which is a worse outcome than landing them on the fallback — so
 * the network failure is swallowed deliberately, not overlooked.
 */
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
