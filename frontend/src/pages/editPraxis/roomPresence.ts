/**
 * Presence in a praxis room (#1744, ADR-0073) — the pure half.
 *
 * A room's **awareness** channel is the ephemeral sidecar to its CRDT document:
 * who has the composer open, and where their cursor is. `y-codemirror.next`
 * draws the carets straight out of it, and `CollabRoster` lights a dot from
 * {@link presentCharacterIds}. Nothing here touches the record; presence
 * vanishes with the tab.
 *
 * ## Decoration, never authorization
 *
 * Awareness is **self-reported by each client and relayed** — the server does
 * not vouch for a word of it, so a co-member can claim to be any character.
 * That is acceptable *because presence never reaches an authorization branch*:
 * membership is the edit key and is checked server-side at connect and at
 * revoke (#1740). A dot beside the wrong name is a cosmetic lie by somebody you
 * invited. Do not grow a permission, a gate or a count that anybody acts on out
 * of this data.
 *
 * ## Why the wire carries a SLUG and never a colour
 *
 * The caret widget in `y-codemirror.next` builds its DOM as
 * `style="background-color: ${color}; border-color: ${color}"` — the remote's
 * own `user.color` string, interpolated into a style attribute on your page. A
 * remote that sends `red; position: fixed; inset: 0; background-image: url(…)`
 * gets full-viewport real estate and a load beacon on your composer.
 *
 * So the sender publishes `factionSlug` ({@link publishPresence}) and the
 * RECEIVER derives the paint ({@link paintedAwareness}) through
 * `factionCssVar()`, which resolves anything it does not recognise to
 * `default`. The reachable set of colours is then closed at nine, whatever a
 * remote sends. `name` is clipped in the same pass: it is not an injection —
 * the library writes it with `textContent` — but it is unbounded text in an
 * absolutely-positioned, `nowrap` label.
 */
import { factionCssVar } from "../../utils/factions";

/**
 * The awareness field `y-codemirror.next` reads its caret out of. Not a choice:
 * `y-remote-selections.js` destructures `state.user`, so this name is the
 * library's, and a mismatch is a silent no-caret rather than an error.
 */
const PRESENCE_FIELD = "user";

/**
 * How much of a remote name reaches the DOM. The hover label is one line of
 * `nowrap` text over the editor, so this is a layout ceiling, not a security
 * one — the library sets it with `textContent`.
 */
const MAX_PRESENCE_NAME = 64;

/**
 * How much of the faction hue the selection band takes. `color-mix` rather than
 * an alpha hex because the colour is a `var()`, which cannot be suffixed — see
 * {@link paintUser}.
 */
const SELECTION_TINT = "22%";

/** What this client publishes about itself. JSON — it crosses a socket. */
export interface PresenceUser {
  characterId: number;
  name: string;
  factionSlug: string;
}

/** What a receiver hands `y-codemirror.next`, derived and never relayed. */
interface PaintedPresenceUser {
  name: string;
  color: string;
  colorLight: string;
}

/** The shape of the awareness map both halves read. */
type PresenceStates = Map<number, Record<string, unknown>>;

/**
 * The slice of `y-protocols`' `Awareness` this module needs. Structural so the
 * pure functions can be exercised against a bare `Awareness` in the
 * effect-less node harness, and so nothing here depends on y-websocket.
 */
export interface AwarenessLike {
  getStates(): PresenceStates;
  setLocalStateField(field: string, value: unknown): void;
}

/** The identity fields presence publishes. A `CharacterOut` satisfies it. */
export interface PresenceCharacter {
  id: number;
  display_name: string;
  faction_slug: string;
}

/**
 * Announce who is typing here. Call it whenever the viewer changes — it is a
 * last-write-wins field, so re-publishing costs one small broadcast and never
 * disturbs the document or the socket.
 */
export function publishPresence(
  awareness: AwarenessLike,
  character: PresenceCharacter,
): void {
  const user: PresenceUser = {
    characterId: character.id,
    name: character.display_name,
    factionSlug: character.faction_slug,
  };
  awareness.setLocalStateField(PRESENCE_FIELD, user);
}

