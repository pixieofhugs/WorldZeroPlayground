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
 * ## What is deliberately not here
 *
 * Carets, collaborator colours and the presence roster (#1744) — the provider's
 * own awareness channel exists (it is y-websocket's keep-alive) but nothing
 * reads it yet. Freeze-on-pending (#1745). Offline persistence and the retiring
 * of the debounced `PUT` (#1743): until then the room is a *live view*, and
 * `useComposerDraft`'s `PUT` is still the only thing that writes the record.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

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

export interface PraxisRoom {
  /** The co-edited markdown body. Bound to CodeMirror by `BodyTextarea`. */
  body: Y.Text;
  /** The last-write-wins map holding {@link ROOM_TITLE_KEY}. */
  meta: Y.Map<string>;
  /**
   * The server's document has arrived at least once.
   *
   * Until it has, the editor shows an empty document that means nothing, so the
   * composer holds the body read-only. It goes back to `false` on disconnect.
   */
  synced: boolean;
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
  children,
}: {
  praxisId: number | null;
  children: ReactNode;
}) {
  // The shared types, kept apart from `synced` so their identity survives a
  // sync flip — `BodyTextarea` keys its editor on `body`, and a new identity
  // there would tear the editor down and rebuild it the moment the seed lands.
  const [types, setTypes] = useState<{ body: Y.Text; meta: Y.Map<string> } | null>(
    null,
  );
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (praxisId == null) {
      setTypes(null);
      setSynced(false);
      return;
    }
    const doc = new Y.Doc();
    // Read the root types into existence. NEVER insert into them: the server
    // seeded `body` already, and a second seed merges as a second copy.
    const body = doc.getText(ROOM_BODY_KEY);
    const meta = doc.getMap<string>(ROOM_META_KEY);
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
    setSynced(provider.synced);
    const onSync = (isSynced: boolean) => setSynced(isSynced);
    provider.on("sync", onSync);

    return () => {
      provider.off("sync", onSync);
      provider.destroy();
      doc.destroy();
      setTypes(null);
      setSynced(false);
    };
  }, [praxisId]);

  const room = useMemo<PraxisRoom | null>(
    () => (types === null ? null : { ...types, synced }),
    [types, synced],
  );

  return (
    <PraxisRoomContext.Provider value={room}>
      {children}
    </PraxisRoomContext.Provider>
  );
}
