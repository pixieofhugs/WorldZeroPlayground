/**
 * A FACTION SUPPLIES A MAP, NOT VALUES (#2659 — decision 06 of "Nine Kits, One
 * Vocabulary", the 2026-08-25 rewrite recorded on #2649).
 *
 * Nine roles, each pointing at a token `index.css` already declares. Not one
 * new declaration, not one colour — this module is the same kind of thing
 * `factions.ts` is, and for the same reason: a second table of values is the
 * drift #1269 deleted, and a hex literal has no dark half by construction.
 *
 * WHY A MAP AND NOT A SLOT PER SITE. #2650 built the other shape — a ~50-slot
 * custom-property interface on the smallest faction family — and the owner
 * declined to ship it. Fifty slots per faction is a component re-expressed as
 * CSS: `-name-style`, `-label-case`, `-edited-track`. The count IS the design,
 * so the ceiling is enforced in `__tests__/factionRoles.test.ts` rather than
 * asked for in prose.
 *
 * THE MECHANISM ALREADY EXISTED, WRITTEN ONCE FOR ONE SURFACE. `railFaceVars`
 * (#2361) mapped paper/ink/quiet/line/radius/face onto `-card-*`, and
 * `SNIDE_WALL_FACE` (#2631) was the single per-ground override in the repo.
 * This is that shape generalised; the rail is now its first caller rather than
 * its only implementation. Nothing was invented beside it.
 *
 * THIS IS PAINT. A role cannot move a node, add a node, or cross a component
 * prop — that is the paint/tree axis #2650 established, and the axis is why
 * five of the six differences it measured were NOT resolvable by tokens. Do not
 * try to make the map do tree work.
 *
 * WHAT IS DELIBERATELY NOT HERE:
 *
 *  - `hair`, a second fainter rule, which the plan's sketch listed. No such
 *    token is universal: only `ua` declares a bare `-hair`, and the other four
 *    that have one scope it to a single ground (`-ward-hair`, `-sheet-hair`,
 *    `-term-hair`, `-composer-hair`). A role whose default has to be `line`
 *    over again is not a role, it is a duplicate. A surface that genuinely
 *    needs a second rule composes one locally — see `--rail-well`.
 *  - `notice` / `alarm` / `credit`, the three state inks. All eight families
 *    declare them and they are per-SHEET for real reasons (#694, #1449), but
 *    they belong to a component's STATE rather than to a ground, and adding
 *    them takes the vocabulary to twelve for the sake of surfaces that already
 *    reach them through `factionCssVar`. If a lane needs them, that is a
 *    decision to take with evidence, not scaffolding to leave here.
 */
import type { CSSProperties } from "react";

import { factionCssVar, isKnownFaction } from "./factions";
import { hasOwnKey } from "./hasOwnKey";

/**
 * The canonical role vocabulary. Nine, in the order a surface is built: the
 * ground, the three ink tiers, the faction's own hue and its paired ink, then
 * the two things that are neither colour nor ink.
 *
 *  - `paper`   the sheet the surface stands ON. Exactly one role is a surface;
 *              every other colour role here is meant for `color:` or a border.
 *  - `ink`     primary type.
 *  - `quiet`   secondary type. One role, not two, because the fallback is
 *              per-SITE: `--x-quiet` unset reads `--color-text-secondary` at a
 *              heading and `--color-text-tertiary` at a timestamp, so three
 *              neutral tiers survive a faction family that has two.
 *  - `line`    the hairline that separates. The load-bearing one on any ground
 *              that is not a card, because a panel on a page of the same stock
 *              has nothing else dividing it (#2065).
 *  - `accent`  decorative / meta ink. Not `ink` at a lower alpha: several
 *              families give it a hue of its own.
 *  - `fill`    the faction's hue as a FILL. A hue is a fill and never an ink —
 *              `--faction-snide` is 1.87:1 on its own light wall.
 *  - `onFill`  the AA-measured ink that goes ON that fill (#649). It is in the
 *              core precisely BECAUSE `fill` can be overridden per ground: a
 *              fill whose paired ink cannot move with it is a contrast bug with
 *              no name to fix it at, and #2661's contrast loop needs the pair
 *              nameable.
 *  - `radius`  and
 *  - `face`    the typeface. Neither has a cascade to be wrong in, which is why
 *              S.N.I.D.E.'s ground override deliberately leaves both alone.
 */
export const FACTION_ROLES = [
  "paper",
  "ink",
  "quiet",
  "line",
  "accent",
  "fill",
  "onFill",
  "radius",
  "face",
] as const;

export type FactionRole = (typeof FACTION_ROLES)[number];

/**
 * What a faction actually supplies: role → the suffix under
 * `--faction-{key}-`. `null` means the bare `--faction-{key}` hue, which has no
 * suffix.
 *
 * A faction writes a `Partial` of this and only where it differs. Values only,
 * no expressions: a `color-mix` or a gradient is a surface's business, because
 * it is composed from a role rather than being one.
 */
export type FactionRoleMap = Record<FactionRole, string | null>;

/**
 * The grounds a surface can ask a faction to answer for.
 *
 * `sheet` is a content card — the default, and the answer for nearly
 * everything. `chrome` is the app's own furniture standing in a faction's
 * colours: the rail, and whatever follows it.
 *
 * The distinction is not decorative. A faction's card sheet is normally the
 * stock its chrome is made of, so seven of seven return identical values here.
 * S.N.I.D.E. is the one where it is not, and it took a measurement to find —
 * see {@link GROUND_OVERRIDES}.
 */
export const FACTION_GROUNDS = ["sheet", "chrome"] as const;

export type FactionGround = (typeof FACTION_GROUNDS)[number];