/**
 * The character ids currently connected, deduped and sorted.
 *
 * Deduped because two tabs are two client ids and one player, and a roster row
 * is per character. Sorted so {@link samePresence} can compare by value.
 *
 * The local client is included: the viewer IS connected, and a lit dot on your
 * own row is what teaches you what the dot means.
 */
export function presentCharacterIds(states: PresenceStates): number[] {
  const ids = new Set<number>();
  states.forEach((state) => {
    const user = readUser(state);
    const id = user.characterId;
    if (typeof id === "number" && Number.isInteger(id) && id > 0) ids.add(id);
  });
  return [...ids].sort((a, b) => a - b);
}

/**
 * Value equality for a presence list.
 *
 * The awareness `change` event fires on **every cursor move**, so without this
 * guard a co-author holding a key re-renders the roster — and every composer
 * archetype under it — per keystroke.
 */
export function samePresence(
  a: readonly number[],
  b: readonly number[],
): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

/**
 * The awareness object to hand `yCollab`, with every remote's paint derived
 * from its slug instead of taken from the wire.
 *
 * A `Proxy` over `getStates()` alone: `setLocalStateField`, `getLocalState`,
 * `doc.clientID` and the `on`/`off` the caret plugin subscribes with all reach
 * the real object untouched, so the provider still broadcasts this client's
 * cursor and a remote's arrival still redraws. Only the READ the DOM is built
 * from is filtered — which is the only place a remote string was ever going to
 * land in a style attribute.
 *
 * Hand this to `yCollab` and nothing else. The `WebsocketProvider` keeps the
 * real `Awareness`: the protocol encoder reads `awareness.states` directly, and
 * broadcasting the painted view would put our derived `var()` strings on the
 * wire as if they were somebody's identity.
 */
export function paintedAwareness<A extends AwarenessLike>(awareness: A): A {
  return new Proxy(awareness, {
    get(target, property) {
      if (property === "getStates") {
        return () => paintStates(target.getStates());
      }
      const value = Reflect.get(target, property, target) as unknown;
      // Bound, so an inherited method called through the proxy still resolves
      // `this.states` / `this._observers` on the real awareness.
      return typeof value === "function"
        ? (value as (...args: unknown[]) => unknown).bind(target)
        : value;
    },
  });
}

function paintStates(states: PresenceStates): PresenceStates {
  const painted: PresenceStates = new Map();
  states.forEach((state, clientId) => {
    // Spread first, then overwrite: `cursor` is what positions the caret and
    // must survive verbatim, while `user` is replaced WHOLESALE so a
    // remote-supplied `color` / `colorLight` cannot ride along beside ours.
    painted.set(clientId, { ...state, [PRESENCE_FIELD]: paintUser(state) });
  });
  return painted;
}

function paintUser(state: Record<string, unknown>): PaintedPresenceUser {
  const user = readUser(state);
  const slug = typeof user.factionSlug === "string" ? user.factionSlug : null;
  // No suffix: a caret is scalar ink on the VIEWER's editor ground, not on the
  // remote's card sheet, so the `card-*` family (measured against that sheet)
  // is the wrong tier. `na` and `albescent` landing on `--faction-default` is
  // ADR-0039 §2's decision, not a fallback.
  const color = factionCssVar(slug);
  return {
    name: typeof user.name === "string" ? user.name.slice(0, MAX_PRESENCE_NAME) : "",
    color,
    // The library's own fallback is `color + '33'`, which on a `var()` yields
    // the invalid `var(--faction-coven)33` and paints no selection at all.
    colorLight: `color-mix(in srgb, ${color} ${SELECTION_TINT}, transparent)`,
    // ponytail: the hover label (`.cm-ySelectionInfo`) keeps the library's
    // hardcoded white ink on this faction's hue. It is measured against the
    // REMOTE's colour, so no single ink is right for all nine, and the
    // `-on-accent` tier does not cover them all (#1232 deleted Ephemerists').
    // Upgrade path is minting that tier in index.css (frontend-style's file)
    // and overriding the label's `color` in `BODY_EDITOR_BASE_THEME`.
  };
}

/** A remote's `user` field, defensively — it is whatever the sender sent. */
function readUser(state: Record<string, unknown>): Partial<PresenceUser> {
  const raw = state[PRESENCE_FIELD];
  return typeof raw === "object" && raw !== null
    ? (raw as Partial<PresenceUser>)
    : {};
}
