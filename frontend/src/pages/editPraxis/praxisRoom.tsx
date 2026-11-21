/**
 * The praxis room, client side (ADR-0073, #1742): one WebSocket onto the
 * server-held CRDT document (`backend/services/praxis_room.py`).
 *
 * **The server seeds the document; this file never inserts.** Two clients
 * seeding from the same `body_text` merge into two copies of the text (the Yjs
 * duplication footgun). An empty `body` may just mean the seed hasn't arrived,
 * so never write `state.body` into it. The room is the record's only writer.
 *
 * Awareness (presence, #1744) is self-reported and relayed: nothing derived from
 * it may reach an authorization branch. Membership is checked server-side.
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
import { closeEndsRoom, shouldReconnectRoom } from "./roomReconnect";
import type { RoomEndReason } from "./roomSeal";
import {
  dropStaleRoomStores,
  roomStoreName,
  trackRoomState,
  trackRoomStore,
} from "./roomStore";
import { API_BASE_URL } from "../../api/baseUrl";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let start = 0; start < bytes.length; start += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000));
  }
  return btoa(binary);
}

/** Must match `ROOM_BODY_KEY` in `praxis_room.py`; a mismatch is a silent empty doc. */
const ROOM_BODY_KEY = "body";

/**
 * Title LWW map. Not seeded server-side: an absent key means "no remote value
 * yet", never "remote cleared the title" (see `TitleField`).
 */
const ROOM_META_KEY = "meta";
export const ROOM_TITLE_KEY = "title";

/** `app.mount("/rooms", PRAXIS_ROOM_APP)` in `main.py`. */
const ROOM_PATH = "/rooms/praxis";

/** Auth rides the same-site httpOnly `access_token` cookie (ADR-0073); no token in URL. */
function roomServerUrl(): string {
  return `${API_BASE_URL.replace(/^http/, "ws")}${ROOM_PATH}`;
}

export interface PraxisRoom {
  /** Bound to CodeMirror by `BodyTextarea`. */
  body: Y.Text;
  /** The LWW map holding {@link ROOM_TITLE_KEY}. */
  meta: Y.Map<string>;
  /**
   * Presence channel carrying this client's identity. Pass to `yCollab` only
   * through `paintedAwareness()`; other readers use {@link present}.
   */
  awareness: Awareness;
  /** Sorted, tab-deduped ids incl. the viewer; stable while only cursors move. Decoration only. */
  present: readonly number[];
  /**
   * The document arrived (socket or offline store). Until then the body stays
   * read-only: text typed before the once-only seed merges into text nobody saw.
   * Latches: un-seeding on disconnect would freeze the editor and kill offline
   * authoring.
   */
  seeded: boolean;
  /**
   * The room stopped trying to connect (#1804): refused, or failed too often
   * before ever opening (`roomReconnect.ts`). Lets the composer say why it's
   * read-only.
   */
  unreachable: boolean;
  /** Server closed with 1008 (kick, seal). Unlike `unreachable`, never a server that was down at load. */
  ended: boolean;
  /** Null while the refetch is in flight. */
  endReason: RoomEndReason | null;
  /** The server's document is in step with ours; false while offline or reconnecting. */
  synced: boolean;
}

const PraxisRoomContext = createContext<PraxisRoom | null>(null);

/** `null` outside a provider (design-sync preview, static tests): editor binds to nothing. */
export function usePraxisRoom(): PraxisRoom | null {
  return useContext(PraxisRoomContext);
}

