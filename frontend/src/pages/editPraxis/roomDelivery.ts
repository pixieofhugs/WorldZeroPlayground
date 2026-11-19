/**
 * Proof that the server holds every local edit (#3579). The "connected" flag
 * proves nothing: a half-open socket stays connected for ~30 s while edits go
 * into the void. So reconnect and read the server's own sync step 1, whose
 * state vector is what it holds at that moment. A first reconnect sends our
 * step 2; the server applies it after answering, so a second one confirms.
 *
 * ponytail: state vectors don't see delete-only edits (no new clock); those
 * ride the same step 2 but are not proven. Add a hash exchange if that bites.
 */
import * as Y from "yjs";
import * as decoding from "lib0/decoding";

/** The slice of `WebsocketProvider` this needs. */
export interface ReconnectableProvider {
  ws: EventTarget | null;
  connect: () => void;
  disconnect: () => void;
}

const MESSAGE_SYNC = 0;
const SYNC_STEP_1 = 0;

function serverStateVector(
  provider: ReconnectableProvider,
  timeoutMs: number,
): Promise<Map<number, number> | null> {
  provider.disconnect();
  provider.connect();
  const ws = provider.ws;
  if (!ws) return Promise.resolve(null);
  return new Promise((resolve) => {
    const done = (sv: Map<number, number> | null) => {
      clearTimeout(timer);
      ws.removeEventListener("message", onMessage);
      resolve(sv);
    };
    const timer = setTimeout(() => done(null), timeoutMs);
    const onMessage = (event: Event) => {
      const decoder = decoding.createDecoder(
        new Uint8Array((event as MessageEvent<ArrayBuffer>).data),
      );
      if (
        decoding.readVarUint(decoder) === MESSAGE_SYNC &&
        decoding.readVarUint(decoder) === SYNC_STEP_1
      ) {
        done(Y.decodeStateVector(decoding.readVarUint8Array(decoder)));
      }
    };
    ws.addEventListener("message", onMessage);
  });
}

export async function proveRoomDelivery(
  provider: ReconnectableProvider,
  doc: Y.Doc,
  timeoutMs: number,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  for (let attempt = 0; attempt < 2; attempt++) {
    const server = await serverStateVector(provider, deadline - Date.now());
    if (!server) return false;
    const local = Y.decodeStateVector(Y.encodeStateVector(doc));
    if ([...local].every(([client, clock]) => (server.get(client) ?? 0) >= clock)) {
      return true;
    }
  }
  return false;
}
