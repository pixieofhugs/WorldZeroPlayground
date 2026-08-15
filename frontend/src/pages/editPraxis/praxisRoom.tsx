/**
 * The praxis room, client side (ADR-0073, #1742).
 *
 * A **room** is the live editing space for one praxis. The server holds the
 * CRDT document (`backend/services/praxis_room.py`, #1740); this opens one
 * WebSocket onto it and hands the two shared types to the composer's controls.
 *
 * ## The one rule
 *
 * **The server seeds the document. This file never does.** `getText` below
 * *reads* a root type into existence locally; it never inserts. Two clients
 * that each build a document out of the same `body_text` and then merge end up
 * with **two copies of that text** — the standard Yjs duplication footgun, and
 * the reason `_load_or_seed` is server-side and holds a lock. So an empty
 * `body` here means either "the praxis really is empty" or "the seed has not
 * arrived yet", and in neither case may we write `state.body` into it.
 *
 * The composer's read-only-until-synced gate (`controls.tsx`) is the visible
 * half of that rule: nobody can type into a document that has not told us what
 * it contains, so nothing can be typed *in front of* the seed and nothing can
 * be flushed over the praxis on the strength of an empty editor.
 *
 * ## The room is the record's only writer
 *
 * There is no debounced `PUT` behind this any more (#1743). The document goes
 * to the server, which flushes it into `praxis.title` and `praxis.body_text`;
 * nothing on this side writes the praxis, which is why nothing on this side has
 * a dirty check, a flush order or an "unsaved" state to get wrong.
 *
 * Updates are held locally in IndexedDB as well, so a composer that loses the
 * network keeps taking text and merges it on reconnect — where the `PUT` simply
 * failed and lost the paragraph.
 *
 * ## What is deliberately not here
 *
 * Carets, collaborator colours and the presence roster (#1744) — the provider's
 * own awareness channel exists (it is y-websocket's keep-alive) but nothing
 * reads it yet. Freeze-on-pending and discarding the document on publish
 * (#1745).
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { IndexeddbPersistence } from "y-indexeddb";

/**
 * The body's root key — `ROOM_BODY_KEY` in `praxis_room.py`. The server seeds a
 * `Text` under exactly this name, so a mismatch is not an error, it is a second
 * empty document sitting silently beside the real one.
 */
const ROOM_BODY_KEY = "body";

/**
 * The title's last-write-wins map, and its one key.
 *
 * Nothing seeds these server-side (#1740 seeds `body` alone), so the key does
 * not exist until a co-author edits the title. **Absent means "no remote value
 * yet", never "remote cleared the title"** — see `TitleField`.
 */
const ROOM_META_KEY = "meta";
export const ROOM_TITLE_KEY = "title";

/**
 * RFC 6455 "policy violation" — what the room sends when door one refuses a
 * handshake or door two revokes a kicked member (`_WS_POLICY_VIOLATION`).
 * y-websocket reconnects with backoff for every code outside 4400-4499, which
 * for a refusal is an infinite retry of a request that will never be granted.
 */
const WS_POLICY_VIOLATION = 1008;

/** The room mount in `main.py`: `app.mount("/rooms", PRAXIS_ROOM_APP)`. */
const ROOM_PATH = "/rooms/praxis";

/**
 * The socket origin, derived from the one base URL `api/client.ts` uses.
 *
 * No ticket and no token in the URL: the handshake carries the existing
 * httpOnly `access_token` cookie, which the browser attaches because the API is
 * same-site with the app (ADR-0073). Nothing here can read that cookie, and
 * nothing here should try.
 */
function roomServerUrl(): string {
  const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
  return `${apiBase.replace(/^http/, "ws")}${ROOM_PATH}`;
}

/** The IndexedDB database holding one praxis's offline copy of its document. */
function roomStoreName(praxisId: number): string {
  return `praxis-room-${praxisId}`;
}

/**
 * Drop this browser's copy of a document the server has destroyed (#1745).
 *
 * Publishing flattens the room into `body_text` and deletes the stored
 * document; `pullBack` then seeds a **new** one from that text. This store
 * holds the old one, and the two were built independently — merged, the praxis
 * would hold its body twice. That is the ADR-0073 duplication footgun arriving
 * from the client side, and it is invisible when it happens, because both
 * copies say the same thing.
 *
 * It is also the local half of the privacy rule: the tombstones the server just
 * dropped — text a member typed and deleted — are in here too.
 *
 * Deleting the database rather than `clearData()`ing a handle: constructing an
 * `IndexeddbPersistence` purely to empty it would re-create the store it is
 * emptying. A delete blocked by an open handle completes once that handle
 * closes, which is the provider teardown this fires alongside.
 */
export function discardRoomStore(praxisId: number): void {
  // The static-render harness runs in `node`, where there is no IndexedDB.
  if (typeof indexedDB === "undefined") return;
  indexedDB.deleteDatabase(roomStoreName(praxisId));
}

