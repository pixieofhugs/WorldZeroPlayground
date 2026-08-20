/**
 * This browser's copy of a room document, and how it is thrown away (#1745,
 * #2381).
 *
 * A praxis is written in a room whose document the **server** owns and seeds
 * exactly once (ADR-0073). `y-indexeddb` keeps a local copy of that same
 * document so a composer that loses the network keeps taking text — it is the
 * SAME document replayed, never a second one.
 *
 * Rule 7 of that ADR is the reason this module exists: **publishing destroys
 * the document**, server-side, and `unsubmit_praxis` seeds a brand-new one from
 * the `body_text` it published with. The local copy is now the *other*
 * document. Two documents built independently from the same sentence merge into
 * two copies of that sentence — the Yjs duplication footgun — so the copy has
 * to go when the server's does. #2381 is what it looks like when it does not:
 * publish "test", withdraw, edit, read "testtest".
 *
 * ## Why the disposal needs the live handle
 *
 * `indexedDB.deleteDatabase` is the right disposal — `clearData()`ing a
 * freshly constructed `IndexeddbPersistence` would re-create the store it is
 * emptying, and this must also take the tombstones with it (text a member typed
 * and deleted is in here too, and praxis drafts are not permanent).
 *
 * But a delete is **blocked while any connection is open**: the request fires
 * `blocked` and stays pending. It used to be assumed that the composer's own
 * connection was closing in the same beat — provider teardown — and it is not.
 * The client that publishes is exactly the client holding the store open, and a
 * solo publish navigates away in the same commit that flips the status, so
 * there is no render in between for an effect to fire in. Hence the register
 * below: while a room is open, the disposal goes through its own handle, whose
 * `clearData()` closes the connection before it deletes. Nothing to block.
 *
 * Split out of `praxisRoom.tsx` for the reason `roomSeal.ts` was: the frontend
 * harness is `renderToStaticMarkup` — no DOM, and effects never run — so a rule
 * that can only be reached through a provider cannot be proved. This one is a
 * leaf with no React and no Yjs in it. Keep it that way.
 */

/**
 * The live store, narrowed to its disposal. `IndexeddbPersistence` satisfies it
 * structurally; nothing here needs the rest of it, and the narrowing is what
 * lets the register be tested without an IndexedDB.
 */
export interface RoomStoreHandle {
  /** y-indexeddb's own: `destroy()` — which closes — and then delete. */
  clearData: () => Promise<void>;
}

/** The IndexedDB database holding one praxis's offline copy of its document. */
export function roomStoreName(praxisId: number): string {
  return `praxis-room-${praxisId}`;
}

/**
 * The rooms open in this tab. At most one in practice; a map rather than a
 * single slot because "at most one" is a fact about the page, not a rule this
 * module can enforce.
 */
const openStores = new Map<number, RoomStoreHandle>();

/**
 * Announce a room store while it is open, and hand back the un-announce for the
 * opener's cleanup.
 *
 * The un-announce is deliberately conditional: React runs an old effect's
 * cleanup *after* the replacing effect has run (StrictMode's double mount is
 * the everyday case), so a cleanup that dropped whatever it found would leave
 * the live handle unreachable and put the disposal back on the blocked path.
 */
export function trackRoomStore(
  praxisId: number,
  handle: RoomStoreHandle,
): () => void {
  openStores.set(praxisId, handle);
  return () => {
    if (openStores.get(praxisId) === handle) openStores.delete(praxisId);
  };
}

/**
 * Drop this browser's copy of a document the server has destroyed.
 *
 * Safe to call for a praxis this browser has never opened — deleting a database
 * that does not exist is a no-op — which is what lets the callers say "the
 * document is gone" without first asking whether they happen to hold it.
 */
export function discardRoomStore(praxisId: number): void {
  const open = openStores.get(praxisId);
  if (open) {
    openStores.delete(praxisId);
    // Fire-and-forget: the delete is ordered behind this connection's close,
    // and IndexedDB serialises what comes after it. No caller has anything to
    // do with the outcome.
    void open.clearData();
    return;
  }
  // The static-render harness runs in `node`, where there is no IndexedDB.
  if (typeof indexedDB === "undefined") return;
  indexedDB.deleteDatabase(roomStoreName(praxisId));
}
