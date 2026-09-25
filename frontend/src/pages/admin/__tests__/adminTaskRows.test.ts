/**
 * #909 — a proposed metatask must reach the admin review queue.
 *
 * The regression this guards: `/tasks` returns a capped, easiest-first window,
 * so a level-6 metatask sorts past it and never appears. The merge is what
 * restores it, using the uncapped `/admin/tasks/pending` response.
 */
import { describe, it, expect } from "vitest";
import {
  mergeAdminTaskRows,
  filterAdminTaskRows,
  distinctLevels,
  reconcileLevelFilter,
  hasActiveTaskFilters,
} from "../adminTaskRows";
import type { TaskOut } from "../../../api/tasks";
import type { PendingTaskOut } from "../../../api/admin";

function task(overrides: Partial<TaskOut> & { id: number }): TaskOut {
  return {
    title: `task ${overrides.id}`,
    description: '',
    point_value: 10,
    level_required: 0,
    status: "active",
    task_type: "standard",
    created_by: 1,
    primary_faction_slug: 'na',
    metatask_faction_slug: null,
    created_at: "2026-07-01T00:00:00Z",
    in_progress_count: 0,
    created_by_display_name: "",
    created_by_avatar_url: "",
    created_by_faction_slug: null,
    created_by_level: 0,
    signup_reason: null,
    in_progress_praxis_id: null,
    submitted_praxis_id: null,
    can_sign_up: true,
    allowed_modes: [],
    eligible_for_current_user: true,
    start_here: false,
    ...overrides,
  };
}

/** The 50-row easiest-first window the admin tab used to be limited to. */
const EASIEST_FIFTY: TaskOut[] = Array.from({ length: 50 }, (_, index) =>
  task({ id: index + 1, level_required: 0 }),
);

const PENDING_METATASK: PendingTaskOut = {
  ...task({
    id: 909,
    status: "pending",
    task_type: "metatask",
    level_required: 6,
    title: "Chart the coven's tasks",
  }),
  created_by_name: "mollusk",
  notes: "",
};

describe("mergeAdminTaskRows", () => {
  it("surfaces a pending metatask that sorted past the /tasks window", () => {
    const merged = mergeAdminTaskRows(EASIEST_FIFTY, [PENDING_METATASK]);

    const metatask = merged.find((row) => row.id === PENDING_METATASK.id);
    expect(metatask).toBeDefined();
    expect(metatask?.task_type).toBe("metatask");
    expect(metatask?.level_required).toBe(6);
    // The proposer's name is the whole reason the pending endpoint exists.
    expect(metatask?.created_by_name).toBe("mollusk");
    // ...and the pending chip's count, computed over the merged set, sees it.
    expect(merged.filter((row) => row.status === "pending")).toHaveLength(1);
  });

  it("does not duplicate a task both sources returned, and the pending row wins", () => {
    const merged = mergeAdminTaskRows(
      [...EASIEST_FIFTY, task({ id: 909, status: "pending", title: "stale" })],
      [PENDING_METATASK],
    );

    expect(merged.filter((row) => row.id === 909)).toHaveLength(1);
    expect(merged.length).toBe(EASIEST_FIFTY.length + 1);
    const metatask = merged.find((row) => row.id === 909);
    expect(metatask?.title).toBe("Chart the coven's tasks");
    expect(metatask?.created_by_name).toBe("mollusk");
  });

  it("leaves rows with no pending counterpart untouched", () => {
    const merged = mergeAdminTaskRows(EASIEST_FIFTY, []);
    expect(merged).toEqual(EASIEST_FIFTY);
  });
});

