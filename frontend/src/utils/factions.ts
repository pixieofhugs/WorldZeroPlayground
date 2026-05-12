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
 * The faction registry is seeded with hardcoded fallback values on startup and overwritten
 * from GET /game-config via populateFactionRegistry() once the API responds. This means
 * all components automatically see live API values after the first fetch without any
 * component-level changes.
 */

export interface FactionConfig {
  slug: string;
  name: string;
  /** Primary faction color (light mode value — use factionCssVar for theme-aware styles) */
  color: string;
}

/** Hardcoded fallback — matches index.css --faction-* values exactly. Used on first render
 *  before the API response arrives. Do not use these values directly; call factionColor(). */
const FACTION_FALLBACKS: Record<string, FactionConfig> = {
  ua: { slug: "ua", name: "UA", color: "#7c3aed" },
  analog: { slug: "analog", name: "Analog", color: "#ca8a04" },
  gestalt: { slug: "gestalt", name: "Gestalt", color: "#be185d" },
  snide: { slug: "snide", name: "S.N.I.D.E.", color: "#16a34a" },
  journeymen: { slug: "journeymen", name: "Journeymen", color: "#0e7490" },
  singularity: { slug: "singularity", name: "Singularity", color: "#2563eb" },
  ua_masters: { slug: "ua_masters", name: "UA Masters", color: "#c2410c" },
  albescent: { slug: "albescent", name: "/Albescent", color: "#7c3aed" },
  aged_out: { slug: "aged_out", name: "Aged Out", color: "#7c3aed" },
};

/** Live registry — starts as the fallback, overwritten by populateFactionRegistry(). */
let factionRegistry: Record<string, FactionConfig> = { ...FACTION_FALLBACKS };

/**
 * Called once by useGameConfig when the API response arrives.
 * Updates the runtime registry so all subsequent factionColor() / factionName()
 * calls return API-sourced values without any component changes.
 */
export function populateFactionRegistry(
  apiFactions: Array<{ slug: string; name: string; color: string }>,
) {
  for (const f of apiFactions) {
    factionRegistry[f.slug] = { slug: f.slug, name: f.name, color: f.color };
  }
}

/**
 * Slug-to-CSS-variable-key mapping.
 * Faction slugs use underscores in the DB but CSS variables use hyphens.
 */
const CSS_KEY: Record<string, string> = {
  ua: "ua",
  analog: "analog",
  gestalt: "gestalt",
  snide: "snide",
  journeymen: "journeymen",
  singularity: "singularity",
  ua_masters: "ua-masters",
  albescent: "ua",
  aged_out: "ua",
};

/**
 * Get a CSS variable reference for a faction property.
 * Use this in inline styles: `style={{ background: factionCssVar('analog', 'card-bg') }}`
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
  const key = CSS_KEY[slug ?? ""] ?? "ua";
  const prop = suffix ? `--faction-${key}-${suffix}` : `--faction-${key}`;
  return `var(${prop})`;
}

/**
 * Bundle of CSS variable references for all faction tokens used by themed pages.
 * Centralizes the repeated 6+ line destructure of factionCssVar() calls.
 * Each value is a `var(--faction-*)` reference, theme-aware via the cascade.
 */
export interface FactionTokens {
  /** primary base color (no suffix) */
  primary: string;
  /** card-bg */
  surface: string;
  /** card-text */
  text: string;
  /** card-muted */
  muted: string;
  /** card-accent */
  accent: string;
  /** card-font */
  font: string;
  /** light tint */
  light: string;
  /** border */
  border: string;
}

/**
 * Get all common faction CSS variable references for a slug in one call.
 * Use this in themed pages instead of calling factionCssVar() repeatedly:
 *   const tokens = getFactionTokens(slug);
 *   // ... tokens.surface, tokens.text, tokens.accent, etc.
 */
export function getFactionTokens(
  slug: string | null | undefined,
): FactionTokens {
  return {
    primary: factionCssVar(slug),
    surface: factionCssVar(slug, "card-bg"),
    text: factionCssVar(slug, "card-text"),
    muted: factionCssVar(slug, "card-muted"),
    accent: factionCssVar(slug, "card-accent"),
    font: factionCssVar(slug, "card-font"),
    light: factionCssVar(slug, "light"),
    border: factionCssVar(slug, "border"),
  };
}

/** Get faction color by slug, with fallback (raw hex — light mode only) */
export function factionColor(slug: string | null | undefined): string {
  return factionRegistry[slug ?? ""]?.color ?? "#6b6a7a";
}

/** Get faction display name by slug, with fallback */
export function factionName(slug: string | null | undefined): string {
  return factionRegistry[slug ?? ""]?.name ?? "Unaffiliated";
}

/** Get all factions from the live registry (populated from API after useGameConfig loads) */
export function getAllFactions(): FactionConfig[] {
  return Object.values(factionRegistry);
}
