/**
 * The JS side of faction identity. Holds NO colour: index.css is the only source
 * of a hue and this hands out `var()` references, so dark mode comes free. Never
 * reintroduce a JS colour table (a hex has no dark half; #1269). Names and
 * descriptions live in factions.json by slug (ADR-0031).
 */
import type { CSSProperties } from "react";
import i18n from "../i18n";
import { hasOwnKey } from "./hasOwnKey";

// Untyped view of t for runtime slug keys (as utils/taunts.ts). Captured at import:
// vi.spyOn(i18n, 't') never sees these calls; use copyRegistry recording instead.
const tString = i18n.t as unknown as (
  key: string,
  options?: Record<string, unknown>,
) => string;

/**
 * Unaffiliated sentinel (ADR-0030/0039), mirrors `services/faction_service.py`.
 * A state, not a faction, so `getAllFactions()` omits it; surfaces offering it
 * add it explicitly (#704, #921).
 */
export const UNAFFILIATED_FACTION_SLUG = "na";

interface FactionConfig {
  slug: string;
}

/** Slug → CSS-variable key. */
const CSS_KEY: Record<string, string> = {
  ua: "ua",
  everymen: "everymen",
  coven: "coven",
  snide: "snide",
  // WOW's hue (#2068) and its chronicle skin (ADR-0050) are separate tokens.
  wow: "wow",
  ephemerists: "ephemerists",
  singularity: "singularity",
  // Albescent is registered but NOT themed (#783): it hides as `na` does, so
  // isKnownFaction('albescent') === false by design.
  albescent: "default",
  // `na` reads the neutral/rainbow --faction-default-* set (#418, ADR-0039).
  na: "default",
};

/**
 * Unknown slugs degrade to `default`. Own-property-only (#1821): presence
 * (ADR-0073) relays arbitrary client strings, and `CSS_KEY["constructor"]` is
 * the `Object` function.
 */
function resolveCssKey(slug: string | null | undefined): string {
  return hasOwnKey(CSS_KEY, slug) ? CSS_KEY[slug] : "default";
}

/**
 * `var(--faction-{key}[-suffix])`. Suffixes: (none) hue; `light` tint wash;
 * `border`; `card-bg` (the only SURFACE); `card-text`/`-accent`/`-muted` inks;
 * `card-notice` (cautionary) / `card-alarm` (destructive, #1449) /
 * `card-credit` state inks, measured per sheet in `factionContrast.test.ts`
 * because sheets differ in polarity (#694); `card-sheet[-blend|-clip]`, read
 * only by {@link factionSheet} (#2497).
 * With no suffix, `na`/`albescent` get neutral `--faction-default`, never the
 * spectrum (ADR-0039 §2: no stop is legible as text); fills use {@link factionFill}.
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
 * Fill geometry, chosen by the call site because na's spectrum must be cut to
 * the shape (ADR-0039). `frame`: border ring (#794). `rule`: vertical bar
 * (#983). `disc`: 28px avatar; factions get a 135° two-stop ramp (#1269).
 */
export type FactionFillShape = "bar" | "dot" | "disc" | "pill" | "frame" | "rule";

/**
 * A faction FILL as a style object. Real factions: solid hue (pill adds the
 * `--faction-{key}-on-fill` ink, #649). na/unknown, by shape: bar/rule linear
 * rainbow; dot/disc conic (smooth, not wedged: #1127); pill a rainbow
 * border-box around paper with ink text; frame the same ring minus the ink.
 * The interior is opaque paper because a transparent padding-box would show the
 * border-box gradient through. Use this, not `factionCssVar`, for any
 * `background:` on a dynamic slug.
 */
export function factionFill(
  slug: string | null | undefined,
  shape: FactionFillShape,
): CSSProperties {
  const key = resolveCssKey(slug);
  const isDefault = key === "default";

  if (shape === "pill") {
    if (isDefault) {
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
      return {
        background:
          "linear-gradient(var(--faction-default-card-bg), var(--faction-default-card-bg)) padding-box, var(--faction-default-rainbow) border-box",
        border: "2px solid transparent",
        boxSizing: "border-box",
      };
    }
    return { border: `2px solid var(--faction-${key})` };
  }

  if (isDefault) {
    if (shape === "dot" || shape === "disc") {
      return { background: "var(--faction-default-rainbow-conic)" };
    }
    if (shape === "rule") {
      return { background: "var(--faction-default-rainbow-vertical)" };
    }
    return { background: "var(--faction-default-rainbow)" };
  }
  if (shape === "disc") {
    // 53% = the `88` hex alpha.
    return {
      background: `linear-gradient(135deg, var(--faction-${key}), color-mix(in srgb, var(--faction-${key}) 53%, transparent))`,
    };
  }
  return { background: `var(--faction-${key})` };
}

/**
 * A card SHEET (#2497): for `na` identical to a `card-bg` background, but a seam
 * Albescent's prism (#2499) overrides via three custom properties. Blend and
 * clip are per-layer lists (CSS cycles short ones). The trailing `border-box`
 * clips the background COLOUR (bottom layer's clip governs) so it shows through
 * the translucent dark hairline. Themed slugs leave the triple undefined, so
 * each falls to its initial value.
 */
export function factionSheet(slug?: string | null): CSSProperties {
  return {
    backgroundColor: factionCssVar(slug, "card-bg"),
    backgroundImage: factionCssVar(slug, "card-sheet"),
    backgroundBlendMode: factionCssVar(slug, "card-sheet-blend"),
    backgroundClip: `${factionCssVar(slug, "card-sheet-clip")}, border-box`,
  };
}