export interface PraxisRoom {
  /** The co-edited markdown body. Bound to CodeMirror by `BodyTextarea`. */
  body: Y.Text;
  /** The last-write-wins map holding {@link ROOM_TITLE_KEY}. */
  meta: Y.Map<string>;
  /**
   * The document has arrived — from the socket, or from the offline store.
   *
   * Until it has, the editor holds an empty document that means nothing, and
   * the composer keeps the body read-only (`BodyTextarea`). #1742 kept that
   * gate because a keystroke landing in front of the seed could be flushed over
   * the praxis by the still-live `PUT`. That `PUT` is gone, and the gate is
   * kept for a reason that survives it: the server seeds the document exactly
   * once, so text typed *before* the seed is merged into text the player has
   * never seen, at whatever positions the CRDT picks. Nothing is lost, but the
   * result is a document nobody wrote.
   *
   * **It latches.** Seeding is a once-per-document event, so a dropped socket
   * does not un-seed anything — and if this went back to `false` on
   * disconnect, a wifi blip would freeze the editor mid-sentence and offline
   * authoring, the whole point of the local store, could never happen.
   */
  seeded: boolean;
}

const PraxisRoomContext = createContext<PraxisRoom | null>(null);

/**
 * The room this composer is writing in, or `null` where there is none — an
 * archetype rendered outside the page (the design-sync preview kit, a static
 * test) gets `null` and draws an editor bound to nothing rather than throwing.
 */
export function usePraxisRoom(): PraxisRoom | null {
  return useContext(PraxisRoomContext);
}

/**
 * Open a room for `praxisId` for as long as this subtree is mounted.
 *
 * `praxisId` of `null` opens nothing, which is how the page keeps its hooks
 * unconditional while the praxis is still loading.
 */
export function PraxisRoomProvider({
  praxisId,
  onUpdate,
  children,
}: {
  praxisId: number | null;
  /**
   * The room took an update — the composer's one honest "Saved …" signal
   * (#1743).
   *
   * Fires for a co-author's typing as well as your own, which is the point: an
   * update the room has is already in `praxis_room_update`, and
   * `praxis.body_text` follows it on the server's own debounce. Passed in
   * rather than exposed on the context because the archetypes read it off
   * `EditPraxisState`, and `useEditPraxis` runs outside this provider.
   */
  onUpdate?: (at: Date) => void;
  children: ReactNode;
}) {
  // The shared types, kept apart from `seeded` so their identity survives the
  // seed landing — `BodyTextarea` keys its editor on `body`, and a new identity
  // there would tear the editor down and rebuild it at that moment.
  const [types, setTypes] = useState<{ body: Y.Text; meta: Y.Map<string> } | null>(
    null,
  );
  const [seeded, setSeeded] = useState(false);
  // Read through a ref so a caller passing an inline callback does not tear the
  // socket down and rebuild it on every render.
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (praxisId == null) {
      setTypes(null);
      setSeeded(false);
      return;
    }
    const doc = new Y.Doc();
    // Read the root types into existence. NEVER insert into them: the server
    // seeded `body` already, and a second seed merges as a second copy.
    const body = doc.getText(ROOM_BODY_KEY);
    const meta = doc.getMap<string>(ROOM_META_KEY);
    // Offline authoring (#1743). Not a cache and not a second seed: it is the
    // SAME document, replayed from the browser and merged by the CRDT on
    // reconnect. What it replaces — a `PUT` that simply failed when the network
    // was down, losing the paragraph outright — is why this is strictly better
    // rather than a nicety. The room is still the only thing that writes the
    // record; this only decides where the updates wait.
    //
    // Publishing destroys the server's document and `pullBack` re-seeds a fresh
    // one (#1745), so this store is dropped in the same beat — see
    // `discardRoomStore` below.
    const offline = new IndexeddbPersistence(roomStoreName(praxisId), doc);
    const provider = new WebsocketProvider(
      roomServerUrl(),
      String(praxisId),
      doc,
      {
        // A refusal is not a hiccup. Door one turns away a non-member and door
        // two closes on a kicked one; both are permanent for this praxis, and
        // retrying either forever is a socket storm that changes no answer.
        shouldReconnect: (event) => event.code !== WS_POLICY_VIOLATION,
      },
    );
    setTypes({ body, meta });

    // Latch, never unlatch — see `PraxisRoom.seeded`.
    const markSeeded = () => setSeeded(true);
    if (provider.synced) markSeeded();
    const onSync = (isSynced: boolean) => {
      if (isSynced) markSeeded();
    };
    provider.on("sync", onSync);

    // The offline store counts as the seed arriving, but ONLY when it restored
    // something. An empty store is a praxis whose room this browser has never
    // opened, and unlocking the editor for it would let a first-ever offline
    // visit type in front of a seed that has not happened yet. An empty
    // document's state vector is one byte; a seeded one names the server's
    // client id, so this asks "did anything come back?" without reaching into
    // y-indexeddb's internals.
    const onOfflineLoaded = () => {
      if (Y.encodeStateVector(doc).byteLength > 1) markSeeded();
    };
    offline.on("synced", onOfflineLoaded);

    const onDocUpdate = () => onUpdateRef.current?.(new Date());
    doc.on("update", onDocUpdate);

    return () => {
      doc.off("update", onDocUpdate);
      provider.off("sync", onSync);
      offline.off("synced", onOfflineLoaded);
      provider.destroy();
      // `destroy()` closes the store; `clearData()` is what would delete it,
      // and must not be called here — the point of the store is that it
      // outlives the tab.
      void offline.destroy();
      doc.destroy();
      setTypes(null);
      setSeeded(false);
    };
  }, [praxisId]);

  const room = useMemo<PraxisRoom | null>(
    () => (types === null ? null : { ...types, seeded }),
    [types, seeded],
  );

  return (
    <PraxisRoomContext.Provider value={room}>
      {children}
    </PraxisRoomContext.Provider>
  );
}
