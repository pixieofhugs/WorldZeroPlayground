/**
 * Shared faction configuration — single source of truth for faction display data (JS side).
 *
 * CSS variables in index.css are the parallel source of truth for the cascade.
 * These two files MUST stay in sync. If you change a faction color here,
 * update the matching --faction-* variable in index.css (and vice versa).
 *
 * CSS variables handle dark mode automatically via [data-theme="dark"] overrides.
 * Use factionCssVar() when you need the CSS variable reference (preferred for styles).
 * Use factionColor() when you need the raw hex value in JS (canvas, SVG generation, etc.).
 *
 * The faction registry is a color-only runtime table, seeded from index.css
 * --faction-* values. Faction NAMES and DESCRIPTIONS are no longer backend-
 * emitted: the frozen English words live in the factions.json catalog, keyed by
 * slug (ADR-0031, same split as taunts/ranks), and are resolved via
 * factionName() / factionDescription().
 */
import type { CSSProperties } from "react";
import i18n from "../i18n";

// Faction slugs are runtime-dynamic, so the catalog keys (`factions:names.<slug>`
// / `factions:descriptions.<slug>`) can't be the typed literals t() expects.
// Resolve through a plain-string view of t — the catalog still owns the words;
// only the compile-time key check is relaxed for these dynamic lookups. Same
// pattern as utils/taunts.ts.
const tString = i18n.t as unknown as (key: string) => string;

export interface FactionConfig {
  slug: string;
  /** Primary faction color (light mode value — use factionCssVar for theme-aware styles) */
  color: string;
}

/** Hardcoded color table — matches index.css --faction-* values exactly. The
 *  API never sends color (ADR-0003: the frontend owns faction color), so this is
 *  the single source of the JS-side hex. Do not use directly; call factionColor(). */
const FACTION_FALLBACKS: Record<string, FactionConfig> = {
  ua: { slug: "ua", color: "#c2541f" },
  everymen: { slug: "everymen", color: "#c1272d" },
  wow: { slug: "wow", color: "#ec5f99" },
  snide: { slug: "snide", color: "#6fae00" },
  ephemerists: { slug: "ephemerists", color: "#1d6e72" },
  singularity: { slug: "singularity", color: "#2563eb" },
  // First-class identity (#232): near-black ink, no hue — the order refuses the palette.
  albescent: { slug: "albescent", color: "#1c1c1a" },
};

/** Live registry — color-only, static (nothing hydrates it from the API). */
const factionRegistry: Record<string, FactionConfig> = { ...FACTION_FALLBACKS };

/**
 * Faction-identity aliases: a derived/retired slug renders with its canonical
 * faction's identity (archetype + CSS theme). Single source of truth for the
 * relationship — consumed here by factionCssVar and by pickVariant in
 * utils/factionDispatch.ts.
 *
 * Currently empty: albescent became first-class (#232) and the last remaining
 * alias, aged_out, was retired with its faction (#428). Kept as the seam so a
 * future derived slug has one home; unknown slugs pass through unaliased.
 */
export const FACTION_ALIASES: Record<string, string> = {};

/**
 * Slug-to-CSS-variable-key mapping.
 * Faction slugs use underscores in the DB but CSS variables use hyphens.
 */
const CSS_KEY: Record<string, string> = {
  ua: "ua",
  everymen: "everymen",
  wow: "wow",
  snide: "snide",
  ephemerists: "ephemerists",
  singularity: "singularity",
  albescent: "albescent", // first-class (#232) — its own --faction-albescent-* set
  // `na` (unaffiliated) is a state, not a faction: it reads the neutral/rainbow
  // --faction-default-* set (#418), so factionCssVar('na') is grey, never a
  // borrowed `ua` orange. The spectrum reaches fills through factionFill(), and
  // ornament surfaces reach it by branching on isKnownFaction — which returns
  // false for `na` precisely because it lands on `default` (ADR-0039, #749).
  na: "default",
};

/**
 * Resolve a slug (through aliases) to its CSS-variable key. Unknown/unregistered
 * slugs degrade to `default` (neutral grey / rainbow), never impersonate `ua`.
 */
function resolveCssKey(slug: string | null | undefined): string {
  const resolved = FACTION_ALIASES[slug ?? ""] ?? slug ?? "";
  return CSS_KEY[resolved] ?? "default";
}

/**
 * Get a CSS variable reference for a faction property.
 * Use this in inline styles: `style={{ background: factionCssVar('everymen', 'card-bg') }}`
 *
 * Available suffixes:
 *   (none)        — primary color
 *   'light'       — background tint
 *   'border'      — border color
 *   'card-bg'     — card background
 *   'card-text'   — card text
 *   'card-accent' — card accent (meta text, decorations)
 *   'card-muted'  — card secondary/description text
 */
export function factionCssVar(
  slug: string | null | undefined,
  suffix?: string,
): string {
  const key = resolveCssKey(slug);
  const prop = suffix ? `--faction-${key}-${suffix}` : `--faction-${key}`;
  return `var(${prop})`;
}

/**
 * Surface geometry a faction FILL can occupy. Determines how `na`'s spectrum is
 * rendered — the wrong shape compiles fine but looks bad (a 7-stop linear on a
 * 10px dot reads as mud), so the call site picks it. See ADR-0039.
 */
export type FactionFillShape = "bar" | "dot" | "pill";

