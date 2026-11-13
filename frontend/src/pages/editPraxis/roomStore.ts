/**
 * This browser's offline copy of a room document, and its disposal (#1745, #2381).
 *
 * Publishing destroys the server's document and `unsubmit_praxis` seeds a new
 * one (ADR-0073 rule 7), so the local copy must go too, or the two merge into
 * duplicated text (#2381: publish "test", withdraw, edit, read "testtest").
 *
 * `indexedDB.deleteDatabase` is blocked while a connection is open, and the
 * publishing client is the one holding it (a solo publish navigates away with no
 * render between). So open stores register here and disposal goes through the
 * live handle's `clearData()`, which closes before deleting.
 *
 * A leaf with no React and no Yjs, testable in the effect-less harness. Keep it that way.
 */

/** Narrowed `IndexeddbPersistence`, so the register is testable without IndexedDB. */
export interface RoomStoreHandle {
  /** y-indexeddb: `destroy()` (closes), then delete. */
  clearData: () => Promise<void>;
}

export function roomStoreName(praxisId: number): string {
  return `praxis-room-${praxisId}`;
}

/** Rooms open in this tab (one in practice; a map since that's not enforced here). */
const openStores = new Map<number, RoomStoreHandle>();

/**
 * Register an open store; returns the unregister. Conditional because React runs
 * an old cleanup after the replacing effect (StrictMode double mount).
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

/** Drop the local copy. Safe for a never-opened praxis (deleting a missing DB is a no-op). */
export function discardRoomStore(praxisId: number): void {
  const open = openStores.get(praxisId);
  if (open) {
    openStores.delete(praxisId);
    // Fire-and-forget, but swallowed: storage-refusing browsers (private mode)
    // would otherwise raise an unhandled rejection.
    void open.clearData().catch(() => undefined);
    return;
  }
  // No IndexedDB in the `node` harness.
  if (typeof indexedDB === "undefined") return;
  indexedDB.deleteDatabase(roomStoreName(praxisId));
}