describe("filterAdminTaskRows", () => {
  const rows = [
    task({
      id: 1,
      title: "Draw a map",
      description: "of the neighbourhood",
      primary_faction_slug: "everymen",
      level_required: 3,
      point_value: 15,
    }),
    task({
      id: 2,
      title: "Write a poem",
      description: "about a map you once saw",
      primary_faction_slug: "coven",
      level_required: 2,
      point_value: 5,
    }),
    task({
      id: 3,
      title: "Bake bread",
      description: "",
      primary_faction_slug: "everymen",
      level_required: 3,
      point_value: 25,
    }),
  ];

  it("matches search against title OR description, case-insensitively, trimmed", () => {
    expect(filterAdminTaskRows(rows, { search: "  MAP  " }).map((r) => r.id)).toEqual([1, 2]);
    expect(filterAdminTaskRows(rows, { search: "bread" }).map((r) => r.id)).toEqual([3]);
    expect(filterAdminTaskRows(rows, { search: "" })).toEqual(rows);
  });

  it("also matches search against the proposer's name (#3060 review)", () => {
    const withProposer = [
      ...rows,
      {
        ...task({ id: 4, title: "Chart the labyrinth", description: "" }),
        created_by_name: "mollusk",
      },
    ];
    expect(
      filterAdminTaskRows(withProposer, { search: "mollusk" }).map((r) => r.id),
    ).toEqual([4]);
  });

  it("matches faction exactly", () => {
    expect(filterAdminTaskRows(rows, { faction: "everymen" }).map((r) => r.id)).toEqual([1, 3]);
  });

  it("matches level exactly", () => {
    expect(filterAdminTaskRows(rows, { level: 2 }).map((r) => r.id)).toEqual([2]);
  });

  it("bounds points inclusively on both ends", () => {
    expect(filterAdminTaskRows(rows, { minPoints: 15 }).map((r) => r.id)).toEqual([1, 3]);
    expect(filterAdminTaskRows(rows, { maxPoints: 15 }).map((r) => r.id)).toEqual([1, 2]);
    expect(filterAdminTaskRows(rows, { minPoints: 15, maxPoints: 15 }).map((r) => r.id)).toEqual([1]);
  });

  it("ANDs every criterion together", () => {
    expect(
      filterAdminTaskRows(rows, {
        search: "map",
        faction: "everymen",
        level: 3,
        minPoints: 10,
        maxPoints: 20,
      }).map((r) => r.id),
    ).toEqual([1]);
  });
});

describe("distinctLevels", () => {
  it("returns the levels present in the rows, ascending, deduped", () => {
    const rows = [
      task({ id: 1, level_required: 3 }),
      task({ id: 2, level_required: 0 }),
      task({ id: 3, level_required: 3 }),
      task({ id: 4, level_required: 6 }),
    ];
    expect(distinctLevels(rows)).toEqual([0, 3, 6]);
  });

  it("returns an empty array for no rows", () => {
    expect(distinctLevels([])).toEqual([]);
  });
});

describe("reconcileLevelFilter (#3060 review — the select/filter desync bug)", () => {
  it("keeps a level filter still present among the options", () => {
    expect(reconcileLevelFilter(3, [0, 3, 6])).toBe(3);
  });

  it("drops a level filter that vanished from the options — an edit or a refresh", () => {
    // Repro: filter to level 7, the one task at that level gets edited down to
    // level 6, the tab refreshes. `<select>` would otherwise keep showing "7"
    // (now orphaned) while the predicate kept filtering on it.
    expect(reconcileLevelFilter(7, [0, 3, 6])).toBeUndefined();
  });

  it("passes an unset filter through unchanged", () => {
    expect(reconcileLevelFilter(undefined, [0, 3, 6])).toBeUndefined();
  });
});

describe("hasActiveTaskFilters", () => {
  it("is false when nothing is set", () => {
    expect(hasActiveTaskFilters({})).toBe(false);
    expect(hasActiveTaskFilters({ search: "   " })).toBe(false);
  });

  it("is true when any one criterion is set", () => {
    expect(hasActiveTaskFilters({ search: "map" })).toBe(true);
    expect(hasActiveTaskFilters({ faction: "everymen" })).toBe(true);
    expect(hasActiveTaskFilters({ level: 0 })).toBe(true);
    expect(hasActiveTaskFilters({ minPoints: 0 })).toBe(true);
    expect(hasActiveTaskFilters({ maxPoints: 0 })).toBe(true);
  });
});
