/**
 * #3579 — "connected" is not delivery. A half-open socket stays connected and
 * never answers; publish must refuse so the local copy survives.
 */
import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import * as encoding from "lib0/encoding";
import { proveRoomDelivery, type ReconnectableProvider } from "../roomDelivery";

class FakeWs extends EventTarget {
  say(sv: Uint8Array) {
    const e = encoding.createEncoder();
    encoding.writeVarUint(e, 0);
    encoding.writeVarUint(e, 0);
    encoding.writeVarUint8Array(e, sv);
    const data = encoding.toUint8Array(e);
    this.dispatchEvent(
      Object.assign(new Event("message"), { data: data.buffer.slice(0) }),
    );
  }
}

/** `server` is what the room holds; a null server is a half-open socket that never replies. */
function providerFor(doc: Y.Doc, server: Y.Doc | null, applyOnStep2: boolean) {
  const p: ReconnectableProvider & { connects: number } = {
    ws: null,
    connects: 0,
    disconnect() {
      p.ws = null;
    },
    connect() {
      p.connects++;
      const ws = new FakeWs();
      p.ws = ws;
      if (!server) return;
      setTimeout(() => {
        ws.say(Y.encodeStateVector(server));
        if (applyOnStep2) Y.applyUpdate(server, Y.encodeStateAsUpdate(doc));
      }, 0);
    },
  };
  return p;
}

describe("proveRoomDelivery", () => {
  it("refuses on a half-open socket that never answers", async () => {
    const doc = new Y.Doc();
    doc.getText("body").insert(0, "typed after the last sync");
    expect(await proveRoomDelivery(providerFor(doc, null, false), doc, 60)).toBe(false);
  });

  it("refuses while the server keeps missing the edit", async () => {
    const doc = new Y.Doc();
    doc.getText("body").insert(0, "x");
    expect(await proveRoomDelivery(providerFor(doc, new Y.Doc(), false), doc, 200)).toBe(false);
  });

  it("proves delivery once a later connection shows the server holds the edit", async () => {
    const doc = new Y.Doc();
    doc.getText("body").insert(0, "x");
    const p = providerFor(doc, new Y.Doc(), true);
    expect(await proveRoomDelivery(p, doc, 200)).toBe(true);
    expect(p.connects).toBe(2);
  });
});
