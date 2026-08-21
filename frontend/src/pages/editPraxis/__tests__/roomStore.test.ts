/**
 * The client half of ADR-0073 rule 7: publishing destroys the room's document,
 * and **this browser's copy goes with it** (#1745, #2381).
 *
 * The bug this file exists for is invisible at the moment it happens. A praxis
 * published with the body "test" keeps a `y-indexeddb` copy of the document it
 * was written in; `unsubmit_praxis` seeds a *fresh* server document from the
 * same `body_text`; the two were built independently, so the CRDT merges them
 * into two copies of the same sentence and the write-up reads "testtest".
 * Nothing errors, nothing looks wrong until you read it, and no human is going
 * to catch a regression here — hence a check.
 *
 * The fake below is faithful on the one point the whole fix turns on: **a
 * delete blocked by an open connection does not happen.** `deleteDatabase`
 * fires `blocked` and stays pending for as long as any connection is open, so
 * a disposal issued down that path while the composer still holds its store is
 * not a disposal at all. That is why `discardRoomStore` prefers the live
 * handle's own `clearData()`, which closes before it deletes.
 */
import { describe, it, expect, beforeEach } from "vitest";
import * as Y from "yjs";
import {
  discardRoomStore,
  roomStoreName,
  trackRoomStore,
  type RoomStoreHandle,
} from "../roomStore";

/**
 * The browser's IndexedDB, narrowed to what a room store does with it: hold one
 * document per database name, and refuse to delete one that is open.
 */
class FakeIndexedDb {
  readonly stored = new Map<string, Uint8Array>();
  readonly open = new Set<string>();

  deleteDatabase(name: string): void {
    // The spec's rule, and the whole defect: while a connection is open the
    // request is `blocked` and the database survives.
    if (this.open.has(name)) return;
    this.stored.delete(name);
  }

  /** What `IndexeddbPersistence` does: restore, then persist every update. */
  openStore(name: string, doc: Y.Doc): RoomStoreHandle {
    this.open.add(name);
    const restored = this.stored.get(name);
    if (restored) Y.applyUpdate(doc, restored);
    doc.on("update", () => this.stored.set(name, Y.encodeStateAsUpdate(doc)));
    return {
      // `clearData()` is `destroy().then(deleteDB)` — the close comes first, so
      // the delete cannot be blocked by the handle that asked for it.
      clearData: async () => {
        this.open.delete(name);
        this.deleteDatabase(name);
      },
    };
  }
}

const PRAXIS_ID = 42;

/** The composer, mid-draft: a room store holding a body the player typed. */
function draftInARoom(idb: FakeIndexedDb, body: string) {
  const doc = new Y.Doc();
  const store = idb.openStore(roomStoreName(PRAXIS_ID), doc);
  const untrack = trackRoomStore(PRAXIS_ID, store);
  // The SERVER seeds; this stands in for that seed arriving over the socket.
  doc.getText("body").insert(0, body);
  return { doc, untrack };
}

/**
 * Reopening `/praxis/:id/edit` after a withdraw: a brand-new document, this
 * browser's store merged into it, and the server's freshly seeded copy of
 * `body_text` on top.
 */
function reopenRoom(idb: FakeIndexedDb, seed: string): string {
  const doc = new Y.Doc();
  idb.openStore(roomStoreName(PRAXIS_ID), doc);
  const server = new Y.Doc();
  server.getText("body").insert(0, seed);
  Y.applyUpdate(doc, Y.encodeStateAsUpdate(server));
  return doc.getText("body").toString();
}

describe("discardRoomStore", () => {
  let idb: FakeIndexedDb;

  beforeEach(() => {
    idb = new FakeIndexedDb();
    stubIndexedDb(idb);
  });

  it("drops the store while the composer still holds it open (#2381)", () => {
    const { untrack } = draftInARoom(idb, "test");
    expect(idb.stored.has(roomStoreName(PRAXIS_ID))).toBe(true);

    // Publish. The composer has not unmounted — a solo publish navigates away
    // in the same commit that flips the status, so nothing may depend on a
    // teardown having already run.
    discardRoomStore(PRAXIS_ID);

    expect(idb.stored.has(roomStoreName(PRAXIS_ID))).toBe(false);
    untrack();
  });

  it("leaves nothing behind to merge into the re-seeded document", () => {
    const { untrack } = draftInARoom(idb, "test");
    discardRoomStore(PRAXIS_ID);
    untrack();

    // Withdraw, then edit. The server seeds a fresh document from `body_text`.
    // If this browser's copy had survived, the two independent documents would
    // merge and the player would read their own sentence twice.
    expect(reopenRoom(idb, "test")).toBe("test");
  });

  it("deletes the database outright when no room is open", () => {
    // The other half: a co-author who learns of the publication by loading the
    // page, or a collab auto-sealed by a lapsed window. No handle exists to
    // clear, and no connection is open to block the delete either.
    idb.stored.set(roomStoreName(PRAXIS_ID), Y.encodeStateAsUpdate(new Y.Doc()));

    discardRoomStore(PRAXIS_ID);

    expect(idb.stored.has(roomStoreName(PRAXIS_ID))).toBe(false);
  });

  it("forgets a handle only while it is the live one", () => {
    const first = idb.openStore(roomStoreName(PRAXIS_ID), new Y.Doc());
    const untrackFirst = trackRoomStore(PRAXIS_ID, first);
    const second = idb.openStore(roomStoreName(PRAXIS_ID), new Y.Doc());
    trackRoomStore(PRAXIS_ID, second);
    // React runs the old effect's cleanup AFTER the new one has opened its
    // store (StrictMode's double-mount is the everyday case). An untrack that
    // dropped whatever it found would leave the live handle unreachable and the
    // discard back on the blocked path.
    untrackFirst();

    idb.stored.set(roomStoreName(PRAXIS_ID), Y.encodeStateAsUpdate(new Y.Doc()));
    discardRoomStore(PRAXIS_ID);

    expect(idb.open.has(roomStoreName(PRAXIS_ID))).toBe(false);
    expect(idb.stored.has(roomStoreName(PRAXIS_ID))).toBe(false);
  });
});

/**
 * `node` has no IndexedDB, which is why `discardRoomStore` guards on its
 * absence. Stand one up so the fallback path is exercised rather than skipped.
 */
function stubIndexedDb(idb: FakeIndexedDb): void {
  Object.defineProperty(globalThis, "indexedDB", {
    // Only `deleteDatabase` is ever reached; the rest of `IDBFactory` is
    // y-indexeddb's business, not this module's.
    value: idb as unknown as IDBFactory,
    configurable: true,
    writable: true,
  });
}
