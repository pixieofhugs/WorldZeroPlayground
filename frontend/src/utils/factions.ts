/**
 * Shared faction configuration — the JS side of faction identity.
 *
 * It holds NO colour. index.css is the only source of a faction hue, and this
 * module hands out `var()` references into it (factionCssVar / factionFill), so
 * dark mode arrives free via the [data-theme="dark"] cascade and there is no
 * second table to keep in sync.
 *
 * There used to be one. The docblock here asked humans to mirror every
 * --faction-* value by hand, and it drifted: `ua` sat at #c2541f in JS against
 * #c24a18 in CSS, and #c2541f is verbatim --faction-default-stop-2 — the
 * unaffiliated spectrum's orange. Every JS-sourced surface painted UA in na's
 * hue. Worse, a hex literal has no dark half by construction, so no amount of
 * mirroring could have reached the dark lift. Deleting the table is what makes
 * the drift impossible rather than merely tested (#1269).
 *
 * What is left is the slug→theme mapping (CSS_KEY), which is about identity,
 * not colour: which slugs have a theme at all, and which resolve to `default`.
 * Faction NAMES and DESCRIPTIONS live in the factions.json catalog, keyed by
 * slug (ADR-0031, same split as taunts/ranks), resolved via factionName() /
 * factionDescription().
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
 * state rather than a faction, so `getAllFactions()` deliberately omits it —
 * surfaces that offer it (the propose-task picker #704, the filter
 * pennant row #921) do so as an explicit extra option, never via `GET /factions`.
 *
 * Lives here, with the other slug/CSS-key knowledge, so both a `ui/` component
 * and a page module can import it without a page→ui dependency (#921).
 */
export const UNAFFILIATED_FACTION_SLUG = "na";

/** What getAllFactions() hands back. Slug only — colour comes from the cascade. */
export interface FactionConfig {
  slug: string;
}

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
 *   'card-notice' — cautionary / not-yet-done ink ON the card sheet (#694)
 *   'card-alarm'  — destructive ink ON the card sheet (#1449)
 *   'card-credit' — points-earned ink ON the card sheet (#694)
 *
 * Exactly one of those is a SURFACE. `card-bg` is the sheet; `light` is a tint
 * wash; everything else is ink meant for `color:`. Reaching for `card-muted` as
 * a `background:` is what #694 was — it filled the collab roster's cast row
 * with the faction's muted TEXT ink and printed the accent pill on it at
 * 1.05:1.
 *
 * `card-notice` / `card-alarm` / `card-credit` exist because a shared,
 * faction-themed component paints state colours on eight different sheets, and
 * the global `--color-warning` / `--color-danger` / `--color-success` were
 * measured against the app's near-white surface, never against a warm cream
 * (4.14:1 on UA) or a near-black one (2.07:1 on S.N.I.D.E.). They flip on the
 * SHEET's polarity rather than on the theme, which is exactly why a global
 * token could not cover it. All three are measured in both themes by
 * `utils/__tests__/factionContrast.test.ts` — the first two against
 * `--faction-{key}-card-bg`, and `card-alarm` against the sheet the praxis card
 * actually paints, which for four factions is a different token (#1302).
 *
 * `card-notice` and `card-alarm` are ONE role split in two: cautionary and
 * destructive. They existed as a single ink until #1449, which is why anything
 * reading `card-notice` for a red meaning is a site to re-check rather than a
 * precedent to copy.
 *
 * With no suffix this is also the answer for genuine SCALAR ink on a dynamic
 * slug — the feed actor's name, the invitation letter's link. `na` and
 * `albescent` land on the neutral `--faction-default` there rather than the
 * spectrum, and that is ADR-0039 §2's decision, not a fallback: no single stop
 * of seven is legible as text (#649), and a `background-clip: text` rainbow
 * would cost text selection and high-contrast modes. Both slugs must keep
 * resolving identically or Albescent becomes conspicuous (#783); a FILL still
 * belongs to {@link factionFill}.
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
 *
 * `"rule"` is `"bar"` stood on end (#983): the vertical left-edge accent a feed
 * row or a quoted block draws. It is its own shape rather than a caller's
 * problem because the bar's ramp runs 90deg — spend that across a 3px-wide rule
 * and the spectrum lands ~0.4px a stop, which is the same mud `"dot"` exists to
 * avoid. Every faction returns the identical value for `"bar"` and `"rule"`;
 * only na's ramp turns.
 *
 * `"disc"` is `"dot"` grown large enough to hold depth (#1269): the 28px avatar
 * circle a feed row or companion card paints behind a monogram. A real faction
 * gets a 135° two-stop ramp of its own hue rather than the flat fill a 10px dot
 * takes, because at that size a flat disc reads as a sticker. It exists as a
 * shape because three feed cards had each written that ramp by hand out of an
 * interpolated hex — which is how the JS hue drifted from the CSS one in the
 * first place. na is identical to `"dot"`: the conic spectrum, already the right
 * answer at 28px.
 */
export type FactionFillShape = "bar" | "dot" | "disc" | "pill" | "frame" | "rule";

/**
 * A faction FILL as a style object to spread onto the filled element.
 *
 * Every real faction returns its solid hue for every shape (with the paired
 * `--faction-{key}-on-fill` AA ink for `"pill"`, #649). Only `na`/unregistered
 * slugs are shape-dependent, because their identity is a gradient, not a hue
 * (ADR-0039):
 *   - `"bar"`  → the linear rainbow (`--faction-default-rainbow`)
 *   - `"rule"` → the same ramp turned 180deg (`--faction-default-rainbow-vertical`)
 *                for a vertical rule, where the horizontal ramp would compress
 *                seven stops into the rule's ~3px width
 *   - `"dot"`  → the conic rainbow (`--faction-default-rainbow-conic`; a 7-stop
 *                linear is mud at 10–12px). SMOOTH, not wedged: the hard-wedge
 *                conic this used to name was deleted in #1127, because its seven
 *                light stops sit inside a 0.184 luminance band and the wedge
 *                edges merged into one dark band
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
    // bar / rule / dot / disc: one spectrum, three cuts, picked by the geometry
    // the fill lands on rather than by the caller remembering to rotate it.
    if (shape === "dot" || shape === "disc") {
      return { background: "var(--faction-default-rainbow-conic)" };
    }
    if (shape === "rule") {
      return { background: "var(--faction-default-rainbow-vertical)" };
    }
    return { background: "var(--faction-default-rainbow)" };
  }
  if (shape === "disc") {
    // 53% is the `88` alpha suffix the three hand-written copies carried, said
    // about a token instead of about a hex.
    return {
      background: `linear-gradient(135deg, var(--faction-${key}), color-mix(in srgb, var(--faction-${key}) 53%, transparent))`,
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
 * (`--faction-default-rainbow` / `--faction-default-rainbow-conic`, or
 * factionFill()).
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

/**
 * Every slug that has a theme of its own, in declaration order.
 *
 * Derived from CSS_KEY rather than kept as a second list: the colour table this
 * used to read was a parallel registry, and a parallel registry is what #1269
 * was. `albescent` and `na` are excluded for free — they map to `default`, and
 * "has a resolvable theme" is exactly what isKnownFaction means.
 */
export function getAllFactions(): FactionConfig[] {
  return Object.keys(CSS_KEY)
    .filter(isKnownFaction)
    .map((slug) => ({ slug }));
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
