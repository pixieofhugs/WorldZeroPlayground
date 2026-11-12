/**
 * ADR-0073 rule 7, client half (#2381): publishing drops this browser's
 * `y-indexeddb` copy, or a withdraw's fresh seed merges with it ("testtest").
 * The fake is faithful on the key point: a delete blocked by an open connection
 * never happens, hence `clearData()` (close, then delete) on the live handle.
 */
import { describe, it, expect, beforeEach } from "vitest";
import * as Y from "yjs";
import {
  discardRoomStore,
  roomStoreName,
  trackRoomStore,
  type RoomStoreHandle,
} from "../roomStore";

class FakeIndexedDb {
  readonly stored = new Map<string, Uint8Array>();
  readonly open = new Set<string>();

  deleteDatabase(name: string): void {
    // Spec: while a connection is open the request is `blocked`.
    if (this.open.has(name)) return;
    this.stored.delete(name);
  }

  openStore(name: string, doc: Y.Doc): RoomStoreHandle {
    this.open.add(name);
    const restored = this.stored.get(name);
    if (restored) Y.applyUpdate(doc, restored);
    doc.on("update", () => this.stored.set(name, Y.encodeStateAsUpdate(doc)));
    return {
      // `destroy().then(deleteDB)`: closes first, so never self-blocked.
      clearData: async () => {
        this.open.delete(name);
        this.deleteDatabase(name);
      },
    };
  }
}

const PRAXIS_ID = 42;

function draftInARoom(idb: FakeIndexedDb, body: string) {
  const doc = new Y.Doc();
  const store = idb.openStore(roomStoreName(PRAXIS_ID), doc);
  const untrack = trackRoomStore(PRAXIS_ID, store);
  doc.getText("body").insert(0, body);
  return { doc, untrack };
}

/** Reopen after a withdraw: local store merged under a fresh server seed. */
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

    // Publish happens before unmount; nothing may rely on teardown.
    discardRoomStore(PRAXIS_ID);

    expect(idb.stored.has(roomStoreName(PRAXIS_ID))).toBe(false);
    untrack();
  });

  it("leaves nothing behind to merge into the re-seeded document", () => {
    const { untrack } = draftInARoom(idb, "test");
    discardRoomStore(PRAXIS_ID);
    untrack();

    expect(reopenRoom(idb, "test")).toBe("test");
  });

  it("deletes the database outright when no room is open", () => {
    // E.g. a co-author loading an already-published page.
    idb.stored.set(roomStoreName(PRAXIS_ID), Y.encodeStateAsUpdate(new Y.Doc()));

    discardRoomStore(PRAXIS_ID);

    expect(idb.stored.has(roomStoreName(PRAXIS_ID))).toBe(false);
  });

  it("forgets a handle only while it is the live one", () => {
    const first = idb.openStore(roomStoreName(PRAXIS_ID), new Y.Doc());
    const untrackFirst = trackRoomStore(PRAXIS_ID, first);
    const second = idb.openStore(roomStoreName(PRAXIS_ID), new Y.Doc());
    trackRoomStore(PRAXIS_ID, second);
    // React runs the old cleanup AFTER the new effect opens (StrictMode).
    untrackFirst();

    idb.stored.set(roomStoreName(PRAXIS_ID), Y.encodeStateAsUpdate(new Y.Doc()));
    discardRoomStore(PRAXIS_ID);

    expect(idb.open.has(roomStoreName(PRAXIS_ID))).toBe(false);
    expect(idb.stored.has(roomStoreName(PRAXIS_ID))).toBe(false);
  });
});

/** `node` has no IndexedDB; stub one so the fallback path runs. */
function stubIndexedDb(idb: FakeIndexedDb): void {
  Object.defineProperty(globalThis, "indexedDB", {
    value: idb as unknown as IDBFactory,
    configurable: true,
    writable: true,
  });
}
