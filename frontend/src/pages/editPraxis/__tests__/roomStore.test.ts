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
  dropStaleRoomStores,
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
const GENERATION = 1;

function draftInARoom(idb: FakeIndexedDb, body: string) {
  const doc = new Y.Doc();
  const store = idb.openStore(roomStoreName(PRAXIS_ID, GENERATION), doc);
  const untrack = trackRoomStore(PRAXIS_ID, store);
  doc.getText("body").insert(0, body);
  return { doc, untrack };
}

/** Reopen after a withdraw: local store merged under a fresh server seed. */
function reopenRoom(idb: FakeIndexedDb, seed: string): string {
  const doc = new Y.Doc();
  idb.openStore(roomStoreName(PRAXIS_ID, GENERATION), doc);
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
    expect(idb.stored.has(roomStoreName(PRAXIS_ID, GENERATION))).toBe(true);

    // Publish happens before unmount; nothing may rely on teardown.
    discardRoomStore(PRAXIS_ID, GENERATION);

    expect(idb.stored.has(roomStoreName(PRAXIS_ID, GENERATION))).toBe(false);
    untrack();
  });

  it("leaves nothing behind to merge into the re-seeded document", () => {
    const { untrack } = draftInARoom(idb, "test");
    discardRoomStore(PRAXIS_ID, GENERATION);
    untrack();

    expect(reopenRoom(idb, "test")).toBe("test");
  });

  it("deletes the database outright when no room is open", () => {
    // E.g. a co-author loading an already-published page.
    idb.stored.set(roomStoreName(PRAXIS_ID, GENERATION), Y.encodeStateAsUpdate(new Y.Doc()));

    discardRoomStore(PRAXIS_ID, GENERATION);

    expect(idb.stored.has(roomStoreName(PRAXIS_ID, GENERATION))).toBe(false);
  });

  it("forgets a handle only while it is the live one", () => {
    const first = idb.openStore(roomStoreName(PRAXIS_ID, GENERATION), new Y.Doc());
    const untrackFirst = trackRoomStore(PRAXIS_ID, first);
    const second = idb.openStore(roomStoreName(PRAXIS_ID, GENERATION), new Y.Doc());
    trackRoomStore(PRAXIS_ID, second);
    // React runs the old cleanup AFTER the new effect opens (StrictMode).
    untrackFirst();

    idb.stored.set(roomStoreName(PRAXIS_ID, GENERATION), Y.encodeStateAsUpdate(new Y.Doc()));
    discardRoomStore(PRAXIS_ID, GENERATION);

    expect(idb.open.has(roomStoreName(PRAXIS_ID, GENERATION))).toBe(false);
    expect(idb.stored.has(roomStoreName(PRAXIS_ID, GENERATION))).toBe(false);
  });
});

describe("room store generations (#3644)", () => {
  it("names the store by generation", () => {
    expect(roomStoreName(PRAXIS_ID, 0)).not.toBe(roomStoreName(PRAXIS_ID, 1));
  });

  it("drops older generations and the legacy name, keeps the current", () => {
    const idb = new FakeIndexedDb();
    stubIndexedDb(idb);
    const empty = Y.encodeStateAsUpdate(new Y.Doc());
    for (const name of [
      `praxis-room-${PRAXIS_ID}`,
      roomStoreName(PRAXIS_ID, 0),
      roomStoreName(PRAXIS_ID, 1),
      roomStoreName(PRAXIS_ID + 1, 0),
    ]) idb.stored.set(name, empty);

    dropStaleRoomStores(PRAXIS_ID, 1);

    expect([...idb.stored.keys()].sort()).toEqual(
      [roomStoreName(PRAXIS_ID, 1), roomStoreName(PRAXIS_ID + 1, 0)].sort(),
    );
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
