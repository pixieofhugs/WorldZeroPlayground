/**
 * Presence in a praxis room (#1744, ADR-0073) — the pure half.
 *
 * **Decoration, never authorization.** Awareness is self-reported and relayed;
 * membership is checked server-side (#1740). Never derive a permission, gate or
 * acted-on count from it.
 *
 * **The wire carries a slug, never a colour.** `y-codemirror.next` interpolates
 * `user.color` into a style attribute, so a remote could inject CSS. Receivers
 * derive paint via `factionCssVar()` ({@link paintedAwareness}), closing the
 * colour set at nine. Names are clipped for layout (the lib uses `textContent`).
 */
import { factionCssVar } from "../../utils/factions";

/** `y-remote-selections.js` destructures `state.user`; a mismatch is a silent no-caret. */
const PRESENCE_FIELD = "user";

/** Layout ceiling for the one-line `nowrap` hover label, not a security one. */
const MAX_PRESENCE_NAME = 64;

/** Selection band tint; `color-mix` because a `var()` can't take an alpha suffix. */
const SELECTION_TINT = "22%";

/**
 * Hue kept against the `currentColor` anchor. Measured: 70% puts the worst light
 * pairing at 3.02:1; 60% gives 3.31:1 with hues still ~15 deltaE76 apart.
 * `__tests__/roomPresenceContrast.test.ts` holds both the floor and the separation.
 */
const IDENTITY_WEIGHT = "60%";

interface PresenceUser {
  characterId: number;
  name: string;
  factionSlug: string;
}

/** Derived by the receiver, never relayed. */
interface PaintedPresenceUser {
  name: string;
  color: string;
  colorLight: string;
}

type PresenceStates = Map<number, Record<string, unknown>>;

/** Structural slice of `Awareness`, so tests need no y-websocket. */
export interface AwarenessLike {
  getStates(): PresenceStates;
  setLocalStateField(field: string, value: unknown): void;
}

/** A `CharacterOut` satisfies it. */
interface PresenceCharacter {
  id: number;
  display_name: string;
  faction_slug: string;
}

/** Announce who is typing. LWW field: re-publishing is one cheap broadcast. */
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
 * Connected character ids, deduped (two tabs = one player) and sorted (for
 * {@link samePresence}). Includes the viewer.
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

/** Value equality; awareness `change` fires on every cursor move. */
export function samePresence(
  a: readonly number[],
  b: readonly number[],
): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

/**
 * The awareness to hand `yCollab`: a `Proxy` filtering only `getStates()` so
 * paint is derived from the slug. Everything else reaches the real object.
 *
 * Give this to `yCollab` only. The `WebsocketProvider` keeps the real
 * `Awareness` (its encoder reads `awareness.states`); broadcasting the painted
 * view would put our `var()` strings on the wire.
 */
export function paintedAwareness<A extends AwarenessLike>(awareness: A): A {
  return new Proxy(awareness, {
    get(target, property) {
      if (property === "getStates") {
        return () => paintStates(target.getStates());
      }
      const value = Reflect.get(target, property, target) as unknown;
      // Bound so inherited methods resolve `this` on the real awareness.
      return typeof value === "function"
        ? (value as (...args: unknown[]) => unknown).bind(target)
        : value;
    },
  });
}

function paintStates(states: PresenceStates): PresenceStates {
  const painted: PresenceStates = new Map();
  states.forEach((state, clientId) => {
    // `cursor` survives verbatim; `user` is replaced wholesale so a remote
    // `color`/`colorLight` can't ride along.
    painted.set(clientId, { ...state, [PRESENCE_FIELD]: paintUser(state) });
  });
  return painted;
}

function paintUser(state: Record<string, unknown>): PaintedPresenceUser {
  const user = readUser(state);
  const slug = typeof user.factionSlug === "string" ? user.factionSlug : null;
  // Bare (no `card-*` suffix) token, anchored toward `currentColor` (#2267).
  // The caret sits on the VIEWER's ground with the REMOTE's hue, an 8x8
  // cross-product no token measures (21/64 light pairings were under 3:1).
  // `currentColor` in `.cm-content` is the skin's body ink, measured against its
  // ground — same move as `bodyEditorTheme.ts`. `na`/`albescent` -> default is
  // ADR-0039 §2.
  const color = `color-mix(in srgb, ${factionCssVar(slug)} ${IDENTITY_WEIGHT}, currentColor)`;
  return {
    name: typeof user.name === "string" ? user.name.slice(0, MAX_PRESENCE_NAME) : "",
    color,
    // The lib's fallback `color + '33'` is invalid on a `var()`.
    colorLight: `color-mix(in srgb, ${color} ${SELECTION_TINT}, transparent)`,
    // The hover label doesn't use this mix (#2297): its ground is the solid hue
    // with `-on-fill` ink via `REMOTE_LABEL_INK` in `bodyEditorTheme.ts`, which
    // reads the slug back out of the `var()` above.
  };
}

/** Defensive: it is whatever the sender sent. */
function readUser(state: Record<string, unknown>): Partial<PresenceUser> {
  const raw = state[PRESENCE_FIELD];
  return typeof raw === "object" && raw !== null
    ? (raw as Partial<PresenceUser>)
    : {};
}