/**
 * The map every faction inherits, and the reason a tenth faction can supply
 * nothing at all: every suffix named here is declared by all eight `--faction-*`
 * families today, so registering a slug in `CSS_KEY` beside a `-card-*` block is
 * the whole of joining this vocabulary.
 */
const SHEET_ROLES: FactionRoleMap = {
  paper: "card-bg",
  ink: "card-text",
  quiet: "card-muted",
  line: "card-border",
  accent: "card-accent",
  fill: null,
  onFill: "on-fill",
  radius: "card-radius",
  face: "card-font",
};

/**
 * Where a faction says "on THAT ground, read a different family of mine".
 *
 * ONE ENTRY, AND IT IS EVIDENCE-BACKED (#2631, ADR-0085).
 * `--faction-snide-card-bg` is the photocopier slab pasted on a wall (#2066),
 * pinned near-black in BOTH cascades — so chrome dressed in it was a black
 * column beside a page the same faction paints in xerox stock that flips. The
 * wall flips, and every ink named here flips with it. Every token was already
 * declared and already measured: `-note-ink` / `-note-muted` are the tiers three
 * other S.N.I.D.E. surfaces read on this same wall, and `-note-wall-edge` is the
 * hairline its task card and field desk already draw.
 *
 * `fill` moves because a measurement forced it, not for symmetry.
 * `--faction-snide` is #6fae00 by day and reads 1.87:1 against a well on the
 * light wall, under 1.4.11's 3:1 for a drawn mark. `-wall-credit` is the
 * wall-end rung of the same hue (#2177), 6.28:1 by day and 9.22:1 by night.
 *
 * `radius` and `face` stay on the card family on purpose.
 */
const GROUND_OVERRIDES: Record<
  FactionGround,
  Record<string, Partial<FactionRoleMap>>
> = {
  sheet: {},
  chrome: {
    snide: {
      paper: "wall",
      ink: "note-ink",
      quiet: "note-muted",
      line: "note-wall-edge",
      fill: "wall-credit",
    },
  },
};

/**
 * Own-property-only, for the reason `resolveCssKey` is: every slug reaching
 * here came from the server until #1744 made presence awareness — self-reported
 * by each client and relayed — a path for a co-member's arbitrary string, and a
 * plain bracket read hands back the whole of `Object.prototype` (#1821).
 */
function rolesFor(
  slug: string | null | undefined,
  ground: FactionGround,
): FactionRoleMap {
  const overrides = GROUND_OVERRIDES[ground];
  return hasOwnKey(overrides, slug)
    ? { ...SHEET_ROLES, ...overrides[slug] }
    : SHEET_ROLES;
}

/**
 * The custom property a role lands on under a surface's prefix — `('rail',
 * 'onFill')` → `--rail-on-fill`.
 *
 * Exported because {@link factionRoleVars} builds these names by
 * INTERPOLATION, which makes them invisible to `factionTokensDeclared.test.ts`
 * — the guard for "looks tokenized, is not". That guard reconstructs the exact
 * set of names this resolver can emit rather than loosening its regex, and it
 * has to spell them the same way or it trades one blind spot for another.
 */
export function factionRoleProperty(prefix: string, role: FactionRole): string {
  return `--${prefix}-${role.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}

/**
 * The token one role points at, as a `var()` reference.
 *
 * For a surface that needs to COMPOSE from a role rather than hand it straight
 * to a declaration — a `color-mix` veil, a ramp of the faction's hue. That is
 * decision 07's other half: the core map is faction-owned, and a surface with
 * genuine extra needs builds its extras locally out of these.
 *
 * Unlike {@link factionRoleVars} this answers for `na` and Albescent too, with
 * the neutral `--faction-default-*` family — the same answer `factionCssVar`
 * gives, because a single role read has no all-or-nothing seam to protect.
 */
export function factionRoleVar(
  slug: string | null | undefined,
  role: FactionRole,
  ground: FactionGround = "sheet",
): string {
  return factionCssVar(slug, rolesFor(slug, ground)[role] ?? undefined);
}

/**
 * The whole vocabulary as custom properties to spread onto a surface's root,
 * namespaced by that surface's own `prefix` — `factionRoleVars(slug, 'rail')`
 * declares `--rail-paper` … `--rail-face`.
 *
 * THE PREFIX IS THE SURFACE'S, NOT GLOBAL, AND THAT IS DELIBERATE. One shared
 * `--kit-*` namespace would be tidier to read and strictly more dangerous: a
 * page wrapper declaring it would silently repaint every descendant, including
 * a card that belongs to a DIFFERENT faction than the page (the page-dressing
 * question #2539 is still open on). A surface-scoped name cannot leak into a
 * surface that did not ask for it.
 *
 * AN UNAFFILIATED VIEWER IS PIXEL-IDENTICAL BY CONSTRUCTION. For `na`, for
 * `albescent`, for null and for a slug the server invents tomorrow this returns
 * `{}` — not one property is declared, so every `var(--x, <today's token>)` at
 * every read site is the value that already shipped, byte for byte. There is no
 * second render path to keep in step and nothing to measure twice. That is
 * #2361's acceptance criterion and it is inherited here unchanged.
 *
 * Albescent taking the neutral rail is ADR-0048 and is the design, not a gap: a
 * colour family minted for it would put a society that hides in plain sight back
 * into the spectrum.
 */
export function factionRoleVars(
  slug: string | null | undefined,
  prefix: string,
  ground: FactionGround = "sheet",
): CSSProperties {
  if (!isKnownFaction(slug)) return {};
  const roles = rolesFor(slug, ground);
  const vars: Record<string, string> = {};
  for (const role of FACTION_ROLES) {
    vars[factionRoleProperty(prefix, role)] = factionCssVar(
      slug,
      roles[role] ?? undefined,
    );
  }
  return vars as CSSProperties;
}
