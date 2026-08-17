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

/**
 * What the room hangs up with when the praxis it holds **freezes** —
 * `_WS_ROOM_FROZEN` in `backend/services/praxis_room.py` (#1808 / PR #1923).
 *
 * A private-use code (RFC 6455 reserves 4000-4999) and deliberately **not**
 * 1008: a frozen praxis still answers its members' `SYNC_STEP1`, so the member
 * must be able to come back and read the write-up that was just sealed. Sent
 * on the open→frozen *transition* only, so it never reaches someone opening an
 * already-frozen praxis.
 *
 * **This is the wire contract.** A backend test pins the literal as well as
 * the constant, so renumbering either side fails in CI rather than in a
 * browser. Do not renumber it here.
 */
export const WS_ROOM_FROZEN = 4001;

/**
 * Did this close mean "the praxis froze under you"?
 *
 * The only thing on the client that can know. `documentFrozen` is derived from
 * the fetched praxis, and nothing refetches it on its own — so without this
 * the holdout's editor stays writable, they keep typing, and the server keeps
 * dropping it (#1931). What follows a `true` here lives in `roomSeal.ts`.
 */
export function isRoomSealedClose(code: number): boolean {
  return code === WS_ROOM_FROZEN;
}

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
  // {@link WS_ROOM_FROZEN} is NOT listed here, and that is the point of its
  // being a private code rather than a second 1008: a sealed room still serves
  // reads, so the member reconnects and gets the sealed text back. What stops
  // them typing into it is the freeze — see `roomSeal.ts` — not a refusal to
  // reconnect. It falls through to `hasOpened`, which a sealed room always has.

  // Everything else asks one question instead of reading a status the browser
  // never received. A refusal always fails BEFORE the first open — the viewer
  // was never admitted, so the offline store holds nothing that could merge and
  // there is nothing to reconnect for. A drop always happens AFTER one, and
  // those edits are queued and must sync, so that side stays unbounded.
  return hasOpened || attempts < PRE_OPEN_RETRY_LIMIT;
}
