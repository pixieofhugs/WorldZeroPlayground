import { moderatePraxis } from "../../api/admin";
import type { AdminPraxisQuery, PraxisModerationStatus } from "../../api/admin";
import type {
  ModerationStatus,
  PraxisCardOut,
  PraxisStatus,
  PraxisType,
} from "../../api/praxis";
import { extractError } from "../../utils/errors";

/**
 * Pure half of the admin Praxis tab (#3061), shaped like `adminTaskRows`, but
 * criteria become a server QUERY: the list is too long to filter client-side.
 */

/** Rows per page. One more is asked for, to know whether a next page exists. */
export const ADMIN_PRAXIS_PAGE_SIZE = 25;

export const ALL = "all";

/** Praxis moderation states; `deleted` is comment-only. */
export const PRAXIS_MODERATION_FILTERS = [
  "visible",
  "flagged",
  "hidden",
  "failed",
] as const satisfies readonly ModerationStatus[];

export type EraScope = NonNullable<AdminPraxisQuery["era_scope"]>;

/** Ids stay strings: they are input values. */
export interface AdminPraxisCriteria {
  search: string;
  factions: string[];
  type: typeof ALL | PraxisType;
  status: typeof ALL | PraxisStatus;
  moderation: typeof ALL | ModerationStatus;
  eraScope: EraScope;
  taskId: string;
  memberId: string;
}

/** `this_era` matches the public feed's default. */
export const DEFAULT_PRAXIS_CRITERIA: AdminPraxisCriteria = {
  search: "",
  factions: [],
  type: ALL,
  status: ALL,
  moderation: ALL,
  eraScope: "this_era",
  taskId: "",
  memberId: "",
};

/** A typed id, or nothing: `"12"` → 12; blank, `"abc"`, `"0"`, `"1.5"` → undefined. */
function parseId(raw: string): number | undefined {
  const value = Number(raw.trim());
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

/** Unset axes are OMITTED: `faction=[]` would ask for no faction. */
export function buildAdminPraxisQuery(
  criteria: AdminPraxisCriteria,
  page: number,
): AdminPraxisQuery {
  return {
    q: criteria.search.trim() || undefined,
    faction: criteria.factions.length ? criteria.factions : undefined,
    type: criteria.type === ALL ? undefined : criteria.type,
    status: criteria.status === ALL ? undefined : criteria.status,
    moderation_status:
      criteria.moderation === ALL ? undefined : criteria.moderation,
    era_scope: criteria.eraScope,
    task_id: parseId(criteria.taskId),
    member_id: parseId(criteria.memberId),
    limit: ADMIN_PRAXIS_PAGE_SIZE + 1,
    offset: page * ADMIN_PRAXIS_PAGE_SIZE,
  };
}

export function splitAdminPraxisPage(fetched: PraxisCardOut[]): {
  rows: PraxisCardOut[];
  hasNext: boolean;
} {
  return {
    rows: fetched.slice(0, ADMIN_PRAXIS_PAGE_SIZE),
    hasNext: fetched.length > ADMIN_PRAXIS_PAGE_SIZE,
  };
}

/** The id boxes live outside the shared bar and have no chip. */
export function hasActiveIdFilters(criteria: AdminPraxisCriteria): boolean {
  return Boolean(criteria.taskId.trim() || criteria.memberId.trim());
}

export type PraxisRowAction = "hide" | "fail" | "restore";

const ACTION_STATUS: Record<PraxisRowAction, PraxisModerationStatus> = {
  hide: "hidden",
  fail: "failed",
  restore: "visible",
};

/** Confirmed before sending; `restore` is the undo. */
export type DestructiveAction = Exclude<PraxisRowAction, "restore">;

export function isDestructive(
  action: PraxisRowAction,
): action is DestructiveAction {
  return action !== "restore";
}

/** Every ruling except the one the row already holds. */
export function praxisRowActions(status: ModerationStatus): PraxisRowAction[] {
  return (Object.keys(ACTION_STATUS) as PraxisRowAction[]).filter(
    (action) => ACTION_STATUS[action] !== status,
  );
}

/** Resolves to the server's new status or the row's error text (cf. `requestTaskDelete`). */
export async function requestPraxisModeration(
  praxisId: number,
  action: PraxisRowAction,
  note: string,
  fallback: string,
): Promise<{ status: ModerationStatus } | { error: string }> {
  try {
    const praxis = await moderatePraxis(
      praxisId,
      ACTION_STATUS[action],
      action === "fail" ? note : undefined,
    );
    return { status: praxis.moderation_status };
  } catch (err) {
    return { error: extractError(err, fallback) };
  }
}

/** In place, no refetch, order untouched. */
export function applyModeration(
  rows: PraxisCardOut[],
  praxisId: number,
  status: ModerationStatus,
): PraxisCardOut[] {
  return rows.map((row) =>
    row.id === praxisId ? { ...row, moderation_status: status } : row,
  );
}
