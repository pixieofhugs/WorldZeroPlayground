/**
 * What a sealed room means to the composer (#1931) — the client half of #1808.
 *
 * The server freezes a praxis and hangs up every socket on it with
 * {@link import('./roomReconnect').WS_ROOM_FROZEN} (PR #1923). Before this
 * file, that code reached the browser and nothing acted on it: the client
 * reconnected — correctly, so the sealed write-up can still be read — and the
 * editor **stayed writable**, because `documentFrozen` is derived from the
 * praxis that was fetched at mount and nothing refetches it. The holdout kept
 * typing and the server kept dropping every update. The text was on screen, so
 * they believed it was saved.
 *
 * **The text typed after the seal cannot be recovered, and nothing here tries.**
 * Yjs merges additively and never reverts, the server never accepted the
 * update, so it exists only in that tab's memory. What these three functions do
 * is make the gap short — one close event wide instead of unbounded — and make
 * the failure honest, which is the copy the composer draws over them.
 *
 * The rules live here rather than inline in `useEditPraxis.ts` and
 * `controls.tsx` because the frontend harness is `renderToStaticMarkup`: no
 * DOM, and effects never run. A rule that cannot be called cannot be proved —
 * the same reason #1804 pulled `shouldReconnectRoom` out of `praxisRoom.tsx`.
 *
 * **The server is and stays the enforcer.** It drops the room messages a frozen
 * praxis would otherwise take, and `backend/tests/integration/test_praxis_room.py`
 * is where that is proved. Nothing here is a permission check; it is how the
 * member is *told*.
 */
import type { PraxisOut } from "../../api/praxis";

/**
 * The document is sealed and may not take another keystroke.
 *
 * Two facts, OR'd, and the order matters:
 *
 * - `sawSealClose` — this client's socket was hung up with 4001. The **newer**
 *   fact, and the only one available in the round trip that follows it. It is
 *   also the failure-safe one: a refetch that never answers leaves the stale
 *   `in_progress` row in hand, and deriving the freeze from that alone would
 *   hand the editor back to a member whose typing goes nowhere.
 * - the fetched status — the pre-existing rule (#1745), stated exactly as the
 *   server states it. Reached without any close at all by a member who loads a
 *   praxis that was already frozen.
 *
 * `sawSealClose` is cleared when the praxis is reopened (`pullBack` in
 * `useEditPraxis.ts`), which is the one transition that makes a sealed room
 * writable again from this tab.
 */
export function documentIsFrozen(
  praxis: Pick<PraxisOut, "status"> | null,
  sawSealClose: boolean,
): boolean {
  if (sawSealClose) return true;
  return !!praxis && praxis.status !== "in_progress";
}

/**
 * May the body editor take text? The composer's one gate, in one place.
 *
 * Two different refusals, and neither may be mistaken for permission.
 * `seeded` is **not yet** — the document has not arrived, and typing in front
 * of the server's seed merges into text the player has never seen. Frozen is
 * **not now** — it arrived and is sealed for the whole group until somebody
 * reopens it.
 */
export function composerWritable(
  seeded: boolean,
  documentFrozen: boolean,
): boolean {
  return seeded && !documentFrozen;
}

/**
 * Catch the praxis up after its room sealed under this client.
 *
 * The freeze is already on by the time this runs — {@link documentIsFrozen}
 * takes the close code, not this row. What the read buys is everything else
 * the sealed praxis carries: the status the footer draws, and the way back in.
 *
 * A failure is swallowed. Nothing the member did failed, so there is nothing to
 * report to them, and the freeze does not depend on this answering.
 *
 * ponytail: one read, no retry. The ceiling is a member who is sealed, offline,
 * and stays on the page — they see the frozen notice (correct) against a stale
 * row until something else refetches. The upgrade is to retry this alongside
 * the socket's own reconnect, which is where a fresh praxis is next wanted
 * anyway.
 */
export async function applyRoomSeal(
  praxisId: number,
  fetchPraxis: (id: number) => Promise<PraxisOut>,
  setPraxis: (praxis: PraxisOut) => void,
): Promise<void> {
  try {
    setPraxis(await fetchPraxis(praxisId));
  } catch {
    /* the seal close already froze the editor; this only enriches it */
  }
}
