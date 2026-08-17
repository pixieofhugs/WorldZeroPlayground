/**
 * When a praxis room's socket is worth retrying (#1804) — the pure seam.
 *
 * Lives beside `praxisRoom.tsx` rather than inside it so the decision can be
 * tested as a function. Driving it through a live `WebsocketProvider` would
 * mean standing up a server that refuses a handshake in two different ways.
 */

/**
 * RFC 6455 "policy violation" — what the room sends when door two revokes a
 * kicked member (`_WS_POLICY_VIOLATION` in `backend/services/praxis_room.py`).
 *
 * It only ever reaches the browser on the **accepted** path. Door one refuses
 * the handshake *before* the upgrade, which is an HTTP 403 on the wire: no
 * close frame is ever written, so the browser reports 1006 and no code the
 * server picks can say anything about it. That is why this constant cannot be
 * the whole rule — see {@link shouldReconnectRoom}.
 */
export const WS_POLICY_VIOLATION = 1008;

/* #1808's `WS_ROOM_FROZEN` (4001) and `isRoomSealedClose` are gone with the
 * state they announced (ADR-0079, #1811). The freeze existed to make `pending`
 * unwritable; `pending` is writable now, the server sends 1008 and nothing
 * else, and a client special-case for a code that can no longer arrive is a
 * handler nobody can ever prove still works. What replaced the freeze is one
 * confirmation on the first keystroke — `proposalGuard.ts`. */

/**
 * How many consecutive failures a room that has never opened will tolerate.
 *
 * A handful, because it exists for exactly one case the "did it ever open?"
 * test gets wrong: the **backend restarting while the page loads**, which also
 * fails before any open but clears in seconds. A few attempts ride that out.
 * y-websocket backs off exponentially from 200ms, so four attempts span about
 * 1.5s of trying and then stop.
 */
export const PRE_OPEN_RETRY_LIMIT = 4;

/**
 * Decide whether a closed room socket should be retried.
 *
 * @param code    the close code the browser reported. **1006 for anything
 *                refused before the upgrade** — there was no close frame.
 * @param attempts `provider.wsUnsuccessfulReconnects`: consecutive failures,
 *                incremented before this is consulted (so the first failure
 *                arrives here as `1`) and reset only when a connection syncs.
 * @param hasOpened whether this room's socket has ever been open. Latches.
 */
export function shouldReconnectRoom(
  code: number,
  attempts: number,
  hasOpened: boolean,
): boolean {
  // Door two, post-accept: the member was kicked. Re-asking changes nothing.
  if (code === WS_POLICY_VIOLATION) return false;
  // Everything else asks one question instead of reading a status the browser
  // never received. A refusal always fails BEFORE the first open — the viewer
  // was never admitted, so the offline store holds nothing that could merge and
  // there is nothing to reconnect for. A drop always happens AFTER one, and
  // those edits are queued and must sync, so that side stays unbounded.
  return hasOpened || attempts < PRE_OPEN_RETRY_LIMIT;
}