/**
 * A faction FILL as a style object to spread onto the filled element.
 *
 * Every real faction returns its solid hue for every shape (with the paired
 * `--faction-{key}-on-fill` AA ink for `"pill"`, #649). Only `na`/unregistered
 * slugs are shape-dependent, because their identity is a gradient, not a hue
 * (ADR-0039):
 *   - `"bar"`  → the linear rainbow (`--faction-default-rainbow`)
 *   - `"dot"`  → the conic rainbow (`--faction-default-ring`; a 7-stop linear is
 *                mud at 10–12px)
 *   - `"pill"` → the rainbow as a *frame* (border-box) around a neutral paper
 *                interior with ink text — no single ink is legible across the
 *                spectrum, so the label never sits on it.
 *
 * Prefer this over `factionCssVar(slug)` for any `background:` that renders a
 * dynamic slug (one that can be `na` at runtime). Scalar contexts (`color:`,
 * borders) keep using `factionCssVar` and stay neutral grey for `na`.
 */
export function factionFill(
  slug: string | null | undefined,
  shape: FactionFillShape,
): CSSProperties {
  const key = resolveCssKey(slug);
  const isDefault = key === "default";

  if (shape === "pill") {
    if (isDefault) {
      // Paper interior on padding-box, spectrum on border-box, ink on paper.
      return {
        background:
          "linear-gradient(var(--faction-default-card-bg), var(--faction-default-card-bg)) padding-box, var(--faction-default-rainbow) border-box",
        border: "2px solid transparent",
        color: "var(--faction-default-card-text)",
        boxSizing: "border-box",
      };
    }
    return {
      background: `var(--faction-${key})`,
      color: `var(--faction-${key}-on-fill)`,
    };
  }

  if (isDefault) {
    return {
      background:
        shape === "dot"
          ? "var(--faction-default-ring)"
          : "var(--faction-default-rainbow)",
    };
  }
  return { background: `var(--faction-${key})` };
}

/**
 * Is this slug a real faction with its own theme?
 *
 * Needed because factionCssVar() resolves anything it doesn't know — including
 * `na` and null — to the `default` key, whose scalars are neutral grey. Surfaces
 * that owe the unaffiliated player the spectrum (ADR-0039) must branch *before*
 * asking for a faction variable, then reach for the rainbow themselves
 * (`--faction-default-rainbow` / `--faction-default-ring`, or factionFill()).
 *
 * `na` IS a key in CSS_KEY (it maps to `default`, #418) but is deliberately not
 * "known" here: membership means "has a resolvable theme", and `default` is the
 * absence of a faction identity rather than one of them. Testing the mapped
 * value, not key presence, is what keeps those two meanings apart — presence
 * alone reported `na` as a real faction and turned every unaffiliated ornament
 * grey (#749). Aliases resolve first, so a derived slug counts as known.
 */
export function isKnownFaction(slug: string | null | undefined): boolean {
  const resolved = FACTION_ALIASES[slug ?? ""] ?? slug ?? "";
  return resolved in CSS_KEY && CSS_KEY[resolved] !== "default";
}

/** Get faction color by slug, with fallback (raw hex — light mode only) */
export function factionColor(slug: string | null | undefined): string {
  return factionRegistry[slug ?? ""]?.color ?? "#6b6a7a";
}

/**
 * Get a faction's display name by slug from the factions.json catalog
 * (`names.<slug>`). A null / unrecognized slug falls back to the "Unaffiliated"
 * copy under `names.na`. The backend emits only slugs now — never name prose.
 */
export function factionName(slug: string | null | undefined): string {
  const key = slug ?? "";
  if (i18n.exists(`factions:names.${key}`)) {
    return tString(`factions:names.${key}`);
  }
  return i18n.t("factions:names.na");
}

/**
 * Get a faction's description by slug from the factions.json catalog
 * (`descriptions.<slug>`). An unrecognized slug falls back to the shared
 * "No description yet." copy (`detail.descriptionEmpty`).
 */
export function factionDescription(slug: string | null | undefined): string {
  const key = slug ?? "";
  if (i18n.exists(`factions:descriptions.${key}`)) {
    return tString(`factions:descriptions.${key}`);
  }
  return i18n.t("factions:detail.descriptionEmpty");
}

/** Get all factions from the live registry (populated from API after useGameConfig loads) */
export function getAllFactions(): FactionConfig[] {
  return Object.values(factionRegistry);
}

/**
 * Canonical rainbow display order for faction strips/pennants (issue #352):
 * Everymen → UA → S.N.I.D.E. → Ephemerists → Singularity → Albescent → Warriors of Whimsy.
 */
export const FACTION_RAINBOW_ORDER: readonly string[] = [
  "everymen",
  "ua",
  "snide",
  "ephemerists",
  "singularity",
  "albescent",
  "wow",
];

/**
 * Sort factions into canonical rainbow order without mutating the input.
 * Unknown slugs sort last, preserving their relative (arrival) order.
 */
export function sortFactionsByRainbowOrder<T extends { slug: string }>(
  factions: T[],
): T[] {
  const rankOf = (slug: string): number => {
    const index = FACTION_RAINBOW_ORDER.indexOf(slug);
    return index === -1 ? FACTION_RAINBOW_ORDER.length : index;
  };
  return [...factions].sort(
    (first, second) => rankOf(first.slug) - rankOf(second.slug),
  );
}
