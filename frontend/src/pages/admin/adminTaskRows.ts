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
  /**
   * Case-insensitive substring over title, description, OR the proposer's
   * name (#3060 review). The public tasks search already covers the author
   * (#661/#681) — an admin typing a proposer's handle with the name sitting
   * right there on `tasks.proposedBy` deserves the same. Trimmed; empty = no
   * constraint.
   */
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
      const author = (row.created_by_name ?? "").toLowerCase();
      if (
        !title.includes(search) &&
        !description.includes(search) &&
        !author.includes(search)
      ) {
        return false;
      }
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

/**
 * Distinct `level_required` values present in the rows, ascending — not a
 * fixed 0-8 range, since not every level need have a task.
 */
export function distinctLevels(rows: AdminTaskRow[]): number[] {
  return Array.from(new Set(rows.map((row) => row.level_required))).sort(
    (a, b) => a - b,
  );
}

/**
 * The level filter to actually apply, once the option it names may have moved
 * out from under it (#3060 review) — an edit changes a task's
 * `level_required`, a refresh reloads the rows, and the level an admin picked
 * is no longer among them. Left to the raw state value, a `<select>` bound to
 * it goes to `selectedIndex -1` (renders blank) while the filter keeps
 * narrowing to a level nothing matches — an empty list under a control that
 * LOOKS unset. `undefined` here means "treat it as cleared," which both the
 * predicate and the `<select>`'s own state should agree on.
 */
export function reconcileLevelFilter(
  levelFilter: number | undefined,
  levels: number[],
): number | undefined {
  return levelFilter !== undefined && levels.includes(levelFilter)
    ? levelFilter
    : undefined;
}

/**
 * Is anything in `criteria` actually narrowing the list right now? The status
 * chip is a separate axis with its own "clear" and never counts here — by
 * design (#3060), a status filter alone does not raise the tab's "clear
 * filters" control.
 */
export function hasActiveTaskFilters(
  criteria: AdminTaskFilterCriteria,
): boolean {
  return (
    Boolean(criteria.search?.trim()) ||
    Boolean(criteria.faction) ||
    criteria.level !== undefined ||
    criteria.minPoints !== undefined ||
    criteria.maxPoints !== undefined
  );
}
