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

/**
 * The unaffiliated sentinel (ADR-0030 / ADR-0039). Mirrors the backend's
 * `UNAFFILIATED_FACTION_SLUG` (`services/faction_service.py`): a task carrying
 * this slug is generic / cross-faction, owned by no faction. Unaffiliated is a
 * state rather than a faction, so it is deliberately absent from the faction
 * registry — surfaces that offer it (the propose-task picker #704, the filter
 * pennant row #921) do so as an explicit extra option, never via `GET /factions`.
 *
 * Lives here, with the other slug/CSS-key knowledge, so both a `ui/` component
 * and a page module can import it without a page→ui dependency (#921).
 */
export const UNAFFILIATED_FACTION_SLUG = "na";

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
  coven: { slug: "coven", color: "#ec5f99" },
  snide: { slug: "snide", color: "#6fae00" },
  // `wow` returns (#812) with the yellow the owner settled on — NOT the pink it
  // lost to `coven` in #784. Must equal --faction-wow in :root (§4 item 7 of
  // SPEC-faction-ui-profile.md) so JS and CSS agree before the API hydrates.
  // This is the RAINBOW SPINE hue only. WOW's skin is the cream/gold/plum
  // chronicle and never appears here; #838 / ADR-0050 keep the two apart.
  wow: { slug: "wow", color: "#e0a800" },
  ephemerists: { slug: "ephemerists", color: "#1d6e72" },
  singularity: { slug: "singularity", color: "#2563eb" },
  // `albescent` is deliberately absent (#783). It was first-class here (#232)
  // with a near-black #1c1c1a; it now has no colour at all, so factionColor()
  // hands it the same neutral grey as `na`. See that function's docblock.
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
  coven: "coven",
  snide: "snide",
  // Warriors of Whimsy is themed again (#812) — this is the flip the #784
  // comment anticipated. This ONE line is what re-themes WOW, because
  // isKnownFaction tests the mapped VALUE (`!== "default"`), not key presence
  // (#749). Its colour is the rainbow's yellow; its SKIN is the cream/gold/plum
  // chronicle, which is a different thing and does not follow the hue (#838,
  // ADR-0050). WOW still registers only a few manifest surfaces, so the rest
  // fall back to Default* until #840.
  wow: "wow",
  ephemerists: "ephemerists",
  singularity: "singularity",
  // Albescent is registered but NOT themed (#783). It is a secret society
  // hiding in plain sight, so it points at `default` exactly like `na` below:
  // same neutral scalars, same rainbow through factionFill, and — because the
  // predicate reads the mapped VALUE — isKnownFaction('albescent') === false.
  // That is the intended outcome, not a gap. It was first-class (#232) with a
  // 35-declaration --faction-albescent-* block; the block is gone.
  albescent: "default",
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
 *
 * `"frame"` is the border-only case (#794): a rainbow *ring* for a surface that
 * needs a scalar accent (a selection ring, a card edge) rather than a fill, so
 * na stops falling back to grey there too.
 */
export type FactionFillShape = "bar" | "dot" | "pill" | "frame";

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
 *   - `"frame"` → the rainbow as a border ring only (the pill's border-box
 *                treatment MINUS the forced ink), for a scalar accent (a
 *                selection ring, a card edge) that would otherwise degrade to
 *                grey. The interior is filled with the neutral card paper rather
 *                than left see-through ON PURPOSE: a rounded gradient border with
 *                a genuinely transparent centre is not expressible as a single
 *                spreadable `background` — a transparent padding-box reveals the
 *                border-box gradient straight through the middle. The pill fills
 *                opaque paper for exactly this reason; `frame` keeps that fill but
 *                drops the ink so the caller owns its own text colour (#794).
 *
 * The scalar (`border/ring`) contexts that used to reach for `factionCssVar` and
 * land on grey now ask for `"frame"` instead. A real faction's `"frame"` is a
 * plain solid `var(--faction-{key})` border, so `factionCssVar` + `"frame"` agree
 * for known factions and only `na`/unregistered slugs change.
 *
 * Prefer this over `factionCssVar(slug)` for any `background:` that renders a
 * dynamic slug (one that can be `na` at runtime). Genuine single-ink TEXT
 * (`color:`) keeps using `factionCssVar` and stays neutral grey for `na` — no
 * single stop is legible across seven (#649), so that is correct, not a fallback.
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

  if (shape === "frame") {
    if (isDefault) {
      // The pill's rainbow border-box over an opaque neutral interior, minus the
      // forced ink (see the docblock on why the interior can't be see-through).
      return {
        background:
          "linear-gradient(var(--faction-default-card-bg), var(--faction-default-card-bg)) padding-box, var(--faction-default-rainbow) border-box",
        border: "2px solid transparent",
        boxSizing: "border-box",
      };
    }
    // A real faction degrades to a plain solid border, exactly as the other
    // shapes degrade to a solid background — the caller keeps its own interior.
    return { border: `2px solid var(--faction-${key})` };
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
 *
 * `albescent` now sits on that same unthemed side (#783), and it is there for a
 * different reason than `na`: it IS a faction, it just refuses to look like one.
 * This is why the value test matters twice over — Albescent is a registered slug
 * with a manifest and a membership roster, and only the mapped `default` keeps
 * it out of the spectrum. Anything that starts testing key presence again will
 * both grey out unaffiliated players AND expose a secret society.
 */
export function isKnownFaction(slug: string | null | undefined): boolean {
  const resolved = FACTION_ALIASES[slug ?? ""] ?? slug ?? "";
  return resolved in CSS_KEY && CSS_KEY[resolved] !== "default";
}

/**
 * Get faction color by slug, with fallback (raw hex — light mode only).
 *
 * Unlike the CSS path this has NO rainbow branch: every slug without a registry
 * entry — `na`, null, an unregistered slug, and `albescent` (#783) — returns the
 * same neutral grey. For Albescent that is the point, not a gap: grey is
 * precisely what an unaffiliated player already gets, so the two are
 * indistinguishable at every call site. `factionAlbescentHidesInPlainSight`
 * asserts that equality directly.
 *
 * The four call sites are all feed cards (`FeedRowContent`,
 * `FeedCardInvitationLetter`, `FeedCardCollabInvite`, `FeedCardDuelChallenge`).
 * None of them branches on `isKnownFaction`, so the whole feed renders `na` as
 * flat grey rather than the spectrum. That is pre-existing ADR-0039 debt owed to
 * *unaffiliated* players, not something Albescent introduces — and it must be
 * paid for both slugs at once, or the two stop matching and Albescent becomes
 * conspicuous again.
 *
 * Prefer {@link factionFill} for any `background:` that renders a dynamic slug.
 * This function survives for raw-hex contexts (canvas, SVG, `${hex}88` alpha
 * suffixes) where a `var()` reference will not do.
 */
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
 * Everymen → UA → Warriors of Whimsy → S.N.I.D.E. → Ephemerists → Singularity
 * → Cozy Coven. Red, orange, yellow, green, teal, blue, pink — the order is the
 * spectrum, so a slug's position is decided by its hue and nothing else.
 *
 * Albescent is deliberately absent (#783). It is a secret society hiding in
 * plain sight: /factions omits it server-side until an account is revealed to it
 * (ADR-0027, #390), so any bar built from this array would have leaked its
 * existence — in its own near-black, no less — to every unrevealed player.
 * `DefaultFactionsDirectory` worked around that by driving its legend off the
 * visible rows; `Leaderboard` and `DefaultPlayers` did not, and shipped the
 * leak. Removing the slug closes all three at the source.
 *
 * Consumers must not assume a length. `Meadow`'s bloom paints one petal per
 * entry, and the stripe bars distribute stops evenly across whatever is here.
 */
export const FACTION_RAINBOW_ORDER: readonly string[] = [
  "everymen",
  "ua",
  // Yellow, between UA's orange and S.N.I.D.E.'s green (#812). The array is a
  // literal spectrum, so once WOW is yellow this is the only index it can hold.
  "wow",
  "snide",
  "ephemerists",
  "singularity",
  // Cozy Coven takes the pink slot, because it took the pink (#784).
  "coven",
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