/**
 * The sheet with the na spectrum as its border (#2499): a ramp layer with
 * `background-origin: border-box` under a transparent border the caller sizes.
 * One helper so the ramp is appended to all three lists at once (a short list
 * cycles and mis-blends). Static ramp, not the loop cut.
 */
export function factionSpectrumSheet(slug?: string | null): CSSProperties {
  return {
    backgroundColor: factionCssVar(slug, "card-bg"),
    backgroundImage: `${factionCssVar(slug, "card-sheet")}, var(--faction-default-rainbow)`,
    backgroundBlendMode: `${factionCssVar(slug, "card-sheet-blend")}, normal`,
    backgroundOrigin: "border-box",
    backgroundClip: `${factionCssVar(slug, "card-sheet-clip")}, border-box`,
  };
}

/**
 * Has its own theme? Tests the mapped VALUE, not key presence (#749): presence
 * would grey out `na` ornaments and expose Albescent (#783). Own-property (#1821).
 */
export function isKnownFaction(slug: string | null | undefined): boolean {
  return hasOwnKey(CSS_KEY, slug) && CSS_KEY[slug] !== "default";
}

/** The secret society's slug (ADR-0027, #390). */
export const ALBESCENT_FACTION_SLUG = "albescent";

/** Module-level (#1891, see `factionName`); defaults false so it fails closed. */
let albescentRevealed = false;

/** Set by `AuthContext` on every viewer change. Tests MUST reset it: module state outlives the case. */
export function setAlbescentRevealed(revealed: boolean): void {
  albescentRevealed = revealed;
}

/** Reached the level where the eighth row is drawn at all (#2770); fails closed like the above. */
let albescentGlimpsed = false;

/** Same contract as `setAlbescentRevealed`; tests MUST reset it. */
export function setAlbescentGlimpsed(glimpsed: boolean): void {
  albescentGlimpsed = glimpsed;
}

/**
 * Row must not exist for this viewer (#2770). States: concealed (nothing drawn)
 * → redacted (`isFactionRedacted`, ADR-0082) → real. Reveal implies glimpse,
 * re-checked here as belt and braces. A LIST question, answered where lists are
 * built (`useFactionsDirectory`, `factionStandings`).
 */
export function isFactionConcealed(slug: string | null | undefined): boolean {
  return (
    slug === ALBESCENT_FACTION_SLUG && !albescentGlimpsed && !albescentRevealed
  );
}

/** Choosers DROP the row rather than mask it: two "Unaffiliated" rows would be louder (#1891). */
export function isFactionHiddenFromChoosers(
  slug: string | null | undefined,
): boolean {
  return slug === ALBESCENT_FACTION_SLUG && !albescentRevealed;
}

/** Deliberately not in the catalogue: a localised mark would give each language a tell. */
export const REDACTED = "[REDACTED]";

/** Albescent-scoped keys in any namespace; matches a whole SEGMENT, not a substring (#2409). */
const ALBESCENT_SCOPED_KEY = /(?:^|[.:])albescent(?:[.:]|$)/;

/** Paint (`.redacted`) and disable off this one answer, so both flip together (#2409). */
export function isFactionRedacted(slug: string | null | undefined): boolean {
  return slug === ALBESCENT_FACTION_SLUG && !albescentRevealed;
}

/**
 * Catalogue read through the redaction gate (#2409, ADR-0082). OPT-IN: only the
 * `/factions` Albescent tile and the PLAYERS page race lane call it; everything
 * else says "Unaffiliated" (#1891). A rendering rule over the ordinary
 * catalogue, never a second set of strings. Non-Albescent keys are a plain `t()`.
 */
export function redactableText(
  key: string,
  options?: Record<string, unknown>,
): string {
  if (!albescentRevealed && ALBESCENT_SCOPED_KEY.test(key)) return REDACTED;
  return tString(key, options);
}

/**
 * Display name from `names.<slug>`; unknown falls back to `names.na`.
 * Impure by design (#1891): unrevealed viewers get "Unaffiliated" for
 * Albescent, gated here so every label (~35 call sites, non-React too) is
 * secret by construction. Labels mask; only the two society surfaces redact
 * (ADR-0082 §2). Not a security boundary: the wire still carries the slug.
 */
export function factionName(slug: string | null | undefined): string {
  const key =
    slug === ALBESCENT_FACTION_SLUG && !albescentRevealed
      ? UNAFFILIATED_FACTION_SLUG
      : slug ?? "";
  if (i18n.exists(`factions:names.${key}`)) {
    return tString(`factions:names.${key}`);
  }
  return i18n.t("factions:names.na");
}

/** Plain catalogue read: Albescent's description only renders behind `AlbescentGate`. */
export function factionDescription(slug: string | null | undefined): string {
  const key = slug ?? "";
  if (i18n.exists(`factions:descriptions.${key}`)) {
    return tString(`factions:descriptions.${key}`);
  }
  return i18n.t("factions:detail.descriptionEmpty");
}

/** Themed slugs, derived from CSS_KEY (no parallel registry, #1269). */
export function getAllFactions(): FactionConfig[] {
  return Object.keys(CSS_KEY)
    .filter(isKnownFaction)
    .map((slug) => ({ slug }));
}

/**
 * Rainbow display order (#352), sorted by each `--faction-{slug}` light value's
 * HSL hue (re-sorted #2078). Cut at red, so `everymen` (h357.7) leads. Move a
 * slug only after re-reading its hue. Albescent is absent: any bar from this
 * would leak it (#783). Consumers must not assume a length.
 */
export const FACTION_RAINBOW_ORDER: readonly string[] = [
  "everymen",
  "ua",
  "ephemerists",
  "snide",
  "singularity",
  "wow",
  "coven",
];

/** Non-mutating; unknown slugs sort last in arrival order. */
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
