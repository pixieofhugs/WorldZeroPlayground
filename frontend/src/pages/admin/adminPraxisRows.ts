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
 * The pure half of the admin Praxis tab (#3061) — the query builder, the
 * per-row actions and the in-place row update. Same shape as `adminTaskRows`
 * so the two admin finders read alike; the difference is that this list is far
 * too long to filter in the browser, so the criteria become a QUERY rather
 * than a predicate.
 */

/** Rows per page. One more is asked for, to know whether a next page exists. */
export const ADMIN_PRAXIS_PAGE_SIZE = 25;

export const ALL = "all";

/** The moderation states a praxis can be in. `deleted` is the comments' own
 *  terminal state and a praxis never holds it, so it is not offered. */
export const PRAXIS_MODERATION_FILTERS = [
  "visible",
  "flagged",
  "hidden",
  "failed",
] as const satisfies readonly ModerationStatus[];

export type EraScope = NonNullable<AdminPraxisQuery["era_scope"]>;

/** What the tab's controls hold. Ids stay strings — they are input values. */
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

/**
 * Where the tab lands. `this_era` is the public feed's own default, kept so
 * the two lists answer alike; the era rail raises a chip for it, as on the feed.
 */
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

/**
 * The request for one page. An axis left on "all"/blank is OMITTED rather than
 * sent empty — `faction=[]` would otherwise ask for praxes of no faction.
 */
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

/** Split the over-asked response into this page's rows and "is there more". */
export function splitAdminPraxisPage(fetched: PraxisCardOut[]): {
  rows: PraxisCardOut[];
  hasNext: boolean;
} {
  return {
    rows: fetched.slice(0, ADMIN_PRAXIS_PAGE_SIZE),
    hasNext: fetched.length > ADMIN_PRAXIS_PAGE_SIZE,
  };
}

/** The filters outside the shared bar — the two id boxes have no chip there. */
export function hasActiveIdFilters(criteria: AdminPraxisCriteria): boolean {
  return Boolean(criteria.taskId.trim() || criteria.memberId.trim());
}

export type PraxisRowAction = "hide" | "fail" | "restore";

const ACTION_STATUS: Record<PraxisRowAction, PraxisModerationStatus> = {
  hide: "hidden",
  fail: "failed",
  restore: "visible",
};

/** Asked about before they are sent; `restore` is the undo and is not. */
export type DestructiveAction = Exclude<PraxisRowAction, "restore">;

export function isDestructive(
  action: PraxisRowAction,
): action is DestructiveAction {
  return action !== "restore";
}

/**
 * The actions a row offers: every ruling except the one it already holds. So a
 * visible praxis never offers restore, a hidden one never offers hide, and a
 * flagged one offers all three.
 */
export function praxisRowActions(status: ModerationStatus): PraxisRowAction[] {
  return (Object.keys(ACTION_STATUS) as PraxisRowAction[]).filter(
    (action) => ACTION_STATUS[action] !== status,
  );
}

/**
 * Send one ruling through the existing moderate route. Resolves to the status
 * the SERVER says the praxis now holds, or to the words to show on the row.
 * A value rather than a handler, like `requestTaskDelete`.
 */
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

/** The list once a row is ruled on — in place, no refetch, order untouched. */
export function applyModeration(
  rows: PraxisCardOut[],
  praxisId: number,
  status: ModerationStatus,
): PraxisCardOut[] {
  return rows.map((row) =>
    row.id === praxisId ? { ...row, moderation_status: status } : row,
  );
}
