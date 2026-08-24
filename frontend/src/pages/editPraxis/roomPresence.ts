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

/**
 * How much of the remote's hue survives the anchor in {@link paintUser}.
 *
 * 60% is the measured pick, not a taste call. Every extra point of hue costs
 * contrast on a light ground and buys identity: at 70% the worst pairing lands
 * at 3.02:1, which clears 1.4.11 by nothing at all, and at 60% it lands at
 * 3.31:1 with the eight hues still a minimum deltaE76 of ~15 apart (~21
 * unanchored). `__tests__/roomPresenceContrast.test.ts` holds both ends — the
 * floor AND the separation — so neither can be traded away for the other.
 */
const IDENTITY_WEIGHT = "60%";

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
  // No suffix, and then ANCHORED (#2267).
  //
  // No suffix because a caret is a mark on the VIEWER's editor ground, not on
  // the remote's card sheet, so the `card-*` family (measured against that
  // sheet) is the wrong tier. `na` and `albescent` landing on
  // `--faction-default` is ADR-0039 §2's decision, not a fallback.
  //
  // But the bare hue was the wrong VALUE, because no faction token can be the
  // right one here: the hue is the REMOTE's identity and the ground is the
  // VIEWER's field, so the pairing is a cross-product of 8 grounds x 8 hues
  // that nothing in index.css measures. 21 of the 64 light pairings sat under
  // the 3:1 a graphical mark owes — 1.86:1 at worst, a UA viewer watching an
  // Ephemerists co-author — while all 64 dark ones passed, which is how it
  // survived review.
  //
  // `currentColor` is the one ink that IS measured against whatever ground the
  // caret lands on: inside `.cm-content` it resolves to the skin's own body
  // ink, the value that skin's `fieldBox` pairs with that background. So the
  // hue is pulled toward it far enough to clear the floor on every ground and
  // no further, which keeps the eight remotes visibly different people. That is
  // the move `bodyEditorTheme.ts` already makes twice — the local caret's
  // `borderLeftColor: currentColor` and the selection's `currentColor` mix —
  // rather than a new idea; this is the last mark in the editor that ignored it.
  const color = `color-mix(in srgb, ${factionCssVar(slug)} ${IDENTITY_WEIGHT}, currentColor)`;
  return {
    name: typeof user.name === "string" ? user.name.slice(0, MAX_PRESENCE_NAME) : "",
    color,
    // The library's own fallback is `color + '33'`, which on a `var()` yields
    // the invalid `var(--faction-coven)33` and paints no selection at all.
    colorLight: `color-mix(in srgb, ${color} ${SELECTION_TINT}, transparent)`,
    // The hover-only label (`.cm-ySelectionInfo`) no longer stands on this
    // value (#2297). It used to: the library gives it a hardcoded white ink on
    // `background-color: inherit`, so the anchor above moved its ground too and
    // in dark — where `currentColor` is a LIGHT body ink — that was white on
    // white, 1.20:1 on all 64 pairings. No ink could have fixed it; the best
    // possible one against the worst viewer is 3.91:1 in light. So the LABEL's
    // ground moved to the remote's solid hue with that slug's `-on-fill` ink,
    // in `bodyEditorTheme.ts`'s `REMOTE_LABEL_INK`, which reads the slug back
    // out of the `var()` below. The caret, its dot and the selection band keep
    // this anchored mix, which is what #2267 measured and still holds.
  };
}

/** A remote's `user` field, defensively — it is whatever the sender sent. */
function readUser(state: Record<string, unknown>): Partial<PresenceUser> {
  const raw = state[PRESENCE_FIELD];
  return typeof raw === "object" && raw !== null
    ? (raw as Partial<PresenceUser>)
    : {};
}
