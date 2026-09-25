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

/**
 * Search + faction + level + points, ANDed (#3060). Status stays a separate
 * concern — the tab applies its status chip before or after this, and the
 * chip counts are computed over the whole list regardless.
 */
export interface AdminTaskFilterCriteria {
  /** Case-insensitive substring over title OR description. Trimmed; empty = no constraint. */
  search?: string;
  /** Exact match on `primary_faction_slug`. Empty/undefined = no constraint. */
  faction?: string;
  /** Exact match on `level_required`. */
  level?: number;
  /** Inclusive lower bound on `point_value`. */
  minPoints?: number;
  /** Inclusive upper bound on `point_value`. */
  maxPoints?: number;
}

export function filterAdminTaskRows(
  rows: AdminTaskRow[],
  criteria: AdminTaskFilterCriteria,
): AdminTaskRow[] {
  const search = criteria.search?.trim().toLowerCase() ?? "";

  return rows.filter((row) => {
    if (search) {
      const title = row.title.toLowerCase();
      const description = (row.description ?? "").toLowerCase();
      if (!title.includes(search) && !description.includes(search)) return false;
    }
    if (criteria.faction && row.primary_faction_slug !== criteria.faction) {
      return false;
    }
    if (criteria.level !== undefined && row.level_required !== criteria.level) {
      return false;
    }
    if (criteria.minPoints !== undefined && row.point_value < criteria.minPoints) {
      return false;
    }
    if (criteria.maxPoints !== undefined && row.point_value > criteria.maxPoints) {
      return false;
    }
    return true;
  });
}
