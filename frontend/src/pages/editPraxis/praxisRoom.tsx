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
 * ## Presence rides the same socket (#1744)
 *
 * The provider's awareness channel — y-websocket's keep-alive — now also
 * carries who is in the room. This file publishes the viewer's identity into it
 * and derives {@link PraxisRoom.present} out of it; the caret paint and the
 * sanitizing seam that makes a remote's claimed state safe to render live next
 * door in `roomPresence.ts`.
 *
 * Awareness is **self-reported by each client and relayed**, so nothing derived
 * from it may reach an authorization branch. Membership is the edit key and the
 * server checks it at connect and at revoke (#1740).
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
import type { Awareness } from "y-protocols/awareness";
import { useAuth } from "../../auth/AuthContext";
import {
  presentCharacterIds,
  publishPresence,
  samePresence,
} from "./roomPresence";
import { shouldReconnectRoom } from "./roomReconnect";
import { roomStoreName, trackRoomStore } from "./roomStore";
import { API_BASE_URL } from "../../api/baseUrl";

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
  return `${API_BASE_URL.replace(/^http/, "ws")}${ROOM_PATH}`;
}

/*
 * The local copy of a room document — its database name and its disposal —
 * lives in `roomStore.ts` (#2381). It left this file because the disposal has a
 * trap in it (a delete is blocked for as long as the store is open) and a rule
 * that can only be reached through a provider cannot be proved in a harness
 * with no DOM. The provider's part is to announce its store while it holds it,
 * below.
 */

