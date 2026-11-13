import { deleteTask } from "../../api/admin";
import { ErrorCode, extractError, extractErrorCode } from "../../utils/errors";
import type { AdminTaskRow } from "./adminTaskRows";

/**
 * Delete a task (#3062, soft since #3305). `null` when gone (incl. 404), else the
 * refusal text (`errors.json` for coded refusals, else `fallback`). A value, not
 * a handler, so it's testable without a DOM (SPEC-testing).
 */
export async function requestTaskDelete(
  taskId: number,
  fallback: string,
): Promise<string | null> {
  try {
    await deleteTask(taskId);
    return null;
  } catch (err) {
    if (extractErrorCode(err) === ErrorCode.taskNotFound) return null;
    return extractError(err, fallback);
  }
}

/** No refetch; the row stays, flagged (#3305). */
export function markTaskRowDeleted(
  rows: AdminTaskRow[],
  taskId: number,
): AdminTaskRow[] {
  return rows.map((row) =>
    row.id === taskId ? { ...row, status: "deleted" as const } : row,
  );
}
