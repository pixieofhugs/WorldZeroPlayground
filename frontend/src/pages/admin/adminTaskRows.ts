import type { TaskOut } from "../../api/tasks";
import type { PendingTaskOut } from "../../api/admin";

/** An admin Tasks row; proposer name and note come only from `/admin/tasks/pending`. */
export type AdminTaskRow = TaskOut & {
  created_by_name?: string;
  notes?: string;
};

/**
 * Merge the admin Tasks sources (#909). `/tasks?status=all` is capped, so it can
 * drop rows; `/admin/tasks/pending` is uncapped and wins on id conflict. Pending
 * rows the capped list missed lead; the rest keep `/tasks` order.
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

/** ANDed criteria (#3060); status is a separate axis applied by the tab. */
export interface AdminTaskFilterCriteria {
  /** Trimmed case-insensitive substring over title, description or proposer name. */
  search?: string;
  /** Any one of these `primary_faction_slug`s; empty = no constraint. */
  factions?: string[];
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
    if (
      criteria.factions?.length &&
      !criteria.factions.includes(row.primary_faction_slug ?? "")
    ) {
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

/** Ascending levels actually present, not a fixed 0-8 range. */
export function distinctLevels(rows: AdminTaskRow[]): number[] {
  return Array.from(new Set(rows.map((row) => row.level_required))).sort(
    (a, b) => a - b,
  );
}

/**
 * `undefined` once the picked level is no longer among `levels` (edit/refresh),
 * so the filter and the `<select>` both treat it as cleared instead of showing
 * blank while filtering to nothing.
 */
export function reconcileLevelFilter(
  levelFilter: number | undefined,
  levels: number[],
): number | undefined {
  return levelFilter !== undefined && levels.includes(levelFilter)
    ? levelFilter
    : undefined;
}

/** The status chip never counts here (#3060): it alone doesn't raise "clear filters". */
export function hasActiveTaskFilters(
  criteria: AdminTaskFilterCriteria,
): boolean {
  return (
    Boolean(criteria.search?.trim()) ||
    Boolean(criteria.factions?.length) ||
    criteria.level !== undefined ||
    criteria.minPoints !== undefined ||
    criteria.maxPoints !== undefined
  );
}
