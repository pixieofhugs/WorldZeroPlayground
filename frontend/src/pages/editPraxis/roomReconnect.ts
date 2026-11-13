/** When a praxis room's socket is worth retrying (#1804) — pure, so it's testable. */

/**
 * RFC 6455 policy violation: door two revoking a kicked member
 * (`_WS_POLICY_VIOLATION` in `praxis_room.py`). Door one refuses before the
 * upgrade (HTTP 403), which the browser reports as 1006 — so this code alone
 * can't be the rule.
 */
export const WS_POLICY_VIOLATION = 1008;

/**
 * Failures tolerated before a room has ever opened. Covers a backend restart
 * during page load; y-websocket backs off from 200ms, so ~1.5s of trying.
 */
export const PRE_OPEN_RETRY_LIMIT = 4;

/**
 * @param code    browser close code; 1006 for a pre-upgrade refusal.
 * @param attempts `provider.wsUnsuccessfulReconnects` (first failure arrives as
 *                `1`; reset only on sync).
 * @param hasOpened whether this room's socket ever opened. Latches.
 */
export function shouldReconnectRoom(
  code: number,
  attempts: number,
  hasOpened: boolean,
): boolean {
  // Kicked post-accept; retrying changes nothing.
  if (code === WS_POLICY_VIOLATION) return false;
  // A refusal always fails before the first open (nothing queued to merge); a
  // drop happens after one, with queued edits that must sync — unbounded.
  return hasOpened || attempts < PRE_OPEN_RETRY_LIMIT;
}
