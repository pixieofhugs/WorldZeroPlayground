import { deleteTask } from "../../api/admin";
import { extractError } from "../../utils/errors";
import type { AdminTaskRow } from "./adminTaskRows";

/**
 * Ask the server to delete a task (#3062). Resolves to `null` when it is gone,
 * or to the words to show when it was refused — the `errors.json` wording for a
 * coded refusal ("retire it instead"), else `fallback`.
 *
 * A value rather than a handler so the tab's one behavioural claim is
 * assertable without a DOM (SPEC-testing, "Behaviour is reached by extracting
 * a value").
 */
export async function requestTaskDelete(
  taskId: number,
  fallback: string,
): Promise<string | null> {
  try {
    await deleteTask(taskId);
    return null;
  } catch (err) {
    return extractError(err, fallback);
  }
}

/** The list once a task is deleted — no refetch, the server said it is gone. */
export function removeTaskRow(
  rows: AdminTaskRow[],
  taskId: number,
): AdminTaskRow[] {
  return rows.filter((row) => row.id !== taskId);
}
