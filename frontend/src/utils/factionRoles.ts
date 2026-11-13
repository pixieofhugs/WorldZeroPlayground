/**
 * A faction supplies a MAP, not values (#2659): nine roles, each pointing at a
 * token `index.css` already declares. No colours here (a hex has no dark half).
 * The role count is the design; `__tests__/factionRoles.test.ts` caps it.
 * This is PAINT only: a role cannot move or add a node (#2650's paint/tree axis).
 * Deliberately absent: `hair` (no universal token; compose locally, see
 * `--rail-well`) and the state inks `notice`/`alarm`/`credit` (component state,
 * reachable via `factionCssVar`).
 */
import type { CSSProperties } from "react";

import { factionCssVar } from "./factions";
import { hasOwnKey } from "./hasOwnKey";

/**
 * - `paper`: the only surface role; the rest are for `color:` or borders.
 * - `quiet`: one role because the fallback is per-SITE (`--color-text-secondary`
 *   at a heading, `-tertiary` at a timestamp).
 * - `line`: load-bearing off-card, where nothing else divides a panel (#2065).
 * - `accent`: decorative/meta ink, often its own hue, not dimmed `ink`.
 * - `fill`: the hue as a fill, never an ink (`--faction-snide` is 1.87:1 on its wall).
 * - `onFill`: AA ink on that fill (#649); must travel with `fill` ({@link GroundOverride}).
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
 * Role → suffix under `--faction-{key}-`; `null` = the bare hue. Values only:
 * a `color-mix` or gradient is composed by the surface.
 */
type FactionRoleMap = Record<FactionRole, string | null>;

/** `sheet` = content card (default); `chrome` = app furniture (the rail). Differs only for S.N.I.D.E. */
export const FACTION_GROUNDS = ["sheet", "chrome"] as const;

export type FactionGround = (typeof FACTION_GROUNDS)[number];

/** Every suffix here is declared by all `--faction-*` families, so a new faction supplies nothing. */
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
 * `fill` and `onFill` move together or not at all (#2659 review: moving only
 * `fill` left `--faction-snide-on-fill` at 2.07:1). Moving `onFill` alone is fine.
 * The type holds the pair; `factionContrast.test.ts` measures it (#2661).
 * Moving `paper` re-opens every ink on it (#2669) — the contrast loop's job, not the type's.
 */
export type GroundOverride = Partial<Omit<FactionRoleMap, "fill" | "onFill">> &
  ({ fill: string | null; onFill: string } | { fill?: never; onFill?: string });

/**
 * One entry (#2631, ADR-0085): `--faction-snide-card-bg` is a slab pinned
 * near-black in both themes, so S.N.I.D.E. chrome reads the flipping wall
 * family instead. `fill` moves to `-wall-credit` (the bare hue is 1.87:1 on the
 * light wall); `onFill` pairs with it as `--faction-snide-wall`, and `accent`
 * leaves `--faction-snide-card-accent` (1.03:1 on the wall, #2669) for
 * `-wall-credit` too. Both pairs are already gated by `SNIDE_WALL_INKS` in
 * `factionContrast.test.ts` (#2343). `radius`/`face` stay on the card family.
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

/** Own-property-only: presence (#1744) relays arbitrary client strings (#1821). */
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
 * `('rail', 'onFill')` → `--rail-on-fill`. Exported so
 * `factionTokensDeclared.test.ts` can reconstruct the interpolated names exactly.
 */
export function factionRoleProperty(prefix: string, role: FactionRole): string {
  return `--${prefix}-${role.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}

/**
 * One role as `var()`, for a surface composing locally (a `color-mix` veil).
 * `na`/Albescent/unknown get `--faction-default-*`, as `factionCssVar` does.
 */
export function factionRoleVar(
  slug: string | null | undefined,
  role: FactionRole,
  ground: FactionGround = "sheet",
): string {
  return factionCssVar(slug, rolesFor(slug, ground)[role] ?? undefined);
}

/**
 * All nine roles under the surface's own `prefix` (`--rail-paper` …). Never a
 * shared `--kit-*` namespace: a page wrapper would repaint other factions' cards.
 * Answers for every slug (#2690, ADR-0089), neutral `--faction-default-*` for
 * na/Albescent/unknown (ADR-0048/0083). `layout/Sidebar.tsx` withholds it from
 * unaffiliated viewers to keep the app's three ink tiers.
 */
export function factionRoleVars(
  slug: string | null | undefined,
  prefix: string,
  ground: FactionGround = "sheet",
): CSSProperties {
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