/** Open a room while mounted; `praxisId` `null` opens nothing (keeps hooks unconditional). */
export function PraxisRoomProvider({
  praxisId,
  roomGeneration,
  onUpdate,
  onEnded,
  children,
}: {
  praxisId: number | null;
  /** The praxis's `room_generation`; keys the offline store (#3644). */
  roomGeneration: number;
  /**
   * The room took an update (any author) — the composer's "Saved …" signal
   * (#1743). A prop, not context, because `useEditPraxis` runs outside this
   * provider.
   */
  onUpdate?: (at: Date) => void;
  /** The close carries no reason; resolve it with a refetch. */
  onEnded?: () => Promise<RoomEndReason>;
  children: ReactNode;
}) {
  // Kept apart from `seeded`/`present`: `BodyTextarea` keys its editor on
  // `body` and `awareness`, and a new identity rebuilds it mid-sentence.
  const [types, setTypes] = useState<{
    body: Y.Text;
    meta: Y.Map<string>;
    awareness: Awareness;
  } | null>(null);
  const [seeded, setSeeded] = useState(false);
  const [unreachable, setUnreachable] = useState(false);
  const [synced, setSynced] = useState(false);
  const [ended, setEnded] = useState(false);
  const [endReason, setEndReason] = useState<RoomEndReason | null>(null);
  const [present, setPresent] = useState<readonly number[]>([]);
  // Narrowed fields: `/auth/me` mints a fresh object per refetch (#1390).
  const character = useAuth().user?.character ?? null;
  const characterId = character?.id ?? null;
  const characterName = character?.display_name ?? null;
  const characterFaction = character?.faction_slug ?? null;
  // Ref so an inline callback doesn't rebuild the socket each render.
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  useEffect(() => {
    if (praxisId == null) {
      setTypes(null);
      setSeeded(false);
      setUnreachable(false);
      setSynced(false);
      setEnded(false);
      setEndReason(null);
      setPresent([]);
      return;
    }
    const doc = new Y.Doc();
    // Read root types into existence. NEVER insert: a second seed duplicates.
    const body = doc.getText(ROOM_BODY_KEY);
    const meta = doc.getMap<string>(ROOM_META_KEY);
    // Offline authoring (#1743): the same document replayed from the browser,
    // merged on reconnect. Dropped on publish — see `discardRoomStore`.
    dropStaleRoomStores(praxisId, roomGeneration);
    const offline = new IndexeddbPersistence(
      roomStoreName(praxisId, roomGeneration),
      doc,
    );
    // An open store blocks deletes, so a discard must go through this handle (#2381).
    const untrackStore = trackRoomStore(praxisId, offline);
    // Per-effect, not a ref: a new `praxisId`'s socket has opened nothing. Latches.
    let hasOpened = false;
    let cancelled = false;
    const provider = new WebsocketProvider(
      roomServerUrl(),
      String(praxisId),
      doc,
      {
        // A refusal closes before the upgrade, so JS sees 1006 either way
        // (#1804); "were we ever admitted" is what separates them.
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
    // Emitted exactly when `shouldReconnect` says no.
    const onClosed = ({ code }: { code: number }) => {
      setUnreachable(true);
      if (!closeEndsRoom(code)) return;
      setEnded(true);
      void onEndedRef.current?.().then((reason) => {
        if (!cancelled) setEndReason(reason);
      });
    };
    provider.on("closed", onClosed);
    const awareness = provider.awareness;
    setTypes({ body, meta, awareness });

    // `change` fires per remote cursor move; compare by value so the roster
    // doesn't re-render every keystroke.
    const syncPresence = () => {
      const next = presentCharacterIds(awareness.getStates());
      setPresent((current) => (samePresence(current, next) ? current : next));
    };
    awareness.on("change", syncPresence);
    syncPresence();

    const markSeeded = () => setSeeded(true);
    if (provider.synced) markSeeded();
    const onSync = (isSynced: boolean) => {
      setSynced(isSynced);
      if (isSynced) markSeeded();
    };
    setSynced(provider.synced);
    provider.on("sync", onSync);

    // The offline store counts as the seed ONLY if it restored something: an
    // empty doc's state vector is one byte.
    const onOfflineLoaded = () => {
      if (Y.encodeStateVector(doc).byteLength > 1) markSeeded();
    };
    offline.on("synced", onOfflineLoaded);

    const onDocUpdate = () => {
      onUpdateRef.current?.(new Date());
    };
    doc.on("update", onDocUpdate);
    const untrackState = trackRoomState(praxisId, () =>
      bytesToBase64(Y.encodeStateAsUpdate(doc)),
    );

    return () => {
      cancelled = true;
      doc.off("update", onDocUpdate);
      untrackState();
      provider.off("sync", onSync);
      provider.off("status", onStatus);
      provider.off("closed", onClosed);
      awareness.off("change", syncPresence);
      offline.off("synced", onOfflineLoaded);
      // Also drops this client's awareness state.
      provider.destroy();
      // `destroy()` closes the store; never `clearData()` here — it outlives the tab.
      untrackStore();
      void offline.destroy();
      doc.destroy();
      setTypes(null);
      setSeeded(false);
      setUnreachable(false);
      setSynced(false);
      setEnded(false);
      setEndReason(null);
      setPresent([]);
    };
  }, [praxisId, roomGeneration]);

  // Separate effect keyed on the viewer: switching character re-publishes
  // without rebuilding the socket. No character, nothing to publish.
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
    () => (types === null ? null : { ...types, seeded, unreachable, ended, endReason, synced, present }),
    [types, seeded, unreachable, ended, endReason, synced, present],
  );

  return (
    <PraxisRoomContext.Provider value={room}>
      {children}
    </PraxisRoomContext.Provider>
  );
}
