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
 *              nameable. That claim is not left to prose — see
 *              {@link GroundOverride}, which makes a fill-only override
 *              unrepresentable.
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
 * What ONE ground override may say, and the one thing it may not.
 *
 * `fill` and `onFill` move TOGETHER or not at all. The union is the invariant
 * {@link FACTION_ROLES} already claims for `onFill` — that it is in the core
 * *because* `fill` can be overridden per ground — spelled somewhere a compiler
 * can hold it, so the next override cannot repeat silently what the first one
 * did (#2659 review): S.N.I.D.E. chrome moved `fill` to `-wall-credit` and left
 * `onFill` on the sheet's `--faction-snide-on-fill`, a pair reading 2.07:1 in
 * light. Nothing rendered it — which is the point. A vocabulary nine lanes are
 * written against must not hand the first lane to paint on a faction fill a
 * broken pair.
 *
 * The reverse is allowed: a ground may re-measure `onFill` against a fill it
 * leaves alone. Only the ink going missing is forbidden.
 *
 * This is the STRUCTURE half, and it is only half. #2661 landed the other one:
 * `factionContrast.test.ts` now loops over this resolver rather than a
 * hand-curated pair list, so a ground override's `onFill`/`fill` pair is
 * MEASURED and not merely present.
 *
 * MOVING `paper` RE-OPENS EVERY INK ON IT — THE RULE THIS TYPE CANNOT HOLD.
 * The loop found the sibling on this very entry: the chrome ground moved
 * `paper` to the wall and left `accent` on `-card-accent`, the acid measured
 * for the near-black slab, reading 1.03:1 on the light wall (#2669, fixed
 * below). So an override that names `paper` is re-measuring `ink`, `quiet`,
 * `line` and `accent` whether it repoints them or not — inheriting one is a
 * claim about a ratio, not a default. The type can force a fill's ink to travel
 * with it because they are ONE PAIR and that is expressible; it cannot express
 * "legible on", which is a number. Do not try to build it here — that is the
 * contrast loop's job, and it is already doing it.
 */
export type GroundOverride = Partial<Omit<FactionRoleMap, "fill" | "onFill">> &
  ({ fill: string | null; onFill: string } | { fill?: never; onFill?: string });

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
 * AND `onFill` MOVES WITH IT, WHICH IS NOT SYMMETRY EITHER — IT IS THE PAIR
 * (#2659 review). The sheet's `--faction-snide-on-fill` is #14110b in BOTH
 * cascades, because the hue it is measured against (#6fae00 / #b6ff2e) is light
 * in both. `-wall-credit` is the opposite: #14532d by day, #4ade80 by night. So
 * the near-black ink that reads 6.93:1 on the hue reads 2.07:1 on this fill —
 * under AA, and under 1.4.11's 3:1 for a bare mark.
 *
 * The ink that answers is the wall itself: `--faction-snide-wall`, which flips
 * exactly opposite to `-wall-credit` and is already this ground's `paper`. On
 * this ground the fill is a rung of the wall's own ramp, so its paired ink is
 * the stock knocked back out. NO TOKEN IS MINTED AND NONE IS REPOINTED, and
 * the pairing is not a new measurement: `factionContrast.test.ts` already gates
 * `-wall-credit` as a BARE ink on `-wall` and `-wall-deep` in both cascades
 * (`SNIDE_WALL_INKS`, "the marker scrawl, bare" — the faction page's own
 * scrawl, #2343). A ratio is symmetric, so that row IS this pair: 7.71:1 light,
 * 11.36:1 dark. Adding a second row would be a second name for one measurement,
 * which that file spends a paragraph warning against.
 *
 * AND `accent` MOVES FOR THE THIRD TIME FOR THE SAME REASON: THE PAPER MOVED
 * (#2669). It was the one ink this entry left on the card family, and the card
 * family's accent is `--faction-snide-card-accent` — the acid, #b6ff2e, pinned
 * invariant in both cascades because the slab it was measured on is near-black
 * in both. On the wall that flips it reads 1.03:1 by day: invisible, and the
 * first thing #2661's loop caught that a human review had not. #2173 had
 * already ruled the acid never touches paper, which points the same way.
 *
 * It lands on `-wall-credit`, the rung of this hue the fill already moved to on
 * this ground — no token minted, none repointed, and not a new measurement:
 * `SNIDE_WALL_INKS` already gates it as a BARE ink on `-wall` (#2343, "the
 * marker scrawl, bare"). 7.71:1 by day, 11.36:1 by night, against `accent`'s
 * 4.5 text floor. It reads as an accent and not merely as a pass: the role is
 * "decorative / meta ink — not `ink` at a lower alpha", and this is a hue of
 * its own next to the neutral `-note-ink` / `-note-muted` tiers, the same
 * marker the faction page scrawls its credits in.
 *
 * `radius` and `face` stay on the card family on purpose.
 */
const GROUND_OVERRIDES: Record<FactionGround, Record<string, GroundOverride>> = {
  sheet: {},
  chrome: {
    snide: {
      paper: "wall",
      ink: "note-ink",
      quiet: "note-muted",
      line: "note-wall-edge",
      accent: "wall-credit",
      fill: "wall-credit",
      onFill: "wall",
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