export interface PraxisRoom {
  /** The co-edited markdown body. Bound to CodeMirror by `BodyTextarea`. */
  body: Y.Text;
  /** The last-write-wins map holding {@link ROOM_TITLE_KEY}. */
  meta: Y.Map<string>;
  /**
   * The room's presence channel, already carrying this client's identity.
   *
   * Handed to `yCollab` — through `paintedAwareness()`, never raw — so
   * co-authors' carets draw in their own faction's hue (#1744). Anything else
   * reading it should read {@link present} instead.
   */
  awareness: Awareness;
  /**
   * The character ids with this room open, including the viewer's own. Sorted,
   * deduped across tabs, and stable while only cursors move.
   *
   * **Decoration, never authorization** — see the file docblock.
   */
  present: readonly number[];
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
  /**
   * The room has stopped trying to connect (#1804).
   *
   * True when the socket was refused, or failed enough times before ever
   * opening that retrying became a storm rather than a recovery — see
   * `roomReconnect.ts`. Once opened, retries are unbounded and this stays
   * false however long the network is away.
   *
   * A room that never opened never seeds, so the composer stays read-only
   * either way; this is what lets it say *why* instead of sitting silently in
   * a state it will never leave.
   */
  unreachable: boolean;
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
  /* #1931's `onSealed` is gone with the freeze it announced (ADR-0079, #1811).
   * The server no longer hangs a socket up on a status transition — the room
   * takes writes in every status a member can reach — so there is no close
   * code left for a client to interpret. */
  children: ReactNode;
}) {
  // The room's long-lived handles, kept apart from `seeded` and `present` so
  // their identity survives both landing — `BodyTextarea` keys its editor on
  // `body` AND on `awareness`, and a new identity on either would tear the
  // editor down and rebuild it mid-sentence.
  const [types, setTypes] = useState<{
    body: Y.Text;
    meta: Y.Map<string>;
    awareness: Awareness;
  } | null>(null);
  const [seeded, setSeeded] = useState(false);
  const [unreachable, setUnreachable] = useState(false);
  const [present, setPresent] = useState<readonly number[]>([]);
  // The viewer, for the identity this client publishes. Narrowed to the three
  // fields rather than held as `user`, because `/auth/me` mints a fresh object
  // on every refetch and an effect keyed on the whole thing re-runs for each
  // one (#1390).
  const character = useAuth().user?.character ?? null;
  const characterId = character?.id ?? null;
  const characterName = character?.display_name ?? null;
  const characterFaction = character?.faction_slug ?? null;
  // Read through a ref so a caller passing an inline callback does not tear the
  // socket down and rebuild it on every render.
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (praxisId == null) {
      setTypes(null);
      setSeeded(false);
      setUnreachable(false);
      setPresent([]);
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
    // `discardRoomStore` in `roomStore.ts`.
    const offline = new IndexeddbPersistence(roomStoreName(praxisId), doc);
    // Announce it while it is open. A discard that arrives now — the composer
    // that publishes is holding this very store — has to go through this handle
    // rather than through a delete the handle would block (#2381).
    const untrackStore = trackRoomStore(praxisId, offline);
    // Did this room's socket ever open? A local `let` rather than a ref because
    // the latch belongs to THIS provider: a new `praxisId` builds a new socket,
    // which has opened nothing, and a ref shared across effect runs would tell
    // it otherwise. Latches, never unlatches — the closure below reads it at
    // call time.
    let hasOpened = false;
    const provider = new WebsocketProvider(
      roomServerUrl(),
      String(praxisId),
      doc,
      {
        // A refusal is not a hiccup, and the browser cannot tell us it was one:
        // door one closes before the upgrade, so JS sees 1006 and no server can
        // say otherwise (#1804). The question that does separate them is
        // whether we were ever admitted — see `roomReconnect.ts`.
        shouldReconnect: (event, self) =>
          shouldReconnectRoom(
            event.code,
            self.wsUnsuccessfulReconnects,
            hasOpened,
          ),
      },
    );
    const onStatus = ({ status }: { status: string }) => {
      if (status === "connected") hasOpened = true;
    };
    provider.on("status", onStatus);
    // y-websocket emits this exactly when `shouldReconnect` says no, having
    // already stopped. Nothing else will happen in this room now, so say so.
    const onClosed = () => setUnreachable(true);
    provider.on("closed", onClosed);
    const awareness = provider.awareness;
    setTypes({ body, meta, awareness });

    // Who is in the room (#1744). `change` fires on every remote cursor move,
    // so the derivation is sorted and compared BY VALUE — otherwise a co-author
    // holding a key re-renders the roster, and every composer archetype under
    // it, once per keystroke.
    const syncPresence = () => {
      const next = presentCharacterIds(awareness.getStates());
      setPresent((current) => (samePresence(current, next) ? current : next));
    };
    awareness.on("change", syncPresence);
    syncPresence();

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
      provider.off("status", onStatus);
      provider.off("closed", onClosed);
      awareness.off("change", syncPresence);
      offline.off("synced", onOfflineLoaded);
      // Also drops this client's awareness state — the socket closing is what
      // takes the dot off everyone else's roster.
      provider.destroy();
      // `destroy()` closes the store; `clearData()` is what would delete it,
      // and must not be called here — the point of the store is that it
      // outlives the tab.
      untrackStore();
      void offline.destroy();
      doc.destroy();
      setTypes(null);
      setSeeded(false);
      setUnreachable(false);
      setPresent([]);
    };
  }, [praxisId]);

  // Say who is typing. A SECOND effect, keyed on the viewer rather than on the
  // praxis, so switching character re-publishes an identity without tearing the
  // socket — and its document — down and rebuilding it. `user` is a
  // last-write-wins awareness field, so a re-publish costs one small broadcast.
  //
  // Nothing is published without a character: there is no identity to claim,
  // and a room only opens on a page that already required one.
  useEffect(() => {
    const awareness = types?.awareness;
    if (!awareness || characterId == null) return;
    publishPresence(awareness, {
      id: characterId,
      display_name: characterName ?? "",
      faction_slug: characterFaction ?? "",
    });
  }, [types, characterId, characterName, characterFaction]);

  const room = useMemo<PraxisRoom | null>(
    () => (types === null ? null : { ...types, seeded, unreachable, present }),
    [types, seeded, unreachable, present],
  );

  return (
    <PraxisRoomContext.Provider value={room}>
      {children}
    </PraxisRoomContext.Provider>
  );
}
