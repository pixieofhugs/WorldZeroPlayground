import type { TaskOut } from "../../api/tasks";
import type { PendingTaskOut } from "../../api/admin";

/**
 * One row in the admin Tasks tab. A plain task, optionally carrying the two
 * review-only fields — the proposer's display name and their note to the admin.
 * Only `/admin/tasks/pending` supplies either; neither is on the public
 * `TaskOut`, so both are optional here and absent on rows that came from
 * `/tasks`.
 */
export type AdminTaskRow = TaskOut & {
  created_by_name?: string;
  notes?: string;
};

/**
 * Merge the two sources the admin Tasks tab reads (#909).
 *
 * `/tasks?status=all` is capped and ordered server-side, so on its own it can
 * silently drop rows — historically the 50 easiest, which put every proposed
 * metatask (level 6 to propose) outside the window. `/admin/tasks/pending` is
 * uncapped and is the authority on the review queue, so its rows win on an id
 * conflict: they are the only ones carrying `created_by_name`.
 *
 * Pending rows that the `/tasks` response did not contain lead the merged
 * list — a row the capped source missed is exactly what the review queue
 * exists to surface. Everything else keeps the order `/tasks` returned it in.
 */
export function mergeAdminTaskRows(
  allTasks: TaskOut[],
  pendingTasks: PendingTaskOut[],
): AdminTaskRow[] {
  const pendingById = new Map<number, PendingTaskOut>(
    pendingTasks.map((task) => [task.id, task]),
  );
  const seen = new Set<number>();

  const merged: AdminTaskRow[] = allTasks.map((task) => {
    seen.add(task.id);
    const pending = pendingById.get(task.id);
    return pending ? { ...task, ...pending } : task;
  });

  const missing = pendingTasks.filter((task) => !seen.has(task.id));
  return [...missing, ...merged];
}
