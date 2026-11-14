/**
 * Part A of the contrast foundation (#651): the token-value test.
 *
 * The audit is mechanical because 7 factions x 2 themes x ~6 surfaces is too
 * many pairings to eyeball (#595, #594, #649 each left siblings alive). This is
 * the AA verification SPEC-faction-ui-profile.md §4 item 15 requires.
 *
 * Catches the VALUE shape: a token that misses AA on the surface it is documented
 * to sit on. Not the PAIRING shape (a component picking the wrong token) — that
 * needs a render, `e2e/contrast.spec.ts` (Part B). Exception (#2661): role-map
 * pairings (`ink` on `paper`, `onFill` on `fill`) are declared facts of
 * `factionRoles.ts`, so they are measured here.
 *
 * The manifest is half ENUMERATED (`ROLE_PAIRS`, walked out of `factionRoleVar`,
 * so a ground override moves the gate on the same commit) and half AUTHORED
 * (archetype primitives whose roles index.css states, and shared-component state
 * inks on faction sheets). The authored half still goes stale when nobody adds rows.
 *
 * Alpha is composited: un-composited rgba is how #594's 2.78:1 muted ink shipped.
 *
 * The loop cannot see:
 *  1. Non-role-on-role pairings (shared state inks, cross-surface inks) — hand rows.
 *  2. A hairline's page side: `line` is measured on its own `paper` only.
 *  3. Values composed from a role (`color-mix` veils, ramps, scrims) — hand rows with `veil`.
 *  4. Whether anything renders the pair — only Part B sees computed style.
 *  5. A block written `:root,\n[data-theme] {`: `cssVars.ts` matches it on ONE
 *     line, so a split block is invisible and its rows pass vacuously.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  AAA_NORMAL,
  AA_LARGE,
  AA_NORMAL,
  compositeOver,
  contrastRatio,
  deltaE76,
  formatRatio,
  parseColor,
  relativeLuminance,
} from "../contrast";
import {
  ALBESCENT_FACTION_SLUG,
  FACTION_RAINBOW_ORDER,
  factionCssVar,
  UNAFFILIATED_FACTION_SLUG,
} from "../factions";
import {
  FACTION_GROUNDS,
  FACTION_ROLES,
  factionRoleVar,
  type FactionGround,
  type FactionRole,
} from "../factionRoles";
import { readStripped, resolveRoleReads, sourceFiles, toRelative } from "../../test/sourceScan";
import { readThemes, resolveVar, stripComments, type Theme } from "./cssVars";
import { readIndexCss } from "../../test/indexCss";

const THEMES = readThemes(readIndexCss());
const BOTH_THEMES: Theme[] = ["light", "dark"];

/** Factions supplying the standard `--faction-{key}-card-*` block (§3). */
const CARD_KEYS = [
  "ua",
  // Also in ARCHETYPE_PAIRS: §3 covers four of the kit's six pairs (see WOW there).
  "wow",
  "everymen",
  "coven",
  "snide",
  "ephemerists",
  "singularity",
  "default",
] as const;

/**
 * Factions whose primary is a solid fill that carries text. Includes `default`:
 * the composer's remote-collaborator label prints a name on the na hue.
 */
const FILL_KEYS = CARD_KEYS;

type Pair = {
  /** Human label — what a failure message has to make actionable. */
  what: string;
  surface: string;
  text: string;
  /**
   * A translucent layer BETWEEN surface and text (wash, scrim, tint; #694): a
   * literal colour for a component's own wash, a `--var` when it is a token.
   * The pair measured must be the pair on screen.
   *
   * An array is a stack, outermost-last (#1715): page -> `--switch-well` ->
   * `--switch-thumb` -> ink. Each layer moves the ratio ~0.5, the whole margin.
   */
  veil?: Veil | Veil[];
  /** AA floor. Defaults to 4.5; AA_LARGE only for large display type. */
  floor?: number;
  /**
   * The other lawful 3:1 reason: NOT TEXT (1.4.11 graphical object; #2661).
   * Numerically `AA_LARGE` but a different rule; stating it lets the guard
   * below tell a reason from a laundered floor.
   */
  nonText?: string;
};

/**
 * A literal, or A DECLARED TOKEN AT AN ALPHA (#1302): composites
 * `alpha x token` over the ground, as `color-mix(… N%, transparent)` does, for
 * per-faction washes that a literal (resolved hex) cannot express (#1169).
 * A mix of the ink itself only ever tightens the reading.
 */
type Veil = string | { token: string; alpha: number };

/**
 * THE CROSS-PRODUCT (#2661): roles x factions x grounds x themes, ENUMERATED
 * rather than curated, read out of `factionRoleVar(slug, role, ground)` — the
 * same function surfaces call — so a ground override moves this gate with no
 * second edit.
 *
 * Inks and grounds are measured; `radius` and `face` are not colours. That
 * split is asserted below so a new role cannot skip this file.
 *
 * Rows are deduped on the RESOLVED token pair (most factions have no ground
 * override; `na`/`albescent` resolve to `default`, ADR-0039): a second row is a
 * second name for one measurement. The tuple count is asserted so the loop
 * cannot be narrowed into passing.
 */
const ROLE_SLUGS: string[] = [
  ...FACTION_RAINBOW_ORDER,
  // Last, so the `default` family is labelled by the unaffiliated state.
  UNAFFILIATED_FACTION_SLUG,
  ALBESCENT_FACTION_SLUG,
];

/** The roles that ARE a surface, and those that are not a colour. */
const ROLE_GROUNDS: FactionRole[] = ["paper", "fill"];
const ROLE_NOT_COLOUR: FactionRole[] = ["radius", "face"];

type RolePairing = {
  text: FactionRole;
  on: FactionRole;
  floor: number;
  /** The rule that picks the floor — a floor with no stated rule is an escape hatch. */
  why: string;
};

/**
 * Each question a role map can be asked, and its WCAG rule. `line` takes
 * 1.4.11's 3:1 (a rule carries no words); it matters where a panel sits on a
 * page of the same stock (#2065). `accent` is metadata text, so 4.5.
 */
const ROLE_PAIRINGS: RolePairing[] = [
  { text: "ink", on: "paper", floor: AA_NORMAL, why: "primary type — 1.4.3 AA" },
  { text: "quiet", on: "paper", floor: AA_NORMAL, why: "secondary type is still text — 1.4.3 AA" },
  { text: "accent", on: "paper", floor: AA_NORMAL, why: "§3 metadata / decorative accent, and metadata is text" },
  { text: "line", on: "paper", floor: AA_LARGE, why: "a hairline is a graphical object — 1.4.11's 3:1" },
  { text: "onFill", on: "fill", floor: AA_NORMAL, why: "#649's paired ink, which carries words on the fill" },
];

/** `var(--faction-ua-card-bg)` -> `--faction-ua-card-bg`. */
function roleToken(slug: string, role: FactionRole, ground: FactionGround): string {
  const reference = factionRoleVar(slug, role, ground);
  const match = /^var\((--[\w-]+)\)$/.exec(reference);
  if (match === null) {
    throw new Error(`factionRoleVar(${slug}, ${role}, ${ground}) is not a bare var(): ${reference}`);
  }
  return match[1];
}

/** Every question, before duplicates collapse. */
const ROLE_TUPLES = FACTION_GROUNDS.flatMap((ground) =>
  ROLE_SLUGS.flatMap((slug) => ROLE_PAIRINGS.map((pairing) => ({ slug, ground, pairing }))),
);

const ROLE_PAIRS: Pair[] = (() => {
  const rows = new Map<string, Pair>();
  for (const { slug, ground, pairing } of ROLE_TUPLES) {
    const surface = roleToken(slug, pairing.on, ground);
    const text = roleToken(slug, pairing.text, ground);
    const id = `${surface} | ${text} | ${pairing.floor}`;
    if (rows.has(id)) continue;
    rows.set(id, {
      what: `${slug}/${ground} ${pairing.text} on ${pairing.on}`,
      surface,
      text,
      floor: pairing.floor,
      nonText: pairing.floor === AA_LARGE ? pairing.why : undefined,
    });
  }
  return [...rows.values()];
})();

/**
 * #924 — text on each comment voice's COMPOSER ACCENT (the submit button uses
 * the accent, not the fill). Surface is the exact var each voice hands
 * `ComposerControls`, so it cannot be generated from the key. `default` is
 * included: the na composer paints a solid accent.
 *
 * Seven, not eight: Ephemerists passes no `-on-accent` (its CTA is the plate
 * band row). Coven's row duplicates `coven slip CTA band top` but stays while
 * `--faction-coven-on-accent` has a reader.
 */
const ACCENT_PAIRS: Pair[] = [
  { key: "ua", accent: "--faction-ua-card-accent" },
  { key: "everymen", accent: "--faction-everymen-card-accent" },
  { key: "coven", accent: "--faction-coven-card-accent" },
  { key: "snide", accent: "--faction-snide-pink" },
  { key: "wow", accent: "--faction-wow-card-accent" },
  { key: "singularity", accent: "--faction-singularity-card-text" },
  { key: "default", accent: "--faction-default-card-accent" },
].map(({ key, accent }) => ({
  what: `${key} composer accent, on-accent`,
  surface: accent,
  text: `--faction-${key}-on-accent`,
}));

/**
 * #694 — the COLLAB ROSTER's state inks on every faction sheet. A shared
 * component paints them on eight sheets; no documented role names that, and
 * Part B's route walk never renders the roster (needs >= 2 members, mixed cast
 * state). Generated over CARD_KEYS so the ink clears on all eight.
 *
 * The notice ink also gets its banner's amber veil, the tighter reading.
 */
const ROSTER_VEIL = "rgba(234,179,8,0.08)";

const ROSTER_PAIRS: Pair[] = CARD_KEYS.flatMap((key) => [
  // The "still weaving" pill and the holdout banner.
  { what: `${key} roster notice ink`, surface: `--faction-${key}-card-bg`, text: `--faction-${key}-card-notice` },
  {
    what: `${key} roster notice ink, under the holdout veil`,
    surface: `--faction-${key}-card-bg`,
    veil: ROSTER_VEIL,
    text: `--faction-${key}-card-notice`,
  },
  // The "+N" credit on a published row, and the published banner.
  { what: `${key} roster credit ink`, surface: `--faction-${key}-card-bg`, text: `--faction-${key}-card-credit` },
  // Cast-row name/byline/pill are ROLE_PAIRS pairings, not repeated here; the
  // pill's accent is BASELINE debt (#651) for everymen / coven / ephemerists.
]);

/**
 * #2269 / #2267 — the collab block on the ground each composer ACTUALLY paints.
 * ROSTER_PAIRS reads the card family (the owner's ruling); this checks each
 * archetype's ground is that family's ground. Coven (ward panel) and
 * singularity (chassis) use lighter tokens; S.N.I.D.E. uses the WALL (#2177)
 * while `-card-*` is pinned black (#2066), so its rows resolve through
 * SNIDE_WALL_PAIRS and only the cast pill's fill is added here.
 *
 * The `quiet` row is the `+ invite` chip's: deliberately a second name, because
 * the SITE is what is at risk.
 */
/**
 * `ground` is the FLAT sheet (#2485). Five composers wash an ornament layer
 * under the column; the composited reading lives in
 * `pages/editPraxis/archetypes/__tests__/composerGround.test.ts`. This table
 * owns the flat pairing and the source-parity check.
 */
const COLLAB_SKINS = [
  {
    key: "ua",
    source: "pages/editPraxis/archetypes/UaEditPraxis.tsx",
    ground: "--faction-ua-card-bg",
    quiet: "--faction-ua-card-body",
  },
  {
    key: "wow",
    source: "pages/editPraxis/archetypes/WowEditPraxis.tsx",
    ground: "--faction-wow-card-bg",
    quiet: "--faction-wow-card-muted",
  },
  {
    key: "default",
    source: "pages/editPraxis/archetypes/DefaultEditPraxis.tsx",
    ground: "--faction-default-card-bg",
    quiet: "--faction-default-composer-faint",
  },
  {
    key: "everymen",
    source: "pages/editPraxis/archetypes/EverymenEditPraxis.tsx",
    ground: "--everymen-paper",
    quiet: "--everymen-quiet",
  },
  {
    key: "ephemerists",
    source: "pages/editPraxis/archetypes/EphemeristsEditPraxis.tsx",
    ground: "--faction-ephemerists-plate-bg",
    quiet: "--faction-ephemerists-plate-quiet",
  },
  {
    key: "coven",
    source: "pages/editPraxis/archetypes/CovenEditPraxis.tsx",
    ground: "--faction-coven-ward-card",
    quiet: "--faction-coven-slip-label",
  },
  {
    key: "singularity",
    source: "pages/editPraxis/archetypes/SingularityEditPraxis.tsx",
    ground: "--faction-singularity-term-bg",
    quiet: "--faction-singularity-term-ink",
  },
  {
    key: "snide",
    source: "pages/editPraxis/archetypes/SnideEditPraxis.tsx",
    // Tighter ramp stop; the washed corners are SNIDE_WALL_PAIRS'.
    ground: "--faction-snide-wall-deep",
    quiet: "--faction-snide-composer-muted",
  },
] as const;

/** Card-family inks the roster resolves via `factionCssVar`, on the composer ground. */
const COLLAB_FALLBACK_KEYS = COLLAB_SKINS.filter((skin) => skin.key !== "snide");

const COLLAB_PAIRS: Pair[] = [
  ...COLLAB_SKINS.map((skin) => ({
    what: `${skin.key} collab quiet tier, on its composer ground`,
    surface: skin.ground,
    text: skin.quiet,
  })),
  ...COLLAB_FALLBACK_KEYS.flatMap((skin) => [
    {
      // The banner's own ink at 8% under itself (#1609) — the tighter reading.
      what: `${skin.key} collab holdout notice, on its composer ground`,
      surface: skin.ground,
      veil: { token: `--faction-${skin.key}-card-notice`, alpha: 0.08 },
      text: `--faction-${skin.key}-card-notice`,
    },
    {
      what: `${skin.key} collab credit ink, on its composer ground`,
      surface: skin.ground,
      text: `--faction-${skin.key}-card-credit`,
    },
    // No `accent as ink` row: that is ROLE_PAIRS' `{slug}/sheet accent on paper`,
    // BASELINE debt for everymen and coven (#651). `accentInk` is the fix's seam.
  ]),
  // The cast pill (acid fill, near-black ink) is `snide badge chip, glyph` (#2227).
];

/**
 * #1302 — the praxis card's admin overlay and mode chip on all eight sheets.
 * `components/praxisCard/shared.tsx` is shared, so global status inks would
 * fail AA on cream/vellum/papyrus/ward/dark plates.
 *
 * The surface is the sheet the card PAINTS, not always `-card-bg`: ua uses the
 * parchment ramp's darkest stop (`parseColor` cannot read a gradient), coven
 * the ward panel, wow the chronicle bg (same value today, different token).
 */
const PRAXIS_CARD_SHEET: Record<(typeof CARD_KEYS)[number], string> = {
  default: "--faction-default-card-bg",
  ua: "--faction-ua-panel",
  everymen: "--faction-everymen-card-bg",
  coven: "--faction-coven-ward-card",
  // The wall's deep stop (#2177); its other readings and the task-detail black
  // dress are in SNIDE_WALL_PAIRS.
  snide: "--faction-snide-wall-deep",
  wow: "--faction-wow-chronicle-bg",
  // Same token `-card-bg` aliases (#2141); spelled out as an answer, not a default.
  ephemerists: "--faction-ephemerists-plate-bg",
  singularity: "--faction-singularity-card-bg",
};

/**
 * The four whose sheet is a different TOKEN from `-card-bg`. Ephemerists'
 * `-card-bg` aliases its plate, so it is already ROLE_PAIRS' `sheet quiet on paper`.
 */
const OWN_SHEET_KEYS = ["ua", "coven", "wow", "snide"] as const;

/**
 * Which ink the card's shared slots resolve (#2177). For seven factions it is
 * the `-card-{role}` name typed. S.N.I.D.E.'s frame re-points those properties
 * to the wall family (`.snd-praxis-*` in index.css), so this maps to what the
 * cascade delivers.
 */
const PRAXIS_CARD_INK: Partial<
  Record<(typeof CARD_KEYS)[number], Record<"notice" | "alarm" | "credit" | "muted", string>>
> = {
  snide: {
    notice: "--faction-snide-wall-notice",
    alarm: "--faction-snide-wall-alarm",
    credit: "--faction-snide-wall-credit",
    muted: "--faction-snide-note-muted",
  },
};

const cardInk = (key: (typeof CARD_KEYS)[number], role: "notice" | "alarm" | "credit" | "muted") =>
  PRAXIS_CARD_INK[key]?.[role] ?? `--faction-${key}-card-${role}`;

/** The chip's own wash. 8%, not 12%: 12% took the Ephemerists plate to 4.41:1. */
const CHIP_WASH = 0.08;

const PRAXIS_CARD_PAIRS: Pair[] = [
  ...CARD_KEYS.flatMap((key) => {
    const surface = PRAXIS_CARD_SHEET[key];
    const notice = cardInk(key, "notice");
    const alarm = cardInk(key, "alarm");
    return [
      // Moderation badges and controls (#1449), each under the veil it is painted on.
      {
        what: `${key} praxis card flagged badge, alarm ink under the danger veil`,
        surface,
        veil: "--color-danger-veil",
        text: alarm,
      },
      {
        what: `${key} praxis card failed badge, notice ink under the warning veil`,
        surface,
        veil: "--color-warning-veil",
        text: notice,
      },
      // `moderateError` sets alarm ink on the bare sheet. A veil of the mark's own
      // polarity is tighter today, but that depends on two alphas, so it is named.
      { what: `${key} praxis card error text, alarm ink`, surface, text: alarm },
      // The mode chip: ink, wash and rule from ONE faction ink (#694).
      {
        what: `${key} praxis card mode chip, notice ink on its own wash`,
        surface,
        veil: { token: notice, alpha: CHIP_WASH },
        text: notice,
      },
      {
        what: `${key} praxis card mode chip, credit ink on its own wash`,
        surface,
        veil: { token: cardInk(key, "credit"), alpha: CHIP_WASH },
        text: cardInk(key, "credit"),
      },
    ];
  }),
  // Bare-sheet muted (`hidden` badge) for the four own-sheet keys; the rest are
  // ROLE_PAIRS' `{slug}/sheet quiet on paper`.
  ...OWN_SHEET_KEYS.flatMap((key) => [
    {
      what: `${key} praxis card sheet, muted ink`,
      surface: PRAXIS_CARD_SHEET[key],
      text: cardInk(key, "muted"),
    },
  ]),
];

/**
 * S.N.I.D.E. WEARS ONE GROUND: THE FLYPOSTED WALL (#2177) — composer, praxis
 * card and task card. The wall is FOUR grounds: a ramp `-wall` -> `-wall-deep`
 * plus an acid wash top-left and a pink wash bottom-right, so an ink can clear
 * the ramp and miss a corner (#1028; `-note-muted` 4.92 flat vs 4.22 pink).
 *
 * The raster and scanline (~5% at 1-in-4 duty) are not modelled: they average
 * into the ground and no glyph sits on one stripe.
 */
const SNIDE_WALL_GROUNDS: { where: string; surface: string; wash?: string }[] = [
  { where: "wall", surface: "--faction-snide-wall" },
  { where: "deep wall", surface: "--faction-snide-wall-deep" },
  {
    where: "acid corner",
    surface: "--faction-snide-wall",
    wash: "--faction-snide-note-wash-acid",
  },
  {
    where: "pink corner",
    surface: "--faction-snide-wall-deep",
    wash: "--faction-snide-note-wash-pink",
  },
];

/**
 * Every ink S.N.I.D.E. prints on the wall (`-note-*` = clipping, `-composer-*`
 * = sheet; two families per #1181). The faction page grounds here too, so some
 * rows are BARE readings of inks otherwise measured under a veil — a veiled
 * reading does not vouch for the bare one. `-wall-credit` bare is
 * `SnideProfileBody`'s level numeral.
 */
const SNIDE_WALL_INKS = [
  ["headline and title", "--faction-snide-note-ink"],
  ["brief and excerpt", "--faction-snide-note-muted"],
  ["the pink that is text", "--faction-snide-note-pink-ink"],
  ["the marker scrawl, bare", "--faction-snide-wall-credit"],
  ["the join error, bare", "--faction-snide-wall-alarm"],
  ["composer ink", "--faction-snide-composer-ink"],
  ["composer prose", "--faction-snide-composer-muted"],
  ["composer faint ink", "--faction-snide-composer-faint"],
  // Bare (#2349): character creation spends this ink with no veil beneath it.
  ["composer alarm, bare", "--faction-snide-composer-alarm"],
] as const;

const SNIDE_WALL_PAIRS: Pair[] = [
  ...SNIDE_WALL_GROUNDS.flatMap(({ where, surface, wash }) => [
    ...SNIDE_WALL_INKS.map(([role, text]) => ({
      what: `snide ${where}, ${role}`,
      surface,
      veil: wash,
      text,
    })),
    // The praxis card's functional inks on the other three readings (see PRAXIS_CARD_INK).
    {
      what: `snide ${where}, flagged badge alarm ink under the danger veil`,
      surface,
      veil: [wash, "--color-danger-veil"].filter((layer) => layer !== undefined) as Veil[],
      text: "--faction-snide-wall-alarm",
    },
    {
      what: `snide ${where}, mode chip notice ink on its own wash`,
      surface,
      veil: [wash, { token: "--faction-snide-wall-notice", alpha: CHIP_WASH }].filter(
        (layer) => layer !== undefined,
      ) as Veil[],
      text: "--faction-snide-wall-notice",
    },
    {
      what: `snide ${where}, mode chip credit ink on its own wash`,
      surface,
      veil: [wash, { token: "--faction-snide-wall-credit", alpha: CHIP_WASH }].filter(
        (layer) => layer !== undefined,
      ) as Veil[],
      text: "--faction-snide-wall-credit",
    },
    // The composer's error banner.
    {
      what: `snide ${where}, composer error banner alarm ink under the danger veil`,
      surface,
      veil: [wash, "--color-danger-veil"].filter((layer) => layer !== undefined) as Veil[],
      text: "--faction-snide-composer-alarm",
    },
  ]),
  // EXCEPTION: on TASK DETAIL the praxis card is a black slab (#2066) and its
  // slots resolve `-card-*`; ROLE_PAIRS has the reading inks, these the functional ones.
  {
    what: "snide detail slab, flagged badge alarm ink under the danger veil",
    surface: "--faction-snide-card-bg",
    veil: "--color-danger-veil",
    text: "--faction-snide-card-alarm",
  },
  {
    what: "snide detail slab, mode chip notice ink on its own wash",
    surface: "--faction-snide-card-bg",
    veil: { token: "--faction-snide-card-notice", alpha: CHIP_WASH },
    text: "--faction-snide-card-notice",
  },
  {
    what: "snide detail slab, mode chip credit ink on its own wash",
    surface: "--faction-snide-card-bg",
    veil: { token: "--faction-snide-card-credit", alpha: CHIP_WASH },
    text: "--faction-snide-card-credit",
  },
  // The score stamp keeps slab inks on both dresses only while its plate is
  // OPAQUE (a 40% black read 2.71:1 on the light wall).
  {
    what: "snide score stamp plate, acid figure",
    surface: "--faction-snide-note-bar",
    text: "--faction-snide-acid",
  },
  {
    what: "snide score stamp plate, typed caption",
    surface: "--faction-snide-note-bar",
    text: "--faction-snide-vote-off",
  },
];

/**
 * The Singularity seal's inner panel: accent phosphor at 5% over the dark
 * chassis (`GLASS` in `SingularityDuelSealConfirm`). A component wash, so literal.
 */
const SEAL_GLASS_VEIL = "rgba(74,222,128,0.05)";

/** Archetype-private primitives, each a role index.css states in words. */
const ARCHETYPE_PAIRS: Pair[] = [
  // Everymen — "the paper surface + its text FLIP in dark".
  { what: "everymen paper", surface: "--everymen-paper", text: "--everymen-paper-text" },
  // `.em-backdrop` ramps paper -> deep stock with a 55% deep vignette (#2133).
  { what: "everymen deep stock, ink", surface: "--everymen-paper-deep", text: "--everymen-paper-text" },
  { what: "everymen paper, muted", surface: "--everymen-paper", text: "--everymen-muted" },
  { what: "everymen cream element, ink", surface: "--everymen-cream", text: "--everymen-ink" },
  { what: "everymen gold element, ink", surface: "--everymen-gold", text: "--everymen-ink" },
  { what: "everymen poster field, cream", surface: "--everymen-field", text: "--everymen-cream" },

  // S.N.I.D.E. — the wall is the one SNIDE surface that flips.
  { what: "snide flyposted wall", surface: "--faction-snide-wall", text: "--faction-snide-wall-text" },
  { what: "snide deep wall", surface: "--faction-snide-wall-deep", text: "--faction-snide-wall-text" },
  { what: "snide xerox paper, ink", surface: "--faction-snide-paper", text: "--faction-snide-ink" },

  // UA (#788, #848): four themed surfaces in a narrow luminance band, so every
  // ink is measured on every surface it may sit on (the kit shipped a 4.38 muted).
  { what: "ua page ground, page text", surface: "--faction-ua-page", text: "--faction-ua-page-text" },
  { what: "ua page ground, prose", surface: "--faction-ua-page", text: "--faction-ua-card-body" },
  { what: "ua page ground, muted", surface: "--faction-ua-page", text: "--faction-ua-card-muted" },
  { what: "ua page ground, accent", surface: "--faction-ua-page", text: "--faction-ua-card-accent" },
  { what: "ua card, prose", surface: "--faction-ua-card-bg", text: "--faction-ua-card-body" },
  { what: "ua panel, ink", surface: "--faction-ua-panel", text: "--faction-ua-card-text" },
  { what: "ua panel, prose", surface: "--faction-ua-panel", text: "--faction-ua-card-body" },
  { what: "ua panel, muted", surface: "--faction-ua-panel", text: "--faction-ua-card-muted" },
  { what: "ua panel, accent", surface: "--faction-ua-panel", text: "--faction-ua-card-accent" },
  { what: "ua lift, ink", surface: "--faction-ua-lift", text: "--faction-ua-card-text" },
  { what: "ua lift, prose", surface: "--faction-ua-lift", text: "--faction-ua-card-body" },
  { what: "ua lift, muted", surface: "--faction-ua-lift", text: "--faction-ua-card-muted" },
  { what: "ua lift, accent", surface: "--faction-ua-lift", text: "--faction-ua-card-accent" },
  // The UA colours that do NOT owe 4.5: --faction-ua is fill/large-type hue,
  // --faction-ua-vermil the ensō numeral at display size. --faction-ua-glow
  // (3.12) is ornament only, so it has no pair.
  {
    what: "ua primary as large display type",
    surface: "--faction-ua-card-bg",
    text: "--faction-ua",
    floor: AA_LARGE,
  },
  {
    what: "ua ensō numeral, large display type",
    surface: "--faction-ua-card-bg",
    text: "--faction-ua-vermil",
    floor: AA_LARGE,
  },

  // WOW (#838, ADR-0050). Four of the kit's six pairs are the §3 block, already
  // in ROLE_PAIRS; these are the chronicle's own primitives.
  //
  // --faction-wow-on-gold is named for the ground it was measured on, never the
  // fill: white on this gold is 2.47:1 (WORLD_ZERO_STYLE §3, #1766).
  { what: "wow chronicle gold element, ink", surface: "--faction-wow-chronicle-gold", text: "--faction-wow-on-gold" },
  // The kit's "gold / card-bg dk" pair; both themes also gate the light sibling.
  { what: "wow stamp total, on card", surface: "--faction-wow-card-bg", text: "--faction-wow-stamp-total" },
  // #896: the kit's #8a6d1f read 4.46 on cream, so index.css walks it down.
  { what: "wow eyebrow ink, on card", surface: "--faction-wow-card-bg", text: "--faction-wow-accent-deep" },
  // The rank pill (#897): theme-invariant, measured on the lozenge's darkest stop.
  {
    what: "wow avatar rank pill ink",
    surface: "--faction-wow-avatar-pill-to",
    text: "--faction-wow-avatar-pill-text",
  },

  // WOW — THE PROFILE PAGE, DRESSED (#3025). `WowProfileBody` reads WOW's own
  // ink / quiet / accent roles. `ProfileSkin` paints the page in a 165deg ramp
  // between `-ground-from` and `-ground-to`, and About, the empty-tasks line
  // and the Badges heading stand directly on it; the progression panel and the
  // praxis empty state are `-plate`. A ramp has no single value, so each ink is
  // measured on both stops. Light quiet on `-ground-to` is the thin one.
  { what: "wow profile ground-from, ink", surface: "--faction-wow-ground-from", text: "--faction-wow-card-text" },
  { what: "wow profile ground-from, quiet", surface: "--faction-wow-ground-from", text: "--faction-wow-ground-quiet" },
  { what: "wow profile ground-from, accent", surface: "--faction-wow-ground-from", text: "--faction-wow-card-accent" },
  { what: "wow profile ground-to, ink", surface: "--faction-wow-ground-to", text: "--faction-wow-card-text" },
  { what: "wow profile ground-to, quiet", surface: "--faction-wow-ground-to", text: "--faction-wow-ground-quiet" },
  { what: "wow profile ground-to, accent", surface: "--faction-wow-ground-to", text: "--faction-wow-card-accent" },
  { what: "wow profile plate, ink", surface: "--faction-wow-plate", text: "--faction-wow-card-text" },
  { what: "wow profile plate, quiet", surface: "--faction-wow-plate", text: "--faction-wow-ground-quiet" },
  { what: "wow profile plate, accent", surface: "--faction-wow-plate", text: "--faction-wow-card-accent" },
  // Header handle/joined line: `headerMuted` on the ramp under the 10% checker.
  ...["--faction-wow-ground-from", "--faction-wow-ground-to"].flatMap((surface) =>
    ["--faction-wow-plum-surface", "--faction-wow-chronicle-gold"].map((token) => ({
      what: `wow profile header ${surface.slice(14)}, headerMuted under checker ${token.slice(14)}`,
      surface,
      text: "--faction-wow-ground-quiet",
      veil: { token, alpha: 0.1 },
    })),
  ),
  // Page overlay over the ramp: the gilt hatch runs the whole page (bottom stop),
  // the court glow sits upper right (top stop).
  ...["card-text", "ground-quiet", "card-accent"].map((ink) => ({
    what: `wow profile ground-to, ${ink} under hatch`,
    surface: "--faction-wow-ground-to",
    text: `--faction-wow-${ink}`,
    veil: "--faction-wow-hatch",
  })),
  ...["card-text", "ground-quiet", "card-accent"].map((ink) => ({
    what: `wow profile ground-from, ${ink} under court glow`,
    surface: "--faction-wow-ground-from",
    text: `--faction-wow-${ink}`,
    veil: "--faction-wow-court-glow",
  })),

  // WOW lists (#895), duel seal and rail. The kit's contrast table is wrong both
  // ways, so these hold the measurement. The opponent's accent is absent: it
  // lands only as ring/edge/bar, never ink or text ground — paint a string in it
  // and it needs a row.
  {
    // Per-theme gold, invariant ink. `-on-gold`, not `-on-fill` (see chronicle gold; #2068).
    what: "wow duel champion tile, ink",
    surface: "--faction-wow-balloon-5",
    text: "--faction-wow-on-gold",
  },
  {
    // Rail headline and seal body — the longest strings on either surface.
    what: "wow duel lists ground, body ink",
    surface: "--faction-wow-duel-lists-bg",
    text: "--faction-wow-card-text",
  },
  {
    // Section eyebrows, in #896's walked-down olive-gold.
    what: "wow duel lists ground, eyebrow ink",
    surface: "--faction-wow-duel-lists-bg",
    text: "--faction-wow-accent-deep",
  },
  {
    // Ribbon line and settled standing note.
    what: "wow duel lists ground, plum",
    surface: "--faction-wow-duel-lists-bg",
    text: "--faction-wow-card-accent",
  },

  // Coven slip (#1023): a four-stop GRADIENT, measured on its darkest stop
  // (#fbc4dd) — the design measured on near-white. Task card, praxis card and
  // both detail columns read these. DEEP (3.33 here) is never text on the slip.
  { what: "coven slip, ink", surface: "--faction-coven-slip-mid", text: "--faction-coven-slip-ink" },
  { what: "coven slip, brief", surface: "--faction-coven-slip-mid", text: "--faction-coven-slip-soft" },
  { what: "coven slip, caption", surface: "--faction-coven-slip-mid", text: "--faction-coven-slip-label" },
  // The lavender end is a different hue, not covered by the stop above.
  { what: "coven slip lavender, ink", surface: "--faction-coven-slip-vio", text: "--faction-coven-slip-ink" },
  { what: "coven slip lavender, brief", surface: "--faction-coven-slip-vio", text: "--faction-coven-slip-soft" },
  { what: "coven slip lavender, caption", surface: "--faction-coven-slip-vio", text: "--faction-coven-slip-label" },
  // Both CTA stops carry the label; the dark band takes ink (see --faction-coven-on-accent).
  { what: "coven slip CTA band top", surface: "--faction-coven-slip-cta-from", text: "--faction-coven-slip-cta-ink" },
  { what: "coven slip CTA band foot", surface: "--faction-coven-slip-cta-to", text: "--faction-coven-slip-cta-ink" },
  // Coven points plate (#2019): a ramp ward-card -> `-plate-foot`, measured on the
  // darker FOOT. The design's three colour-coded inks all failed in light, so
  // they ship walked. 19-21px/600 serif, so AA_NORMAL.
  { what: "coven plate, base figure", surface: "--faction-coven-slip-plate-foot", text: "--faction-coven-slip-row-base" },
  { what: "coven plate, multiplier figure", surface: "--faction-coven-slip-plate-foot", text: "--faction-coven-slip-row-mult" },
  { what: "coven plate, votes figure", surface: "--faction-coven-slip-plate-foot", text: "--faction-coven-slip-row-votes" },
  // Plain-ink figures and brief-ink labels on the same ground.
  { what: "coven plate, subtotal figure", surface: "--faction-coven-slip-plate-foot", text: "--faction-coven-slip-ink" },
  { what: "coven plate, row label", surface: "--faction-coven-slip-plate-foot", text: "--faction-coven-slip-soft" },
  // The cauldron belly (94% ward paper): its caption is `coven ward panel, brief`.
  {
    what: "coven cauldron belly, total figure",
    surface: "--faction-coven-ward-card",
    text: "--faction-coven-slip-deep",
  },

  // Coven ward (task detail, #1031): two flat grounds. The page haze's
  // composited worst case is noted beside `--faction-coven-ward-haze` in index.css.
  { what: "coven ward page, ink", surface: "--faction-coven-ward-page", text: "--faction-coven-slip-ink" },
  { what: "coven ward page, brief", surface: "--faction-coven-ward-page", text: "--faction-coven-slip-soft" },
  { what: "coven ward page, caption", surface: "--faction-coven-ward-page", text: "--faction-coven-slip-label" },
  // The detail columns wear the slip, so their loose copy is measured on both
  // ramp ends. Same token pairs as the card on purpose: a walk-down then fails
  // at every surface that reads it. The ward-page rows are `CovenFieldDesk`'s.
  { what: "coven detail column, ink", surface: "--faction-coven-slip-mid", text: "--faction-coven-slip-ink" },
  { what: "coven detail column, brief", surface: "--faction-coven-slip-mid", text: "--faction-coven-slip-soft" },
  { what: "coven detail column, caption", surface: "--faction-coven-slip-mid", text: "--faction-coven-slip-label" },
  { what: "coven detail column lavender, ink", surface: "--faction-coven-slip-vio", text: "--faction-coven-slip-ink" },
  { what: "coven detail column lavender, brief", surface: "--faction-coven-slip-vio", text: "--faction-coven-slip-soft" },
  { what: "coven detail column lavender, caption", surface: "--faction-coven-slip-vio", text: "--faction-coven-slip-label" },
  { what: "coven ward panel, ink", surface: "--faction-coven-ward-card", text: "--faction-coven-slip-ink" },
  { what: "coven ward panel, brief", surface: "--faction-coven-ward-card", text: "--faction-coven-slip-soft" },
  { what: "coven ward panel, caption", surface: "--faction-coven-ward-card", text: "--faction-coven-slip-label" },
  // Hold band: the upper stop brightens in dark, so both are measured.
  { what: "coven hold band top", surface: "--faction-coven-slip-gold", text: "--faction-coven-ward-hold-ink" },
  { what: "coven hold band foot", surface: "--faction-coven-ward-hold-to", text: "--faction-coven-ward-hold-ink" },

  // Everymen bill (#1023): only roles the `--everymen-*` family had no home for.
  { what: "everymen bill masthead", surface: "--faction-everymen-bill-mast", text: "--faction-everymen-bill-mast-ink" },
  { what: "everymen bill CTA bar", surface: "--faction-everymen-bill-cta-bg", text: "--faction-everymen-bill-cta-ink" },
  // Walked down off the design's goldDeep (3.11).
  { what: "everymen bill modifier ink", surface: "--everymen-paper", text: "--faction-everymen-bill-mult-ink" },
  // EverymenScoreStamp's struck multiplier ratio (13px).
  { what: "everymen score stamp multiplier ink", surface: "--faction-everymen-card-bg", text: "--faction-everymen-bill-mult-ink" },
  // The bill's level caption.
  { what: "everymen paper, olive label", surface: "--everymen-paper", text: "--everymen-muted" },
  {
    // Red on paper is 4.49 (so no prose in it); the numeral is 32/24px Bebas, so
    // AA_LARGE. The 8px "POINTS" caption is stamp ornament (§4).
    what: "everymen seal numeral, large display type",
    surface: "--everymen-paper",
    text: "--everymen-red",
    floor: AA_LARGE,
  },

  // Ephemerists Valley plate (#1023, split #2141): sheet, cornice band, disc and
  // CTA bar. `-brass` frames and is never text. The sheet flips (vellum by day);
  // band and disc are compass blue #12151f in both themes.
  { what: "ephemerists plate, ink", surface: "--faction-ephemerists-plate-bg", text: "--faction-ephemerists-plate-ink" },
  { what: "ephemerists plate, brief", surface: "--faction-ephemerists-plate-bg", text: "--faction-ephemerists-plate-muted" },
  { what: "ephemerists plate, caption", surface: "--faction-ephemerists-plate-bg", text: "--faction-ephemerists-plate-caption" },
  { what: "ephemerists cornice band, masthead", surface: "--faction-ephemerists-plate-band", text: "--faction-ephemerists-plate-band-ink" },
  // The task card masthead grounds on `-plate-disc`. Band and disc share a hex
  // today; two surfaces stay two rows until something asserts the value.
  { what: "ephemerists card masthead band, wordmark", surface: "--faction-ephemerists-plate-disc", text: "--faction-ephemerists-plate-band-ink" },
  // The disc's ink budget is the band's (#2141): `-plate-ink`/`-plate-muted`
  // flip and read 1.00 / 1.82 on the invariant disc — only a both-themes
  // pairing could see that.
  { what: "ephemerists medallion disc, points", surface: "--faction-ephemerists-plate-disc", text: "--faction-ephemerists-plate-band-ink" },
  { what: "ephemerists medallion disc, unit", surface: "--faction-ephemerists-plate-disc", text: "--faction-ephemerists-plate-band-quiet" },
  { what: "ephemerists plate CTA band", surface: "--faction-ephemerists-plate-cta-bg", text: "--faction-ephemerists-plate-cta-ink" },
  // No profile-header row: `headerStyle` grounds on the BAND, so its pairing is
  // `ephemerists cornice band, quiet ink` below.
  //
  // Logged-out vote gate (#1627): `EphemeristsVote` returns the gate before its
  // own plate, so `-card-accent` lands on `-plate-bg` (was 3.75 in dark).
  { what: "ephemerists vote login gate, card accent on the plate", surface: "--faction-ephemerists-plate-bg", text: "--faction-ephemerists-card-accent" },
  // Flagged banner (#1636) on the page ground: neutral chrome read 3.01 / 3.68
  // once `-plate-page` went dark, so it takes `-card-notice` for ink and rule (#1449).
  { what: "ephemerists flagged banner, notice ink on the page ground", surface: "--faction-ephemerists-plate-page", text: "--faction-ephemerists-card-notice" },

  // Task detail (#1032): the darker page ground drops `-muted` / `-caption`
  // below AA, hence `-quiet`; `-nile` (links, "level met") is measured on all
  // three grounds.
  { what: "ephemerists page ground, quiet ink", surface: "--faction-ephemerists-plate-page", text: "--faction-ephemerists-plate-quiet" },
  { what: "ephemerists page ground, links", surface: "--faction-ephemerists-plate-page", text: "--faction-ephemerists-plate-brass-light" },
  { what: "ephemerists page ground, title", surface: "--faction-ephemerists-plate-page", text: "--faction-ephemerists-plate-ink" },
  { what: "ephemerists plate, quiet ink", surface: "--faction-ephemerists-plate-bg", text: "--faction-ephemerists-plate-quiet" },
  { what: "ephemerists panel cell, ink", surface: "--faction-ephemerists-plate-inner", text: "--faction-ephemerists-plate-ink" },
  { what: "ephemerists panel cell, caption", surface: "--faction-ephemerists-plate-inner", text: "--faction-ephemerists-plate-caption" },
  { what: "ephemerists panel cell, quiet ink", surface: "--faction-ephemerists-plate-inner", text: "--faction-ephemerists-plate-quiet" },
  { what: "ephemerists panel cell, links", surface: "--faction-ephemerists-plate-inner", text: "--faction-ephemerists-plate-brass-light" },
  // OCHRE AS INK (#2145): 4.46 on `-plate-bg` (never text there), clears on the
  // lighter panel cell. Replaced an ochre chip that read 3.0007 at 11px.
  { what: "ephemerists panel cell, metatask award", surface: "--faction-ephemerists-plate-inner", text: "--faction-ephemerists-plate-ochre" },
  // Singularity terminal (#1023): dark in both themes (§6). The light half is the
  // tighter (lighter chassis), so `-blue` / `-dim` ship walked UP; label rows
  // measure the chrome bar, lighter than the chassis.
  { what: "singularity terminal chassis, title", surface: "--faction-singularity-term-bg", text: "--faction-singularity-term-bright" },
  { what: "singularity terminal chassis, brief", surface: "--faction-singularity-term-bg", text: "--faction-singularity-term-dim" },
  { what: "singularity terminal chassis, boot line", surface: "--faction-singularity-term-bg", text: "--faction-singularity-term-blue" },
  { what: "singularity window bar, process name", surface: "--faction-singularity-term-chrome", text: "--faction-singularity-term-dim" },
  { what: "singularity window bar, ordinal", surface: "--faction-singularity-term-chrome", text: "--faction-singularity-term-blue" },
  // A RESOLVED ground rather than alpha-over-chassis, so this row can exist.
  { what: "singularity points well, total", surface: "--faction-singularity-term-readout", text: "--faction-singularity-term-blue-bright" },
  { what: "singularity points well, unit", surface: "--faction-singularity-term-readout", text: "--faction-singularity-term-blue" },
  // The directory tile's join button spreads `SINGULARITY_CARD_CTA` — this row.
  { what: "singularity CTA, prompt", surface: "--faction-singularity-term-cta-bg", text: "--faction-singularity-term-cta-ink" },

  // S.N.I.D.E. ransom clipping (#1023): flips, so each row is two grounds. Pink
  // survives as a drawn line and is walked down where it carries a word.
  { what: "snide clipping, headline", surface: "--faction-snide-note-paper", text: "--faction-snide-note-ink" },
  { what: "snide clipping, brief", surface: "--faction-snide-note-paper", text: "--faction-snide-note-muted" },
  { what: "snide clipping, points caption", surface: "--faction-snide-note-paper", text: "--faction-snide-note-pink-ink" },
  { what: "snide clipping bar, ordinal", surface: "--faction-snide-note-bar", text: "--faction-snide-note-bar-ink" },
  { what: "snide clipping bar, wordmark", surface: "--faction-snide-note-bar", text: "--faction-snide-acid" },
  // A knockout names its own pair: paper/ink swap under the cascade and would cancel.
  { what: "snide headline knockout", surface: "--faction-snide-note-knockout-bg", text: "--faction-snide-note-knockout-ink" },
  // Headline cut 1 and the CTA bar are one pairing; acid does not flip.
  { what: "snide acid CTA bar", surface: "--faction-snide-note-cta-bg", text: "--faction-snide-note-cta-ink" },
  // The directory tile's `SNIDE_CARD_CTA` is "clipping bar, wordmark" above.
  // Modifier chip: paper on pink read 3.10, so it takes the near-black CTA ink.
  { what: "snide modifier chip", surface: "--faction-snide-pink", text: "--faction-snide-note-cta-ink" },

  // UA vellum leaf (#1023): no new tokens; the rows add the parchment gradient's
  // DARKEST stop (`-panel` by day, `-card-bg` by night).
  { what: "ua leaf darkest stop, title", surface: "--faction-ua-panel", text: "--faction-ua-card-text" },
  { what: "ua leaf darkest stop, brief", surface: "--faction-ua-panel", text: "--faction-ua-card-muted" },
  // The design's `--faction-ua-glow` (2.93) misses even AA_LARGE; walked onto the accent.
  { what: "ua leaf darkest stop, score numeral", surface: "--faction-ua-panel", text: "--faction-ua-card-accent" },
  // The directory tile spreads `UA_CARD_CTA`, so this row covers both.
  { what: "ua leaf CTA", surface: "--faction-ua-card-chip-bg", text: "--faction-ua-card-chip-ink" },

  // WOW quest decree (#1023): all existing families. Its dark plum (#8a5aae,
  // 4.10) is what `--faction-wow-plum-surface` note 1 rejected, so the card
  // takes that token.
  { what: "wow decree CTA / modifier chip", surface: "--faction-wow-plum-surface", text: "--faction-wow-on-plum" },
  // The ✦ is a dingbat, so it may be 2.00:1 chronicle gold — no row.
  { what: "wow decree plaque, total", surface: "--faction-wow-chronicle-panel", text: "--faction-wow-stamp-total" },
  { what: "wow decree plaque, unit", surface: "--faction-wow-chronicle-panel", text: "--faction-wow-card-accent" },

  // ── DUEL SEAL / FORFEIT DIALOGS (#1168) ──
  //
  // Second instance of #694: global `--color-danger` / `--color-success` on eight
  // faction sheets, three dark in both themes. Part B never reaches a composer
  // state. `StakesTiles` / `RaceRoster` take `DuelSlotTheme`'s `credit` / `alarm`,
  // which is what makes per-skin routing possible.
  //
  // Not repeated (already measured): ua and singularity seal body/note = their
  // roster notice/credit rows; ephemerists forfeit cost panel = `cornice band,
  // masthead`; ephemerists seal note = `plate, quiet ink`; default stakes panel =
  // `default seal note`.
  //
  // Body, note and the 18px "sealed" mark owe 4.5; only the 24px/700 ZERO figure
  // takes AA_LARGE. The 3px danger rule is a mark, no pair.
  {
    what: "default seal body, notice ink",
    surface: "--color-bg-page",
    text: "--faction-default-card-notice",
  },
  // The global red is 4.31 on the ward page in light, so the skin routes its own.
  { what: "coven seal body, notice ink", surface: "--faction-coven-ward-page", text: "--faction-coven-card-notice" },
  { what: "wow seal body, notice ink", surface: "--faction-wow-duel-lists-bg", text: "--faction-wow-card-notice" },
  { what: "everymen seal body, notice ink", surface: "--everymen-paper", text: "--faction-everymen-card-notice" },
  // Snide's forfeit copy: pink on the black redaction bar.
  { what: "snide seal body, pink on the redaction bar", surface: "--faction-snide-ink", text: "--faction-snide-pink" },

  // Five sheets keep `--color-success`: they flip with the token.
  { what: "default seal note, success on the page", surface: "--color-bg-page", text: "--color-success" },
  { what: "coven seal note, success on the ward page", surface: "--faction-coven-ward-page", text: "--color-success" },
  { what: "wow seal note, success on the lists ground", surface: "--faction-wow-duel-lists-bg", text: "--color-success" },
  { what: "everymen seal note, success on the paper", surface: "--everymen-paper", text: "--color-success" },
  { what: "snide seal note, acid on the halftone", surface: "--faction-snide-ink", text: "--faction-snide-acid" },

  // The stakes panel is a SECOND sheet where the shared slots land, so inks are
  // re-measured there (WORLD_ZERO_STYLE §3). Gates "sealed" and the win figure.
  { what: "coven seal stakes panel, credit ink", surface: "--faction-coven-ward-card", text: "--color-success" },
  { what: "wow seal stakes plate, credit ink", surface: "--faction-wow-chronicle-panel", text: "--color-success" },
  {
    // The terminal's green glass over the chassis — a veil.
    what: "singularity seal glass panel, credit ink",
    surface: "--faction-singularity-card-bg",
    veil: SEAL_GLASS_VEIL,
    text: "--faction-singularity-card-credit",
  },
  { what: "everymen seal stakes panel, credit ink", surface: "--everymen-paper-deep", text: "--color-success" },
  {
    // FORFEIT mode inverts Everymen's panel to ink; green is 1.88 there, so gold.
    what: "everymen seal stakes panel inverted, gold credit",
    surface: "--everymen-ink",
    text: "--everymen-gold",
  },
  { what: "snide seal stakes scrap, credit ink", surface: "--faction-snide-ink", text: "--faction-snide-card-credit" },
  // The panel cell is dark in both cascades (light success = 1.76), so it routes its own.
  { what: "ephemerists seal ledger band, credit ink", surface: "--faction-ephemerists-plate-inner", text: "--faction-ephemerists-card-credit" },
  { what: "ua seal stakes well, credit ink", surface: "--faction-ua-panel", text: "--color-success" },

  // ── STAKES PANEL MUTED INK (#1173) ──
  // `theme.muted` lands on the deeper stock (18px status lines, tile captions).
  // WOW and Everymen grew `-quiet` siblings for their panels; Ephemerists' panel
  // is `ephemerists panel cell, quiet ink`.
  { what: "wow seal stakes plate, quiet ink", surface: "--faction-wow-chronicle-panel", text: "--faction-wow-accent-deep" },
  { what: "everymen seal stakes panel, quiet ink", surface: "--everymen-paper-deep", text: "--everymen-quiet" },

  // The ZERO figure (0.0×, `eras/era_1.py`): 24px/700, AA_LARGE. Rows catch a repaint.
  {
    what: "default seal zero figure, large display type",
    surface: "--color-bg-page",
    text: "--color-danger",
    floor: AA_LARGE,
  },
  {
    what: "coven seal zero figure, large display type",
    surface: "--faction-coven-ward-card",
    text: "--color-danger",
    floor: AA_LARGE,
  },
  {
    what: "wow seal zero figure, large display type",
    surface: "--faction-wow-chronicle-panel",
    text: "--color-danger",
    floor: AA_LARGE,
  },
  {
    what: "singularity seal zero figure, large display type",
    surface: "--faction-singularity-card-bg",
    veil: SEAL_GLASS_VEIL,
    text: "--color-danger",
    floor: AA_LARGE,
  },
  {
    what: "everymen seal zero figure, large display type",
    surface: "--everymen-paper-deep",
    text: "--color-danger",
    floor: AA_LARGE,
  },
  {
    what: "everymen seal zero figure inverted, large display type",
    surface: "--everymen-ink",
    text: "--color-danger",
    floor: AA_LARGE,
  },
  {
    what: "snide seal zero figure, large display type",
    surface: "--faction-snide-ink",
    text: "--color-danger",
    floor: AA_LARGE,
  },
  {
    what: "ephemerists seal zero figure, large display type",
    surface: "--faction-ephemerists-plate-inner",
    text: "--color-danger",
    floor: AA_LARGE,
  },
  {
    what: "ua seal zero figure, large display type",
    surface: "--faction-ua-panel",
    text: "--color-danger",
    floor: AA_LARGE,
  },
  {
    // Singularity keeps danger as TEXT on its 24px heading (4.03 clears 3:1); the
    // 18px body took the notice ink.
    what: "singularity seal forfeit heading, large display type",
    surface: "--faction-singularity-card-bg",
    text: "--color-danger",
    floor: AA_LARGE,
  },

  // ── THE DANGER FILL (#1169, #1174) ──
  // `--color-danger` is an INK and a FILL; the fill had no named ink and every
  // pale token nearby failed somewhere (white 2.77 dark, bg-page 4.40 light,
  // translucent bg-surface 1.04 dark). `--color-on-danger` is that ink (#649/#924 shape).
  {
    what: "danger fill, on-danger ink",
    surface: "--color-danger",
    text: "--color-on-danger",
  },

  // ── EDIT-PRAXIS COMPOSERS (#1179) and FEED CHASSIS (#1192) ──
  //
  // THIS REGISTRY IS ASSERTED BOTH WAYS (listed = measured, unlisted = nothing),
  // so parallel branches drop each other's rows and `main` goes red after the
  // second squash. A wave touching these rows lands as ONE edit.
  //
  // Both put shared slots on a SECOND stock (`PraxisWaitingSurface` renders
  // body/quiet INSIDE `panelStyle`; feed frames paint global inks on a chassis),
  // so inks are re-measured (WORLD_ZERO_STYLE §3).
  //
  // UA and Ephemerists add nothing: their composers use already-measured token
  // sets. (Ephemerists' masthead is a `color-mix()` `parseColor` cannot read —
  // Part B's job.) Duplicates not written: snide acid cast bar = `snide seal
  // note, acid on the halftone`; snide pink scrap / everymen red button = their
  // `composer accent, on-accent`; wow plate prose = `wow seal stakes plate, quiet ink`.

  // na aurora sheet (#1181): the field is lighter by day / lifted by night, so
  // it is the tighter ground (`-composer-faint` was caught at 2.08).
  { what: "na composer field, ink", surface: "--faction-default-composer-field", text: "--faction-default-card-text" },
  { what: "na composer field, prose", surface: "--faction-default-composer-field", text: "--faction-default-card-muted" },
  { what: "na composer field, faint ink", surface: "--faction-default-composer-field", text: "--faction-default-composer-faint" },
  { what: "na composer sheet, faint ink", surface: "--faction-default-card-bg", text: "--faction-default-composer-faint" },
  // na paints its cast bar in its own INK, not an accent — not the ACCENT_PAIRS pair.
  { what: "na cast bar, on-accent", surface: "--faction-default-card-text", text: "--faction-default-on-accent" },

  // WOW writ (#1186): the plate's two unpaired inks. `-card-muted` is absent (see above).
  { what: "wow chronicle plate, ink", surface: "--faction-wow-chronicle-panel", text: "--faction-wow-card-text" },
  { what: "wow chronicle plate, label ink", surface: "--faction-wow-chronicle-panel", text: "--faction-wow-accent-deep" },

  // S.N.I.D.E. composer sheet (#1184): declared apart from `-note-*`/`-slip-*`,
  // so it gets its own rows.
  { what: "snide composer sheet, ink", surface: "--faction-snide-wall", text: "--faction-snide-composer-ink" },
  { what: "snide composer sheet, prose", surface: "--faction-snide-wall", text: "--faction-snide-composer-muted" },
  { what: "snide composer sheet, faint ink", surface: "--faction-snide-wall", text: "--faction-snide-composer-faint" },
  { what: "snide composer field, ink", surface: "--faction-snide-composer-field", text: "--faction-snide-composer-ink" },
  { what: "snide composer field, prose", surface: "--faction-snide-composer-field", text: "--faction-snide-composer-muted" },
  { what: "snide composer field, faint ink", surface: "--faction-snide-composer-field", text: "--faction-snide-composer-faint" },
  // Acid as TEXT on both stocks; bright acid is 1.35 on the light stock.
  { what: "snide composer field, acid caption", surface: "--faction-snide-composer-field", text: "--faction-snide-composer-acid-ink" },
  { what: "snide composer sheet, acid ink", surface: "--faction-snide-wall", text: "--faction-snide-composer-acid-ink" },
  // The masthead bar takes the press's invariant pigments.
  { what: "snide composer bar, stage word", surface: "--faction-snide-composer-bar", text: "--faction-snide-paper" },
  { what: "snide composer bar, wordmark", surface: "--faction-snide-composer-bar", text: "--faction-snide-acid" },

  // Everymen work order (#1187): typed areas mount on `-sheet-panel` because red
  // is 4.49 on `--everymen-paper`. That pair is never on screen, so no row.
  { what: "everymen sheet panel, ink", surface: "--faction-everymen-sheet-panel", text: "--everymen-paper-text" },
  { what: "everymen sheet panel, prose", surface: "--faction-everymen-sheet-panel", text: "--everymen-muted" },
  { what: "everymen sheet panel, red ink", surface: "--faction-everymen-sheet-panel", text: "--faction-everymen-sheet-accent" },

  // Singularity session (#1185) and feed chassis (#1201): always dark (§6).
  // `-term-panel` is the fields' ground and the chassis' `--color-bg-surface`.
  { what: "singularity terminal panel, ink", surface: "--faction-singularity-term-panel", text: "--faction-singularity-term-ink" },
  { what: "singularity terminal panel, title", surface: "--faction-singularity-term-panel", text: "--faction-singularity-term-bright" },
  { what: "singularity terminal panel, label", surface: "--faction-singularity-term-panel", text: "--faction-singularity-term-dim" },
  { what: "singularity terminal panel, level pill", surface: "--faction-singularity-term-panel", text: "--faction-singularity-term-blue" },
  // The composer's page ink and the feed row's body.
  { what: "singularity terminal chassis, prose", surface: "--faction-singularity-term-bg", text: "--faction-singularity-term-ink" },
  // The unit caption (`-dim`); this well is its tighter ground.
  { what: "singularity points well, caption", surface: "--faction-singularity-term-readout", text: "--faction-singularity-term-dim" },
  // The chassis remaps `--color-danger` to the notice ink; the actor name is a
  // `--faction-*` token `FeedRowSkin` carries. Rows, not prose ratios (#1252).
  { what: "singularity terminal chassis, alarm ink", surface: "--faction-singularity-term-bg", text: "--faction-singularity-card-notice" },
  { what: "singularity terminal chassis, actor name", surface: "--faction-singularity-term-bg", text: "--faction-singularity-card-accent" },

  // Coven composer (#1183): the new `-deep` ink and the cast band.
  { what: "coven ward panel, accent ink", surface: "--faction-coven-ward-card", text: "--faction-coven-slip-deep" },
  {
    // `-deep` on the ward page is 4.44 (ornament only, #1295) except the 24px
    // points numeral, so AA_LARGE.
    what: "coven ward page, points numeral, large display type",
    surface: "--faction-coven-ward-page",
    text: "--faction-coven-slip-deep",
    floor: AA_LARGE,
  },
  // The green cast band: both stops carry the label.
  { what: "coven cast band top", surface: "--faction-coven-cast-from", text: "--faction-coven-slip-cta-ink" },
  { what: "coven cast band foot", surface: "--faction-coven-cast-to", text: "--faction-coven-slip-cta-ink" },

  // S.N.I.D.E. intercepted slip (#1198), feed chassis and comment sheet. Flips,
  // so each row is two grounds.
  { what: "snide slip, ink", surface: "--faction-snide-slip-paper", text: "--faction-snide-slip-ink" },
  { what: "snide slip, byline", surface: "--faction-snide-slip-paper", text: "--faction-snide-composer-muted" },
  { what: "snide slip, faint ink", surface: "--faction-snide-slip-paper", text: "--faction-snide-slip-faint" },
  // The two poster colours walked down for their one job as TYPE.
  { what: "snide slip, mention ink", surface: "--faction-snide-slip-paper", text: "--faction-snide-slip-acid-ink" },
  // The editor input and first ransom scrap — the only scrap that flips.
  { what: "snide slip field, ink", surface: "--faction-snide-slip-field", text: "--faction-snide-slip-ink" },
  // Near-black in both themes, so the press's invariant pigments.
  { what: "snide slip intake bar, kicker", surface: "--faction-snide-slip-bar", text: "--faction-snide-paper" },
  { what: "snide slip intake bar, acid", surface: "--faction-snide-slip-bar", text: "--faction-snide-acid" },

  // Ephemerists feed plate (#1199): the band's declared second tier, and nile
  // on `-plate-bg`, a third stock.
  { what: "ephemerists cornice band, quiet ink", surface: "--faction-ephemerists-plate-band", text: "--faction-ephemerists-plate-band-quiet" },
  { what: "ephemerists plate, links", surface: "--faction-ephemerists-plate-bg", text: "--faction-ephemerists-plate-brass-light" },

  // Ephemerists edit-character tail plate (#2537): `EphemeristsEditCharacter`
  // mounts `characterPaths/editCharacterSlots`' slots on `-plate-bg`, the case
  // that file's `ponytail:` note says gets a row here. The alarm is drawn BARE;
  // the label/help tiers are global neutrals that must still clear here.
  { what: "ephemerists edit-character delete slot, alarm ink bare on the plate", surface: "--faction-ephemerists-plate-bg", text: "--faction-ephemerists-card-alarm" },
  { what: "ephemerists edit-character faction row label, on the plate", surface: "--faction-ephemerists-plate-bg", text: "--color-text-secondary" },
  { what: "ephemerists edit-character faction row help, on the plate", surface: "--faction-ephemerists-plate-bg", text: "--color-text-tertiary" },

  // Everymen dispatch slip (#1200): the tightest dark reading in the group, so
  // the band's dateline and chip print at full ink.
  { what: "everymen masthead band, ink", surface: "--everymen-red", text: "--everymen-masthead-text" },

  // ── COMPOSER ERROR BANNER, on all eight sheets (#1231) ──
  // ADR-0061 keeps the veil and edge neutral (#1169); the ground, and so the ink,
  // is faction-aware. The neutral ink missed AA on all eight in light under its
  // veil. Seven skins use existing `-card-alarm` (#1302 shape). S.N.I.D.E. mints
  // `--faction-snide-composer-alarm` (§6: its card is black in both themes, so
  // `-card-alarm` read 1.56 on the light sheet; own name per #1181). The veiled
  // reading is what gates.
  ...(
    [
      ["na", "--faction-default-card-bg", "--faction-default-card-alarm"],
      ["coven", "--faction-coven-ward-card", "--faction-coven-card-alarm"],
      ["ephemerists", "--faction-ephemerists-plate-bg", "--faction-ephemerists-card-alarm"],
      ["everymen", "--everymen-paper", "--faction-everymen-card-alarm"],
      ["singularity", "--faction-singularity-term-bg", "--faction-singularity-card-alarm"],
      ["snide", "--faction-snide-wall", "--faction-snide-composer-alarm"],
      ["ua", "--faction-ua-card-bg", "--faction-ua-card-alarm"],
      ["wow", "--faction-wow-card-bg", "--faction-wow-card-alarm"],
    ] as const
  ).map(([key, surface, text]) => ({
    what: `${key} composer error banner, alarm ink under the danger veil`,
    surface,
    veil: "--color-danger-veil" as Veil,
    text,
  })),

  // ── PRAXIS DETAIL ALARM MARKS, on all nine walls (#1451) ──
  // `praxisDetail/shared.tsx`'s five alarm slots sit on each skin's page ground
  // (ADR-0061). The wall is not `-card-bg`: four skins read it off a class
  // (`.eph-plate-sheet`, `.em-dispatch`, `.snd-detail-sheet`, `.wow-detail-field`);
  // S.N.I.D.E. gives both ramp ends; `na` covers Albescent (#1140). Neutrals
  // failed on all nine in light. Seven use `-card-alarm`/`-card-notice`;
  // S.N.I.D.E. mints `--faction-snide-wall-alarm` / `-wall-notice` (§6 again).
  ...(
    [
      ["na", "--faction-default-card-bg", "--faction-default-card"],
      ["coven", "--faction-coven-ward-page", "--faction-coven-card"],
      ["ephemerists", "--faction-ephemerists-plate-page", "--faction-ephemerists-card"],
      ["everymen", "--faction-everymen-sheet-panel", "--faction-everymen-card"],
      ["singularity", "--faction-singularity-term-bg", "--faction-singularity-card"],
      // Both ramp ends, against the wall-scoped mint.
      ["snide", "--faction-snide-wall", "--faction-snide-wall"],
      ["snide deep", "--faction-snide-wall-deep", "--faction-snide-wall"],
      ["ua", "--faction-ua-page", "--faction-ua-card"],
      ["wow", "--faction-wow-card-bg", "--faction-wow-card"],
    ] as const
  ).flatMap(([key, surface, family]) => [
    // The withdraw error and the forfeit trigger — bare on the wall.
    { what: `${key} praxis detail wall, alarm ink`, surface, text: `${family}-alarm` },
    // Filled with `--color-danger-veil` first; rule and wash stay neutral (ADR-0061).
    {
      what: `${key} praxis detail wall, alarm ink under the danger veil`,
      surface,
      veil: "--color-danger-veil" as Veil,
      text: `${family}-alarm`,
    },
    // The moderator's fail note, inside that banner.
    {
      what: `${key} praxis detail wall, notice ink under the danger veil`,
      surface,
      veil: "--color-danger-veil" as Veil,
      text: `${family}-notice`,
    },
  ]),

  // ── PRAXIS DETAIL NEUTRAL CHROME, over the frost (#1413) ──
  // `PraxisAdminBar` / `PraxisFlagBlock` are `.sidebar-card`, mounted bare on all
  // nine skins (ADR-0061), so global inks are RIGHT; the ground was wrong.
  // `--color-bg-surface` is ALPHA, so the frost is modelled as a veil. It paints
  // over a declared `--card-ground` and mounts wear `.card-on-page`, so nine rows
  // collapse to one ground; the structural half is asserted at the bottom.
  // `.btn-outline` (also frost) adds no row: its one bare-wall mount reads >= 9.76.
  ...[
    // `--color-text-primary` omitted: it only reaches here via `.btn-outline`'s own frost.
    ["danger", "--color-danger"],
    ["warning", "--color-warning"],
    ["success", "--color-success"],
    ["tertiary", "--color-text-tertiary"],
    ["secondary", "--color-text-secondary"],
  ].map(([role, text]) => ({
    what: `neutral card on the page ground, ${role} ink over the frost`,
    surface: "--color-bg-page",
    veil: "--color-bg-surface" as Veil,
    text,
  })),

  // ── NEUTRAL TEXT TIERS on the app's two stocks (#1549), at AAA (#1715) ──
  // The most-painted pairing in the repo. `--color-bg-surface-alt` is alpha in
  // dark, so it is a veil over the page. Tier separation is asserted at the bottom.
  // AAA, not AA: the tokens had settled onto the AA line. The alt surface gates
  // in both cascades (darker than page in light, lighter in dark).
  //
  // The filter grounds are AA rows (12px `--text-lg`): the tightest neutral
  // stocks (two washes of `--color-text-primary`). Secondary stays measured — the
  // rail thumb crosses it.
  ...(
    [
      ["secondary", "--color-text-secondary"],
      ["tertiary", "--color-text-tertiary"],
    ] as const
  ).flatMap(([role, text]) => [
    { what: `app page, ${role} ink`, surface: "--color-bg-page", text, floor: AAA_NORMAL },
    {
      what: `app alt surface, ${role} ink`,
      surface: "--color-bg-page",
      veil: "--color-bg-surface-alt" as Veil,
      text,
      floor: AAA_NORMAL,
    },
    // `--switch-well` is a `color-mix()` of `--color-text-primary` at 6% over the
    // page; `parseColor` cannot read color-mix, so it is a `{ token, alpha }` veil.
    {
      what: `filter well, ${role} ink`,
      surface: "--color-bg-page",
      veil: { token: "--color-text-primary", alpha: 0.06 } as Veil,
      text,
    },
    {
      what: `selected filter row, ${role} ink`,
      surface: "--color-bg-page",
      veil: [
        { token: "--color-text-primary", alpha: 0.06 },
        { token: "--color-text-primary", alpha: 0.1 },
      ] as Veil[],
      text,
    },
  ]),

  // ── FEED ROW ACTOR NAME, on four chassis (#1341) ──
  // `resolveFeedRowInk` defaults `actor` to the raw hue at 18px/700, which owes
  // 4.5. Snide, coven and ephemerists repoint to inks already measured on their
  // ground (`snide slip, mention ink`, `coven ward panel, accent ink`,
  // `ephemerists plate, links`). Everymen mints `--everymen-paper-accent` (no red
  // rung survives paper in both themes).
  { what: "everymen paper, actor name", surface: "--everymen-paper", text: "--everymen-paper-accent" },

  // ALBESCENT HAS NO ROWS (#2632): its reveal surfaces read
  // `--faction-default-card-*`; `__tests__/albescentPrismSheet.test.ts` holds the
  // rest. Per-site `color-mix()` inks are caught by
  // `pages/__tests__/albescentSealedInk.test.tsx`, which reads what the component emits.

  // ── Accents as TEXT on grounds that are not their fill (#1766) ──
  // The nightly sweep's rendered findings, at the value level. Fixed site by
  // site (owner ruling 2026-08-14). `--faction-default-gold` is a walked-down ink,
  // not `-stop-3` (2.94 on the plate). The white plate gates.
  { what: "na score plate, POINTS caption", surface: "--faction-default-stamp-bg", text: "--faction-default-gold" },
  { what: "na card sheet, points caption", surface: "--faction-default-card-bg", text: "--faction-default-gold" },
  // Singularity's roster readouts on a near-black terminal want the opposite
  // direction (no single value works), so `--faction-singularity-amber`; the row
  // stops the split being re-collapsed.
  { what: "singularity terminal, credits amber", surface: "--faction-singularity-card-bg", text: "--faction-singularity-amber" },
  // Field desk chits on the DEEP stock (red is 3.75): the family's third
  // (role, ground) split; see the token's own comment.
  { what: "everymen deep stock, accent ink", surface: "--everymen-paper-deep", text: "--everymen-deep-accent" },
  // Not rows: the "view all" link now takes `-paper-accent` (`everymen paper,
  // actor name`); UA's rank numeral (#1766) takes `-card-accent`, already in
  // ROLE_PAIRS — scope is guarded by the reader allowlist below.

  // ── TASK DETAIL WORTH CELL on its own ground (#2554) ──
  // Detail pages mount the registered `scoreStamp` on the panel's inner cell.
  // Seven add no row: default/wow/singularity/snide carry their own plate; coven's
  // cauldron and ephemerists' disc are measured; albescent's ring overrides the
  // cell (#2549). The two below have no ground of their own.
  {
    // The unfilled roundel lands on the sheet panel. Display type, AA_LARGE;
    // the 8px band and caption are stamp ornament (§4).
    what: "everymen task-detail worth cell, roundel numeral in display type",
    surface: "--faction-everymen-sheet-panel",
    text: "--everymen-red",
    floor: AA_LARGE,
  },
  {
    // UA's unfilled ensō: the detail cell is `-card-bg`, not its praxis sheet.
    what: "ua task-detail worth cell, ensō total in display type",
    surface: "--faction-ua-card-bg",
    text: "--faction-ua-card-total",
    floor: AA_LARGE,
  },
  {
    // `--text-md` body scale, so the full floor.
    what: "ua task-detail worth cell, ensō unit",
    surface: "--faction-ua-card-bg",
    text: "--faction-ua-card-points",
  },

  // Bands with a ground named for the band (#2635). The other five faction bands
  // are measured with their kits; Albescent/na at the foot. Kept so by
  // `the nine masthead bands stand on their own ground`.
  {
    // Both tokens are frozen, so one row covers both themes (4.59).
    // `-mast-ink`, not `--faction-ua-on-fill`: `-on-fill` flips with the fill and
    // read 3.52 by night on the frozen orange. A frozen ground needs a frozen ink.
    // The mark takes it too (`--faction-ua-glow` is 1.30 here; see `markColor`).
    what: "ua card masthead band, wordmark",
    surface: "--faction-ua-mast",
    text: "--faction-ua-mast-ink",
  },
  {
    // Coven's flips. Day values transcribe the CTA's `-cta-from` / `-cta-ink`
    // (index.css says why), so this and `coven slip CTA band top` share hexes on purpose.
    what: "coven card masthead band, wordmark",
    surface: "--faction-coven-mast",
    text: "--faction-coven-mast-ink",
  },
];

/**
 * #2698 stage 1 — codex colours whose only reader was a row here.
 *
 * The `--eph-*` colours had no `var()` reads or non-test references; rows and
 * declarations came out together. This guard fails if either half returns.
 * `--eph-display` / `--eph-serif` stay: the §3 font contract aliases them.
 */
const RETIRED_CODEX_COLOURS = [
  "--eph-field",
  "--eph-gold",
  "--eph-ink",
  "--eph-parchment",
  "--eph-vellum-text",
  "--eph-muted",
  "--eph-rubric",
  "--eph-vellum",
];

describe("the retired codex colours are gone from both cascades (#2698 stage 1)", () => {
  it.each(RETIRED_CODEX_COLOURS)("%s is declared in neither theme", (name) => {
    expect(THEMES.light.has(name), `light declares ${name}`).toBe(false);
    expect(THEMES.dark.has(name), `dark declares ${name}`).toBe(false);
  });

  it("no row measures one, so nothing makes them look alive again", () => {
    expect(
      PAIRS.filter(
        (pair) =>
          RETIRED_CODEX_COLOURS.includes(pair.surface) ||
          RETIRED_CODEX_COLOURS.includes(pair.text),
      ).map((pair) => pair.what),
    ).toEqual([]);
  });
});

/**
 * #2852 — the SELECTED "answer a calling" chip on `/characters/create`.
 *
 * Six archetypes repaint the chip to the host kit's fill and `FactionSigil`
 * takes that host's `onFill`. Each pair is already gated at its own site; this
 * re-reads it at the picker (the SITE is what is at risk). na's ground never
 * changes; Albescent offers no calling; UA's pair is ROLE_PAIRS'
 * `ua/sheet onFill on fill`. 1.4.11's 3:1: the sigil is a mark.
 */
const CALLING_CHIP_PAIRS: Pair[] = [
  {
    what: "wow calling chip, selected sigil",
    surface: "--faction-wow-plum-surface",
    text: "--faction-wow-on-plum",
    floor: AA_LARGE,
    nonText: "the calling chip's sigil is a drawn mark — 1.4.11's 3:1",
  },
  {
    what: "snide calling chip, selected sigil",
    surface: "--faction-snide-acid",
    text: "--faction-snide-ink",
    floor: AA_LARGE,
    nonText: "the calling chip's sigil is a drawn mark — 1.4.11's 3:1",
  },
  {
    what: "ephemerists calling chip, selected sigil",
    surface: "--faction-ephemerists-plate-cta-bg",
    text: "--faction-ephemerists-plate-cta-ink",
    floor: AA_LARGE,
    nonText: "the calling chip's sigil is a drawn mark — 1.4.11's 3:1",
  },
  {
    what: "everymen calling chip, selected sigil",
    surface: "--faction-everymen-bill-cta-bg",
    text: "--faction-everymen-bill-cta-ink",
    floor: AA_LARGE,
    nonText: "the calling chip's sigil is a drawn mark — 1.4.11's 3:1",
  },
  // Coven's ground is a two-stop gradient, so both stops get a row.
  {
    what: "coven calling chip, selected sigil (band top)",
    surface: "--faction-coven-slip-cta-from",
    text: "--faction-coven-slip-cta-ink",
    floor: AA_LARGE,
    nonText: "the calling chip's sigil is a drawn mark — 1.4.11's 3:1",
  },
  {
    what: "coven calling chip, selected sigil (band foot)",
    surface: "--faction-coven-slip-cta-to",
    text: "--faction-coven-slip-cta-ink",
    floor: AA_LARGE,
    nonText: "the calling chip's sigil is a drawn mark — 1.4.11's 3:1",
  },
  {
    what: "singularity calling chip, selected sigil",
    surface: "--faction-singularity-term-cta-bg",
    text: "--faction-singularity-term-cta-ink",
    floor: AA_LARGE,
    nonText: "the calling chip's sigil is a drawn mark — 1.4.11's 3:1",
  },
];

/**
 * THE SWITCH RING'S COMPLIANT EDGE (#2845) — not CALLING_CHIP_PAIRS; another site.
 *
 * The ring is the switch's only state signal (1.4.11, 3:1), and stops 3/4 of
 * `--faction-default-rainbow` read 2.37 / 2.66 on `--switch-well`. The wheel
 * may not move (#2845), and no well value fixes it (stop-3 caps at 2.94 even
 * on white). So `SettingsSwitch.tsx` draws an opaque `--color-text-tertiary`
 * hairline (`TRACK_RING_HAIRLINE`) inside the ring when ON; that edge clears
 * 3:1, making the rainbow decorative, so its stops are not measured.
 */
const SWITCH_RING_PAIRS: Pair[] = [
  {
    what: "switch ring hairline, on the switch well",
    surface: "--color-bg-page",
    veil: { token: "--color-text-primary", alpha: 0.06 },
    text: "--color-text-tertiary",
    floor: AA_LARGE,
    nonText: "the switch ring's compliant edge is a drawn line, not lettering — 1.4.11's 3:1 (#2845)",
  },
];

/**
 * THE LOCKED-ON SWITCH'S LOCK GLYPH (#2844) — a third site on the same control.
 *
 * `opacity: .45` cannot ship (stops fall under 3:1), so a lock glyph in the
 * thumb marks `checked && disabled`. Not `--switch-thumb-edge`: the glyph
 * contrasts only with the thumb (1.44 / 1.65). It uses `--color-text-tertiary`,
 * measured on the full page -> well -> thumb stack.
 */
const SWITCH_LOCK_GLYPH_PAIRS: Pair[] = [
  {
    what: "switch lock glyph, on the locked-on thumb",
    surface: "--color-bg-page",
    veil: [
      { token: "--color-text-primary", alpha: 0.06 }, // --switch-well
      { token: "--color-text-primary", alpha: 0.1 }, // --switch-thumb
    ],
    text: "--color-text-tertiary",
    floor: AA_LARGE,
    nonText: "the lock glyph is a drawn mark inside the thumb, not lettering — 1.4.11's 3:1 (#2844)",
  },
];

/**
 * NO ROW MEASURES A BARE FACTION HUE AS INK. Theme-correct is not legible:
 * light `--faction-wow` is 1.96:1 on the page. ROLE_PAIRS measures on-fill ON
 * the hue, not the hue as ink; the honest assertion is that nothing paints it
 * (`pages/players/__tests__/playersFactionInk.test.tsx`). A surface that paints
 * a dark ground needs its own ink and rows.
 */

/**
 * #2361 — the desktop rail's WELL. Rail inks are ROLE_PAIRS' `-card-*` on
 * `-card-bg`; `--rail-well` (EDIT pill, progress tracks) is the sheet's own ink
 * at 10% (`layout/Sidebar.tsx::railFaceVars`), which can only tighten the reading.
 *
 * Only the body ink is painted on it. `card-muted` here reads 3.94 (WOW) to
 * 4.31, so the quiet tier may not move onto the well without it thinning.
 *
 * `default` is absent: an unaffiliated/Albescent viewer declares no locals, so
 * their well is still `--color-bg-surface-alt`.
 */
const RAIL_WELL_ALPHA = 0.1;

// `snide` too: its rail is on the wall with `-note-*` inks (#2631), measured in
// this file's last block.
const RAIL_PAIRS: Pair[] = FILL_KEYS.filter((key) => key !== "default" && key !== "snide").map((key) => ({
  what: `${key} rail ink on the rail well`,
  surface: `--faction-${key}-card-bg`,
  veil: { token: `--faction-${key}-card-text`, alpha: RAIL_WELL_ALPHA },
  text: `--faction-${key}-card-text`,
}));

/**
 * THE METATASK SEAL'S CAPTION on nine bodies (#2648, owner ruling 2026-08-25).
 * Hand-curated because five seals do not stand on `-card-bg`. The caption was
 * once deleted unnoticed, so it gets a census. No new colour.
 */
const SEAL_CAPTION_PAIRS: Pair[] = [
  // ROLE_PAIRS measures this pairing generically; these name the SITE.
  { what: "albescent seal caption", surface: "--faction-default-card-bg", text: "--faction-default-card-muted" },
  { what: "na seal caption", surface: "--faction-default-card-bg", text: "--faction-default-card-muted" },
  // `CAPTION` in covenSlip.tsx.
  { what: "coven seal caption", surface: "--faction-coven-ward-card", text: "--faction-coven-slip-label" },
  // The caption sits on the plate, not the band.
  { what: "ephemerists seal caption", surface: "--faction-ephemerists-plate-bg", text: "--faction-ephemerists-plate-caption" },
  { what: "everymen seal caption", surface: "--everymen-paper", text: "--everymen-muted" },
  { what: "singularity seal caption", surface: "--faction-singularity-card-bg", text: "--faction-singularity-card-muted" },
  // The seal's slab is near-black in both cascades (#2173's rule is about paper).
  { what: "snide seal caption", surface: "--faction-snide-card-bg", text: "--faction-snide-acid" },
  // Darkest parchment stop (see `ua leaf darkest stop`).
  { what: "ua seal caption", surface: "--faction-ua-panel", text: "--faction-ua-card-accent" },
  { what: "wow seal caption", surface: "--faction-wow-chronicle-bg", text: "--faction-wow-card-accent" },
];

/**
 * THE ACCENT AS INK, ON THE PAGE (#2619; #2298 §2). One block, for #2698 to
 * relocate as a unit. Read out of the resolver: walking every slug also checks
 * `factionCssVar(slug, 'accent-ink')` answers for all nine (na/albescent dedupe
 * onto `default`, ADR-0039).
 *
 * Two grounds per token: the page, and the letter's perk box tint
 * (`--faction-{key}-light` over the page), which is always tighter — page-only,
 * four of eight would fail where they render.
 */
const ACCENT_INK_PAIRS: Pair[] = (() => {
  const rows: Pair[] = [];
  const seen = new Set<string>();
  for (const slug of ROLE_SLUGS) {
    const reference = factionCssVar(slug, "accent-ink");
    const token = reference.slice("var(".length, -1);
    if (seen.has(token)) continue;
    seen.add(token);
    rows.push(
      { what: `${slug} accent ink, on the page`, surface: "--color-bg-page", text: token },
      {
        // The perk box's own tint over the page (#2298 §2).
        what: `${slug} accent ink, on the letter's perk box`,
        surface: "--color-bg-page",
        veil: token.replace(/-accent-ink$/, "-light") as Veil,
        text: token,
      },
    );
  }
  return rows;
})();

/**
 * THE SEVEN INVITATION LETTERS (#3294): every text pairing, both cascades, at
 * 4.5 (3:1 at >= 24px). Nothing here is in `BASELINE`. Gradient/wash grounds
 * use the WORST stop. Aria-hidden glyphs have no row. Ratios: light / dark at landing.
 */
const INVITATION_LETTER_PAIRS: Pair[] = [
  // ── UA ── darkest parchment stop, `-panel`.
  { what: "ua invitation letter, headline and perk desc on parchment", surface: "--faction-ua-panel", text: "--faction-ua-card-text" }, // 11.32 / 12.28
  { what: "ua invitation letter, pitch, dismiss and confirm prose on parchment", surface: "--faction-ua-panel", text: "--faction-ua-card-muted" }, // 5.13 / 5.10
  { what: "ua invitation letter, mechanic name on parchment", surface: "--faction-ua-panel", text: "--faction-ua-card-accent" }, // 4.88 / 5.95
  { what: "ua invitation letter, wordmark on band", surface: "--faction-ua-mast", text: "--faction-ua-mast-ink" }, // 4.59 / 4.59
  { what: "ua invitation letter, CTA label on CTA fill", surface: "--faction-ua-card-chip-bg", text: "--faction-ua-card-chip-ink" }, // 4.59 / 5.35
  { what: "ua invitation letter, confirm error on parchment", surface: "--faction-ua-panel", text: "--faction-ua-card-alarm" }, // 6.45 / 7.85

  // ── S.N.I.D.E. ── the acid and pink corners were the worst stops.
  { what: "snide invitation letter, headline and mechanic desc on wall", surface: "--faction-snide-wall", text: "--faction-snide-note-ink" }, // worst 13.32 / 14.02
  { what: "snide invitation letter, pitch, flavour perks, dismiss, confirm prose on wall", surface: "--faction-snide-wall", text: "--faction-snide-note-muted" }, // worst 6.26 / 9.91
  { what: "snide invitation letter, confirm error on wall", surface: "--faction-snide-wall", text: "--faction-snide-wall-alarm" }, // worst 5.57 / 5.93
  { what: "snide invitation letter, mechanic name on knockout label", surface: "--faction-snide-note-knockout-bg", text: "--faction-snide-note-knockout-ink" }, // 16.68 / 16.68
  { what: "snide invitation letter, masthead wordmark and CTA label on ink band", surface: "--faction-snide-note-bar", text: "--faction-snide-acid" }, // 15.55 / 16.32
  { what: "snide invitation letter, headline cut on acid scrap", surface: "--faction-snide-acid", text: "--faction-snide-note-cta-ink" }, // 15.55 / 15.55

  // ── WoW ──
  { what: "wow invitation letter, headline and flavour perks on cream", surface: "--faction-wow-chronicle-bg", text: "--faction-wow-card-text" }, // 14.02 / 14.72
  { what: "wow invitation letter, pitch, dismiss and confirm prose on cream", surface: "--faction-wow-chronicle-bg", text: "--faction-wow-card-muted" }, // 5.32 / 8.83
  { what: "wow invitation letter, mechanic name on plaque", surface: "--faction-wow-chronicle-panel", text: "--faction-wow-card-accent" }, // 5.16 / 6.89
  { what: "wow invitation letter, mechanic desc on plaque", surface: "--faction-wow-chronicle-panel", text: "--faction-wow-card-text" }, // 12.49 / 12.77
  { what: "wow invitation letter, confirm error on cream", surface: "--faction-wow-chronicle-bg", text: "--faction-wow-card-alarm" }, // 7.57 / 9.56
  { what: "wow invitation letter, CTA label on plum", surface: "--faction-wow-plum-surface", text: "--faction-wow-on-plum" }, // 5.16 / 5.16
  // 24px MedievalSharp wordmark: large type, 3:1.
  { what: "wow invitation letter, band wordmark gilt on plum (24px display type)", surface: "--faction-wow-plum-surface", text: "--faction-wow-gilt-mid", floor: AA_LARGE }, // 3.47 / 3.40

  // ── Coven ── `-slip-mid`, the weakest slip stop.
  { what: "coven invitation letter, headline on slip", surface: "--faction-coven-slip-mid", text: "--faction-coven-slip-ink" }, // 5.46 / 7.99
  { what: "coven invitation letter, pitch and confirm prose on slip", surface: "--faction-coven-slip-mid", text: "--faction-coven-slip-soft" }, // 4.66 / 4.62
  { what: "coven invitation letter, dismiss on slip", surface: "--faction-coven-slip-mid", text: "--faction-coven-slip-label" }, // 4.61 / 4.79
  { what: "coven invitation letter, confirm error on slip", surface: "--faction-coven-slip-mid", text: "--faction-coven-card-notice" }, // 4.74 / 6.64
  { what: "coven invitation letter, perk desc on charm box", surface: "--faction-coven-ward-card", text: "--faction-coven-slip-soft" }, // 6.58 / 7.39
  { what: "coven invitation letter, mechanic name on charm box", surface: "--faction-coven-ward-card", text: "--faction-coven-slip-label" }, // 6.50 / 7.67
  { what: "coven invitation letter, CTA label on fill start", surface: "--faction-coven-slip-cta-from", text: "--faction-coven-slip-cta-ink" }, // 4.98 / 6.69
  { what: "coven invitation letter, CTA label on fill end", surface: "--faction-coven-slip-cta-to", text: "--faction-coven-slip-cta-ink" }, // 6.21 / 9.77
  { what: "coven invitation letter, wordmark on band", surface: "--faction-coven-mast", text: "--faction-coven-mast-ink" }, // 4.54 / 13.69

  // ── Everymen ──
  { what: "everymen invitation letter, headline, perk desc and confirm prose on paper", surface: "--everymen-paper", text: "--everymen-paper-text" }, // 13.19 / 13.96
  { what: "everymen invitation letter, pitch on paper", surface: "--everymen-paper", text: "--everymen-muted" }, // 5.09 / 6.76
  { what: "everymen invitation letter, dismiss label on paper", surface: "--everymen-paper", text: "--everymen-quiet" }, // 5.71 / 6.76
  { what: "everymen invitation letter, mechanic name and confirm error on paper", surface: "--everymen-paper", text: "--faction-everymen-card-notice" }, // 5.45 / 10.25
  // 24px Bebas roll numerals: 3:1. Red as ink on paper is 4.49 / 4.16.
  { what: "everymen invitation letter, roll numerals on paper (24px display type)", surface: "--everymen-paper", text: "--everymen-red", floor: AA_LARGE }, // 4.49 / 4.16
  { what: "everymen invitation letter, band wordmark on red mast", surface: "--faction-everymen-bill-mast", text: "--faction-everymen-bill-mast-ink" }, // 4.95 / 4.95
  { what: "everymen invitation letter, CTA label on CTA fill", surface: "--faction-everymen-bill-cta-bg", text: "--faction-everymen-bill-cta-ink" }, // 14.55 / 15.32

  // ── Ephemerists ──
  { what: "ephemerists invitation letter, headline and perk on ground", surface: "--faction-ephemerists-plate-bg", text: "--faction-ephemerists-plate-ink" }, // 13.37 / 13.91
  { what: "ephemerists invitation letter, pitch and confirm prose", surface: "--faction-ephemerists-plate-bg", text: "--faction-ephemerists-plate-muted" }, // 7.35 / 5.98
  { what: "ephemerists invitation letter, dismiss label", surface: "--faction-ephemerists-plate-bg", text: "--faction-ephemerists-plate-quiet" }, // 7.35 / 5.98
  { what: "ephemerists invitation letter, confirm error", surface: "--faction-ephemerists-plate-bg", text: "--faction-ephemerists-card-notice" }, // 6.66 / 10.38
  { what: "ephemerists invitation letter, perk desc on perk box", surface: "--faction-ephemerists-plate-inner", text: "--faction-ephemerists-plate-ink" }, // 14.93 / 12.84
  { what: "ephemerists invitation letter, mechanic name on perk box", surface: "--faction-ephemerists-plate-inner", text: "--faction-ephemerists-plate-ochre" }, // 4.98 / 4.99
  { what: "ephemerists invitation letter, CTA label", surface: "--faction-ephemerists-plate-cta-bg", text: "--faction-ephemerists-plate-cta-ink" }, // 7.59 / 7.59
  { what: "ephemerists invitation letter, masthead wordmark", surface: "--faction-ephemerists-plate-disc", text: "--faction-ephemerists-plate-band-ink" }, // 7.59 / 7.59

  // ── Singularity ── always dark; flat `-term-bg` (raster and sweep not composited).
  { what: "singularity invitation letter, headline on ground", surface: "--faction-singularity-term-bg", text: "--faction-singularity-term-bright" }, // 10.88 / 13.87
  { what: "singularity invitation letter, pitch and confirm prose on ground", surface: "--faction-singularity-term-bg", text: "--faction-singularity-term-ink" }, // 8.32 / 11.18
  { what: "singularity invitation letter, perk desc on panel", surface: "--faction-singularity-term-panel", text: "--faction-singularity-term-ink" }, // 7.81 / 10.73
  { what: "singularity invitation letter, mechanic name on panel", surface: "--faction-singularity-term-panel", text: "--faction-singularity-term-bright" }, // 10.22 / 13.31
  { what: "singularity invitation letter, [!!] glyph on panel", surface: "--faction-singularity-term-panel", text: "--faction-singularity-card-notice" }, // 10.66 / 11.20
  { what: "singularity invitation letter, confirm error on ground", surface: "--faction-singularity-term-bg", text: "--faction-singularity-card-notice" }, // 11.36 / 11.67
  { what: "singularity invitation letter, dismiss label on ground", surface: "--faction-singularity-term-bg", text: "--faction-singularity-term-dim" }, // 5.03 / 5.80
  { what: "singularity invitation letter, > prompt on ground", surface: "--faction-singularity-term-bg", text: "--faction-singularity-term-blue" }, // 5.05 / 7.66
  { what: "singularity invitation letter, CTA label on CTA fill", surface: "--faction-singularity-term-cta-bg", text: "--faction-singularity-term-cta-ink" }, // 11.00 / 11.00
  { what: "singularity invitation letter, masthead wordmark on band", surface: "--faction-singularity-term-chrome", text: "--faction-singularity-term-dim" }, // 4.72 / 5.56
];

const PAIRS: Pair[] = [
  ...ROLE_PAIRS,
  ...ACCENT_INK_PAIRS,
  ...SEAL_CAPTION_PAIRS,
  ...ACCENT_PAIRS,
  ...ROSTER_PAIRS,
  ...COLLAB_PAIRS,
  ...PRAXIS_CARD_PAIRS,
  ...SNIDE_WALL_PAIRS,
  ...ARCHETYPE_PAIRS,
  ...INVITATION_LETTER_PAIRS,
  ...RAIL_PAIRS,
  ...CALLING_CHIP_PAIRS,
  ...SWITCH_RING_PAIRS,
  ...SWITCH_LOCK_GLYPH_PAIRS,
];

/**
 * Part C — the baseline allowlist (the ratchet), mirroring `no-raw-style-values`.
 *
 * **This list only ever shrinks.** Fixing a token means DELETING its line; an
 * allowlisted pair that starts passing fails on purpose. Never add a line for
 * new work. `ratio` is as measured at landing; `issue` owns the fix (`651` =
 * found by the sweep, awaiting triage).
 */
const BASELINE: Record<string, { ratio: number; issue: number }> = {
  // ── Found by the sweep, awaiting triage (#651) ──
  // Card accents used as metadata text (§3: "metadata / decorative accent").
  "light | everymen/sheet accent on paper": { ratio: 4.49, issue: 651 },
  "light | coven/sheet accent on paper": { ratio: 2.81, issue: 651 },
  "dark | everymen/sheet accent on paper": { ratio: 4.16, issue: 651 },
  // The vermilion entry below survives only while the `--eph-*` family is
  // declared; delete it with the family rather than fixing it.
  //
  // HAIRLINE RULING (#2668, owner 2026-08-27): a card bringing its own stock is
  // NOT exempt — in dark no faction stock separates from the page (1.03–1.09).
  // A faction hairline is load-bearing, all nine, both cascades, 3:1.
};

function key(theme: Theme, pair: Pair): string {
  return `${theme} | ${pair.what}`;
}

function resolveColor(name: string, theme: Theme) {
  const raw = resolveVar(name, theme, THEMES);
  return { raw, color: raw === null ? null : parseColor(raw) };
}

/**
 * The stylesheet as text, and one rule out of it. Source assertions at the
 * bottom (#1413, #1307) guard structural bugs every ratio stays green through.
 */
const CSS_TEXT = readIndexCss();

function ruleBody(selector: string): string {
  const at = CSS_TEXT.indexOf(`${selector} {`);
  expect(at, `index.css declares no \`${selector}\` rule`).toBeGreaterThan(-1);
  return CSS_TEXT.slice(at, CSS_TEXT.indexOf("}", at));
}

/**
 * A component's source with every role read folded to the token the map names
 * (#2659), so guards hunting tokens in source cannot silently stop resolving
 * and report a file CLEANER than it is.
 */
function sourceOf(relative: string): string {
  return resolveRoleReads(
    readFileSync(fileURLToPath(new URL(`../../${relative}`, import.meta.url)), "utf8"),
  );
}

/**
 * A ROLE READ, as a regex fragment around a hunted token: lanes (#2649) write
 * `var(--snd-desk-paper, var(--faction-snide-card-bg))`, and a guard that
 * misses the new spelling silently narrows.
 *
 * Measuring the fallback is valid because these surfaces are on `sheet`, where
 * the map points at the same token; `factionRoleMigration.test.ts` re-derives
 * every fallback and fails on drift. A `chrome` surface would break that.
 */
const ROLE_READ = String.raw`(?:var\(\s*--[\w-]+\s*,\s*)?`;

/** Closes {@link ROLE_READ}. Separate because the token sits between them. */
const ROLE_READ_END = String.raw`\)?`;

/**
 * `dress.pageStyle` out of `EphemeristsEditPraxis` — the second Ephemerists
 * root, carrying two seams (#1636, #1800). One reader for the slice.
 */
function ephemeristsComposerPageStyle(): string {
  const source = sourceOf("pages/editPraxis/archetypes/EphemeristsEditPraxis.tsx");
  // `sheetStyle` is the next key in the dress literal, and is the boundary.
  return source.slice(source.indexOf("pageStyle: {"), source.indexOf("sheetStyle,"));
}

describe("faction token contrast (WCAG AA)", () => {
  for (const theme of BOTH_THEMES) {
    describe(theme, () => {
      for (const pair of PAIRS) {
        it(`${pair.what} clears AA`, () => {
          const surface = resolveColor(pair.surface, theme);
          const text = resolveColor(pair.text, theme);

          // Fail loudly, never skip: an unresolvable token is a silent audit hole.
          expect(surface.color, `${pair.surface} (${theme}) resolved to "${surface.raw}" — not a solid color`).not.toBeNull();
          expect(text.color, `${pair.text} (${theme}) resolved to "${text.raw}" — not a solid color`).not.toBeNull();
          expect(surface.color!.a, `${pair.surface} is a surface — it must be opaque`).toBe(1);

          // The veil composites onto the surface first: measure what a viewer sees.
          let ground = surface.color!;
          for (const layer of pair.veil === undefined ? [] : [pair.veil].flat()) {
            // Token-at-alpha = `color-mix(in srgb, <token> N%, transparent)`. See `Veil`.
            const name = typeof layer === "string" ? layer : layer.token;
            const alpha = typeof layer === "string" ? 1 : layer.alpha;
            const spec = name.startsWith("--") ? resolveColor(name, theme).raw : name;
            const parsed = spec === null ? null : parseColor(spec);
            expect(parsed, `veil "${name}" (${pair.what}) is not a solid color`).not.toBeNull();
            ground = compositeOver({ ...parsed!, a: parsed!.a * alpha }, ground);
          }

          const floor = pair.floor ?? AA_NORMAL;
          const ratio = contrastRatio(text.color!, ground);
          const allowed = BASELINE[key(theme, pair)];

          if (allowed) {
            expect(
              ratio,
              `${key(theme, pair)} now measures ${formatRatio(ratio)} and clears AA — delete its BASELINE entry (owned by #${allowed.issue}).`,
            ).toBeLessThan(floor);
            expect(
              ratio,
              `${key(theme, pair)} measures ${formatRatio(ratio)} but its BASELINE entry records ${allowed.ratio} — update the entry so the debt list stays honest.`,
            ).toBeCloseTo(allowed.ratio, 1);
            return;
          }

          expect(
            ratio,
            `${key(theme, pair)}: ${pair.text} (${text.raw}) on ${pair.surface} (${surface.raw}) = ${formatRatio(ratio)}, needs ${floor}:1.`,
          ).toBeGreaterThanOrEqual(floor);
        });
      }
    });
  }

  it("has no stale baseline entries", () => {
    const live = new Set(BOTH_THEMES.flatMap((theme) => PAIRS.map((pair) => key(theme, pair))));
    const stale = Object.keys(BASELINE).filter((entry) => !live.has(entry));
    expect(stale, "BASELINE names a pair the manifest no longer measures").toEqual([]);
  });

  it("uses the 3:1 floor only for large display type or a stated non-text mark", () => {
    // 3:1 has two lawful reasons: 1.4.3 large type (the label says so) and
    // 1.4.11 non-text (`nonText` says so, #2661). Anything else is laundering.
    const large = PAIRS.filter((pair) => pair.floor === AA_LARGE);
    const unexplained = large.filter(
      (pair) => !pair.what.includes("display") && !pair.nonText,
    );
    expect(unexplained.map((pair) => pair.what)).toEqual([]);
  });

  /**
   * An empty cross-product passes vacuously (#2661), so its shape is asserted:
   * nine slugs, two grounds, five pairings, both cascades.
   */
  describe("the enumeration is the whole finite space (#2661)", () => {
    it("walks nine slugs, two grounds and both cascades", () => {
      expect(ROLE_SLUGS).toHaveLength(9);
      expect(ROLE_SLUGS).toEqual(expect.arrayContaining([UNAFFILIATED_FACTION_SLUG, ALBESCENT_FACTION_SLUG]));
      expect(FACTION_GROUNDS.length).toBe(2);
      expect(BOTH_THEMES).toHaveLength(2);
      expect(ROLE_TUPLES).toHaveLength(
        ROLE_SLUGS.length * FACTION_GROUNDS.length * ROLE_PAIRINGS.length,
      );
    });

    it("measures every colour role the vocabulary has", () => {
      // A new role must be measured, a surface, or typed out as not a colour.
      const accounted = new Set<FactionRole>([
        ...ROLE_PAIRINGS.map((pairing) => pairing.text),
        ...ROLE_GROUNDS,
        ...ROLE_NOT_COLOUR,
      ]);
      expect(
        FACTION_ROLES.filter((role) => !accounted.has(role)),
        "a role in the vocabulary is neither measured, nor a ground, nor declared non-colour",
      ).toEqual([]);
      // A ground role is only ever `on:`, never `text:`.
      expect(ROLE_PAIRINGS.filter((pairing) => ROLE_NOT_COLOUR.includes(pairing.on))).toEqual([]);
    });

    it("collapses only exact duplicates of one token pair", () => {
      const ids = ROLE_PAIRS.map((pair) => `${pair.surface} | ${pair.text} | ${pair.floor}`);
      expect(new Set(ids).size).toBe(ids.length);
      // Every enumerated tuple resolved onto a kept row.
      const kept = new Set(ids);
      for (const { slug, ground, pairing } of ROLE_TUPLES) {
        const id = `${roleToken(slug, pairing.on, ground)} | ${roleToken(slug, pairing.text, ground)} | ${pairing.floor}`;
        expect(kept.has(id), `${slug}/${ground} ${pairing.text} on ${pairing.on} was enumerated and then dropped`).toBe(true);
      }
    });
  });

  /**
   * #2668 — the hairline per SLUG, not per deduped token pair: under dedup
   * albescent has no row and a slug leaving `ROLE_SLUGS` would vanish silently.
   * Eighteen readings is the acceptance criterion. Same resolver as the rows, and
   * row existence is asserted. Authored half; moves with #2698.
   */
  describe("every faction answers for its hairline, all nine, both cascades (#2668)", () => {
    const HAIRLINE = ROLE_PAIRINGS.find(
      (pairing) => pairing.text === "line" && pairing.on === "paper",
    );

    it("the vocabulary still asks the hairline question", () => {
      expect(
        HAIRLINE,
        "`line` on `paper` left ROLE_PAIRINGS — #2668's eighteen readings would go unmeasured",
      ).toBeDefined();
      // 1.4.11's graphical-object floor, not 1.4.3's large-type allowance.
      expect(HAIRLINE?.floor).toBe(AA_LARGE);
    });

    for (const theme of BOTH_THEMES) {
      for (const slug of ROLE_SLUGS) {
        it(`${slug} draws a 3:1 rule on its own paper (${theme})`, () => {
          for (const ground of FACTION_GROUNDS) {
            const line = roleToken(slug, "line", ground);
            const paper = roleToken(slug, "paper", ground);
            expect(
              ROLE_PAIRS.some(
                (pair) => pair.surface === paper && pair.text === line && pair.floor === AA_LARGE,
              ),
              `${slug}/${ground}'s hairline resolves to a pair the loop never enumerated`,
            ).toBe(true);

            const surface = resolveColor(paper, theme);
            const text = resolveColor(line, theme);
            expect(surface.color, `${paper} (${theme}) resolved to "${surface.raw}"`).not.toBeNull();
            expect(text.color, `${line} (${theme}) resolved to "${text.raw}"`).not.toBeNull();
            expect(surface.color!.a, `${paper} is a surface — it must be opaque`).toBe(1);

            const ratio = contrastRatio(text.color!, surface.color!);
            expect(
              ratio,
              `${theme} | ${slug}/${ground}: ${line} (${text.raw}) on ${paper} (${surface.raw}) = ${formatRatio(ratio)}, needs ${AA_LARGE}:1.`,
            ).toBeGreaterThanOrEqual(AA_LARGE);
          }
        });
      }
    }
  });
});

/**
 * #1449 — alarm and notice are TWO HUES on every sheet. Contrast maths knows
 * what an ink sits on, never what it sits BESIDE; without this,
 * `-card-alarm: var(-card-notice)` would collapse them with every ratio green.
 *
 * ponytail: catches only one value doing both roles, not two indistinguishable
 * reds. Upgrade: a hue-distance floor, when a repaint walks them together.
 */
describe("the card sheet's alarm and notice inks stay apart (#1449)", () => {
  for (const theme of BOTH_THEMES) {
    for (const cardKey of CARD_KEYS) {
      it(`${cardKey} card alarm is not card notice (${theme})`, () => {
        const alarm = resolveColor(`--faction-${cardKey}-card-alarm`, theme);
        const notice = resolveColor(`--faction-${cardKey}-card-notice`, theme);
        expect(
          alarm.color,
          `--faction-${cardKey}-card-alarm (${theme}) resolved to "${alarm.raw}" — the alarm role needs a declared ink on every sheet.`,
        ).not.toBeNull();
        expect(notice.color, `--faction-${cardKey}-card-notice (${theme}) resolved to "${notice.raw}"`).not.toBeNull();
        expect(
          alarm.raw,
          `${cardKey} (${theme}) prints the destructive and the cautionary mark in one colour — that is the collapse #1449 undid.`,
        ).not.toBe(notice.raw);
      });
    }
  }

  // The S.N.I.D.E. wall pair (#1451) owes the same non-ratio assertion.
  for (const theme of BOTH_THEMES) {
    it(`snide wall alarm is not wall notice (${theme})`, () => {
      const alarm = resolveColor("--faction-snide-wall-alarm", theme);
      const notice = resolveColor("--faction-snide-wall-notice", theme);
      expect(alarm.color, `--faction-snide-wall-alarm (${theme}) resolved to "${alarm.raw}"`).not.toBeNull();
      expect(notice.color, `--faction-snide-wall-notice (${theme}) resolved to "${notice.raw}"`).not.toBeNull();
      expect(
        alarm.raw,
        `snide (${theme}) prints the destructive and the cautionary mark on the wall in one colour.`,
      ).not.toBe(notice.raw);
    });
  }
});

/**
 * #1549 — the neutral text vocabulary is THREE inks. Secondary and tertiary
 * were ΔE 3.4 apart in light: legible and indistinguishable, invisible to
 * every ratio. A distance, not a ratio gap: the third tier is a TEMPERATURE.
 *
 * Since #1715's lift, dark primary/secondary sit at ΔE 20.7 against this
 * floor of 20 (~1 L* left); the next lift has to move primary. The floor is
 * not set just under today's values, so re-tunes don't become test edits.
 *
 * ponytail: CIE76 under-reports near-neutral hue swings (safe direction).
 * Swap in CIEDE2000 if a legitimate palette trips it — do not lower the number.
 */
describe("the neutral text tiers stay three inks (#1549)", () => {
  const TIER_DELTA_E = 20;
  const TIERS = ["--color-text-primary", "--color-text-secondary", "--color-text-tertiary"] as const;

  for (const theme of BOTH_THEMES) {
    for (let index = 0; index < TIERS.length; index += 1) {
      for (let other = index + 1; other < TIERS.length; other += 1) {
        const [first, second] = [TIERS[index], TIERS[other]];
        it(`${first} is not ${second} (${theme})`, () => {
          const one = resolveColor(first, theme);
          const two = resolveColor(second, theme);
          expect(one.color, `${first} (${theme}) resolved to "${one.raw}"`).not.toBeNull();
          expect(two.color, `${second} (${theme}) resolved to "${two.raw}"`).not.toBeNull();

          const distance = deltaE76(one.color!, two.color!);
          expect(
            distance,
            `${first} (${one.raw}) and ${second} (${two.raw}) are ΔE ${distance.toFixed(1)} apart in ${theme}, ` +
              `under the ${TIER_DELTA_E} floor. Two tiers a viewer cannot tell apart are one tier with two names — ` +
              "that is #1549, and every ratio in this file stays green through it.",
          ).toBeGreaterThanOrEqual(TIER_DELTA_E);
        });
      }
    }
  }
});

/**
 * #1413 — a translucent surface is not a ground. `--color-bg-surface` is alpha,
 * so `.sidebar-card` took whatever it was mounted on (danger read 2.54 on
 * Singularity). The frost is a background IMAGE over a declared
 * `--card-ground`; unset it is `transparent`, i.e. today's render.
 *
 * ponytail: reads declaration text, so it pins the mechanism, not the render;
 * `e2e/contrast.spec.ts` measures the real composite.
 */
describe("the frost is a layer, not a ground (#1413)", () => {
  for (const theme of BOTH_THEMES) {
    it(`--color-bg-surface is alpha in ${theme}, which is why it cannot be a Pair surface`, () => {
      const surface = resolveColor("--color-bg-surface", theme);
      expect(surface.color, `--color-bg-surface (${theme}) is "${surface.raw}"`).not.toBeNull();
      expect(
        surface.color!.a,
        "if this token ever goes opaque, the two-layer shape below can collapse back to a plain `background`.",
      ).toBeLessThan(1);
    });
  }

  it(".sidebar-card paints the frost over a named ground", () => {
    const body = ruleBody(".sidebar-card");
    expect(
      body,
      ".sidebar-card must name the stock it composites onto — `background: var(--color-bg-surface)` leaves that to the mount, which is #1413.",
    ).toContain("background-color: var(--card-ground");
    expect(
      body,
      "the frost has to be a background IMAGE, or the ground declaration replaces it instead of sitting under it.",
    ).toContain("background-image: linear-gradient(var(--color-bg-surface)");
  });

  it("the neutral-chrome ground is the app's page, the one its inks were measured on", () => {
    expect(
      ruleBody(".card-on-page"),
      "`.card-on-page` is what the praxis detail's steward bar and report card wear (#1118: a block whose ink you do not control gets the stock that ink was measured on).",
    ).toContain("--card-ground: var(--color-bg-page)");
  });

  /**
   * #1606 — same promise, second property: `.eyebrow`'s tiers read the
   * `--label-ink` seam a faction root sets, and ADR-0061 mounts neutral chrome
   * BARE in that root, so the chrome must pin the app's own label ink.
   */
  it("the neutral chrome keeps the app's own label ink too (#1606)", () => {
    expect(
      ruleBody(".card-on-page"),
      "`.card-on-page` must pin `--label-ink` back to the neutral. Without it, the first faction frame to repoint the seam tints the praxis detail's steward bar and report card — which ADR-0061 mounts bare on nine walls precisely so moderation chrome reads the same everywhere.",
    ).toContain("--label-ink: var(--color-text-tertiary)");
  });
});

/**
 * #1307 — the label tier is TWO tiers and its ink is a SEAM. No new `Pair`
 * rows: both tiers (11/12px) owe 4.5; `--color-text-tertiary` clears the app
 * stocks (#1549) but no light neutral clears the always-dark sheets
 * (S.N.I.D.E., Singularity, Ephemerists plate) — #694's shape. The frame points
 * `--label-ink` at its `-card-muted`, already gated, so nothing is minted (as #1302).
 *
 * What is left is structural: a `.label-caption` hardcoding tertiary, or
 * returning to uppercase 0.15em tracking (`.eyebrow` again), stays green on
 * every ratio.
 */
describe("the label tier stays two tiers on one seam (#1307)", () => {
  for (const selector of [".label-heading", ".label-caption"]) {
    it(`${selector} paints the seam, not a hardcoded neutral`, () => {
      expect(
        ruleBody(selector),
        `${selector} must read \`var(--label-ink)\`. Hardcoding the neutral is invisible to every ratio in this file and leaves S.N.I.D.E. (2.19:1), Singularity (2.27:1) and the Ephemerists plate (2.01:1) in light with no way to fix their own sheet.`,
      ).toContain("color: var(--label-ink)");
    });
  }

  for (const theme of BOTH_THEMES) {
    it(`--label-ink unset is the measured neutral (${theme})`, () => {
      const seam = resolveColor("--label-ink", theme);
      const neutral = resolveColor("--color-text-tertiary", theme);
      expect(seam.color, `--label-ink (${theme}) resolved to "${seam.raw}"`).not.toBeNull();
      expect(
        seam.raw,
        "a label outside a faction frame must render what `.eyebrow` renders today — that is what makes the sweeps a size-and-casing change rather than a repaint.",
      ).toBe(neutral.raw);
    });
  }

  it("the caption tier does not collapse back into the heading tier", () => {
    const caption = ruleBody(".label-caption");
    expect(
      caption,
      "the caption is normal-case on purpose: uppercase removes the ascender/descender shape that carries word recognition, and dropping it is the LARGER half of #1307's legibility fix.",
    ).not.toContain("text-transform: uppercase");
    expect(
      caption,
      "the caption carries no tracking: 0.15em works against reading the run as a word, which is why `.eyebrow-sentence` had to exist and why it does not any more.",
    ).toContain("letter-spacing: normal");
    expect(
      ruleBody(".label-heading"),
      "the heading tier keeps the caps — it names a region, and being hard to read as prose is acceptable for one or two words.",
    ).toContain("text-transform: uppercase");
  });

  it("the two tiers take the sizes the split was measured at", () => {
    expect(ruleBody(".label-heading"), "11px — see the ruling on #1307").toContain(
      "font-size: var(--text-md)",
    );
    expect(
      ruleBody(".label-caption"),
      "12px, and nominally LARGER than the heading on purpose: uppercase reads optically larger, so 11px caps and 12px lowercase land at about the same weight doing different jobs. Matching the numbers un-matches the voices.",
    ).toContain("font-size: var(--text-lg)");
  });

  it("the variant the split absorbed is gone, not kept in sync", () => {
    // The SELECTOR, not the string: a comment is not a declaration.
    expect(
      CSS_TEXT.includes(".eyebrow-sentence {"),
      "`.eyebrow-sentence` was a caption wearing a heading's clothes (#850). The two-tier split is the rethink it should have had; keeping it is keeping a second thing to sync.",
    ).toBe(false);
  });

  /**
   * #1754 — the seam is spent on the Ephemerists plate, where #1715's lift left
   * the neutral at 2.15 / 2.01 / 1.86 (page / sheet / cell). The other always-dark
   * sheets cover themselves.
   *
   * `-plate-quiet`, not the default `-card-muted`: it is the sibling minted for
   * these grounds (#1173 `-quiet` = same role, second ground), already gated by
   * `ephemerists page ground / plate / panel cell, quiet ink`. No `Pair` row;
   * this guards the wiring.
   */
  it("the Ephemerists plate repoints the label seam onto its own quiet ink (#1754)", () => {
    expect(
      ruleBody(".eph-plate-sheet"),
      "`.eph-plate-sheet` is the column both Ephemerists detail pages wear, and it is the one sheet in the kit where a bare `.label-caption` lands on the global neutral over a night ground — the comment leaves' owner controls and the thread heading at 2.01:1 in light. Without this the plate has no way to fix its own sheet.",
    ).toContain("--label-ink: var(--faction-ephemerists-plate-quiet)");
  });

  /**
   * #1800 — the other root: `EphemeristsEditPraxis`'s `dress.pageStyle`, mounted
   * by `ComposerPage` and `PraxisWaitingSurface`. Unset, `.label-caption` read
   * 2.01 / 1.86 there.
   *
   * Trap: `ComposerPage`'s own ground is the APP page, where `-plate-quiet` is
   * 2.64. Fine today — every label renders inside the sheet or a panel — but a
   * label mounted on the bare composer page would repeat #1793.
   */
  it("the composer and waiting surface set the same label seam on their own root (#1800)", () => {
    const pageStyle = ephemeristsComposerPageStyle();
    expect(
      pageStyle,
      "`dress.pageStyle` is the second Ephemerists root. Without the seam, every `.label-caption` in the composer and the waiting surface reads the global tertiary on a night sheet — 2.01:1 on the plate, 1.86:1 in a panel cell.",
    ).toContain('["--label-ink" as string]: QUIET');
    expect(
      ruleBody(".eph-plate-sheet"),
      "both Ephemerists roots must land on ONE ink, or the label tier reads two different quiets depending on which page you are on.",
    ).toContain("--label-ink: var(--faction-ephemerists-plate-quiet)");
  });
});

/**
 * #1636 — a prose link's ink is a seam too. `.markdown-preview a` carried one
 * neutral ink onto every faction sheet (2.20 on S.N.I.D.E. after #1715).
 * Defaulted at `:root` to the neutral; frames repoint it. Ephemerists uses
 * `-plate-brass-light`, already measured, so this asserts the WIRING only.
 */
describe("a prose link's ink is a seam (#1636)", () => {
  it(".markdown-preview links paint the seam, not a hardcoded neutral", () => {
    expect(
      ruleBody(".markdown-preview a"),
      "`.markdown-preview a` must read `var(--link-ink)`, or a faction whose sheet the neutral fails has no way to fix its own ground.",
    ).toContain("color: var(--link-ink)");
    expect(
      ruleBody(".markdown-preview a:hover"),
      "the hover ink needs the same seam: `--color-text-primary` is near-black in light, which is 1.3:1 on the Ephemerists plate.",
    ).toContain("color: var(--link-ink-hover)");
  });

  for (const theme of BOTH_THEMES) {
    it(`--link-ink and --link-ink-hover unset are the measured neutrals (${theme})`, () => {
      for (const [seam, neutral] of [
        ["--link-ink", "--color-text-secondary"],
        ["--link-ink-hover", "--color-text-primary"],
      ]) {
        const resolved = resolveColor(seam, theme);
        expect(resolved.color, `${seam} (${theme}) resolved to "${resolved.raw}"`).not.toBeNull();
        expect(
          resolved.raw,
          `a link outside a faction frame must render what it renders today — that is what keeps this a seam rather than a repaint.`,
        ).toBe(resolveColor(neutral, theme).raw);
      }
    });
  }

  it("the Ephemerists plate repoints the seam onto its own two inks", () => {
    const body = ruleBody(".eph-plate-sheet");
    expect(
      body,
      "`.eph-plate-sheet` is the column both Ephemerists detail pages wear; it is one of the two roots the plate's link ink has to be set on.",
    ).toContain("--link-ink: var(--faction-ephemerists-plate-brass-light)");
    expect(body, "hover goes to the plate's body ink, the same relation the neutral pair has.").toContain(
      "--link-ink-hover: var(--faction-ephemerists-plate-ink)",
    );
  });

  // The other root: the composer/waiting surface's `BodyPreview` read 2.60
  // (hover 1.16) until `dress.pageStyle` declared the seam.
  it("the composer and waiting surface set the same seam on their own root", () => {
    const pageStyle = ephemeristsComposerPageStyle();
    expect(
      pageStyle,
      "`dress.pageStyle` is mounted by both `ComposerPage` and `PraxisWaitingSurface`; without the seam their prose links fall back to the app neutral on a night ground.",
    ).toContain('["--link-ink" as string]: BRASS_LIGHT');
    expect(pageStyle, "and its hover partner, for the same reason").toContain(
      '["--link-ink-hover" as string]: INK',
    );
  });
});

/**
 * #1636 — a transitioned `background` shorthand cannot carry a themed token: it
 * resets image/position/size/repeat and only the colour interpolates. Use
 * `background-color` (as `.wow-detail-field`, `.ua-praxis-leaf` do).
 */
describe("a themed ground is a longhand (#1636)", () => {
  // A SCAN, NOT A LIST: the defect has an exact syntactic signature, so every
  // future rule is covered.
  it("no rule transitions the `background` shorthand", () => {
    const offenders = [...stripComments(CSS_TEXT).matchAll(/transition:[^;}]*/g)]
      .map((match) => match[0].trim())
      // Longhands are fine; only the bare shorthand is the bug.
      .filter((declaration) => /(^|[\s,:])background(\s|,|$)/.test(declaration));
    expect(
      offenders,
      "a `transition` naming `background` animates a list of longhands only `background-color` interpolates, and the shorthand it goes with resets `-image`, `-position`, `-size` and `-repeat` every time the cascade re-resolves the token. Name the longhand.",
    ).toEqual([]);
  });

  // The other half: a rule that transitions a ground must declare one.
  it("every rule that transitions a ground declares that ground", () => {
    const css = stripComments(CSS_TEXT);
    const bodies: string[] = [];
    for (const match of css.matchAll(/transition:[^;}]*background-color/g)) {
      const open = css.lastIndexOf("{", match.index);
      bodies.push(css.slice(open + 1, css.indexOf("}", match.index)));
    }
    expect(bodies.length, "the four grounds #1636 split, at least").toBeGreaterThanOrEqual(4);
    for (const body of bodies) {
      expect(
        body,
        "a rule transitioning `background-color` without declaring it is transitioning whatever it inherited.",
      ).toMatch(/background-color:\s*var\(--/);
      expect(
        body.replace(/background-color:[^;]*;/g, "").replace(/background-image:[^;]*;/g, ""),
        "and it must not also carry a `background` shorthand — the shorthand wins by order and takes the longhand with it.",
      ).not.toMatch(/(^|[\s;{])background:/);
    }
  });

});

/**
 * #1793 — `EphemeristsFactionBody`'s root is a bare `.wz-faction-grid`, so
 * copy outside a `CARD` stands on `--color-bg-page` and needs the app's ink
 * (#1675's ruling). The empty states were caught at 2.64.
 *
 * The token cannot move: clearing `-plate-inner` needs luminance >= 0.2453 and
 * clearing the light page needs <= 0.1626 — no value does both (computed below).
 */
describe("the Ephemerists faction page paints the page's ink outside its cards (#1793)", () => {
  const SOURCE = sourceOf("pages/factionDetail/archetypes/EphemeristsFactionBody.tsx");

  // The two strings the sweep measured, plus the roster's (inside a `CARD`) as
  // a control. Keys are the shared `detail.*` block's; a rename moves the marker only.
  for (const key of ["detail.default.tasksEmpty", "detail.default.recentEmpty"]) {
    it(`\`${key}\` reads the page's quiet ink, not the plate's`, () => {
      const at = SOURCE.indexOf(`t("${key}")`);
      expect(at, `no \`t("${key}")\` call in EphemeristsFactionBody`).toBeGreaterThan(-1);
      const element = SOURCE.slice(at - 400, at);
      expect(
        element,
        "an empty state outside a `CARD` sits on `--color-bg-page`, where the plate's quiet ink is 2.64:1 in light. `PAGE_QUIET` is the app's own second tier — 7.78:1 light, 8.33:1 dark — and it is what the kicker beside it already reads (#1675).",
      ).toContain("color: PAGE_QUIET");
      expect(
        element,
        "`QUIET` is `-plate-quiet`, minted for the three NIGHT grounds of the Valley plate. On the app's light page it is the defect this issue reports.",
      ).not.toContain("color: QUIET");
    });
  }

  it("prose that IS inside a card keeps the plate's ink", () => {
    const at = SOURCE.indexOf('t("detail.membersEmptyWithSpotlight")');
    expect(at, "no roster empty state in EphemeristsFactionBody").toBeGreaterThan(-1);
    expect(
      SOURCE.slice(at - 400, at),
      "the roster empty state renders inside `CARD`, whose ground is `-plate-bg`. Repainting it too would swap a 5.98:1 faction ink for a neutral on a night sheet — the mistake in the other direction.",
    ).toContain("color: QUIET");
  });

  for (const theme of BOTH_THEMES) {
    it(`the ink it takes instead clears AA on the app's page (${theme})`, () => {
      const ink = resolveColor("--color-text-secondary", theme);
      const page = resolveColor("--color-bg-page", theme);
      expect(ink.color, `--color-text-secondary (${theme}) resolved to "${ink.raw}"`).not.toBeNull();
      expect(page.color, `--color-bg-page (${theme}) resolved to "${page.raw}"`).not.toBeNull();
      const ratio = contrastRatio(ink.color!, page.color!);
      expect(ratio, `18px content prose owes 4.5:1; measured ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(AA_NORMAL);
    });
  }

  it("no value of `-plate-quiet` could have cleared both registers", () => {
    // Ratio is monotonic in luminance, so floor > ceiling means no hue works.
    const plate = resolveColor("--faction-ephemerists-plate-inner", "light").color!;
    const page = resolveColor("--color-bg-page", "light").color!;
    const floorOnPlate = AA_NORMAL * (relativeLuminance(plate) + 0.05) - 0.05;
    const ceilingOnPage = (relativeLuminance(page) + 0.05) / AA_NORMAL - 0.05;
    expect(
      floorOnPlate,
      "if this ever stops holding, `-plate-quiet` CAN serve both grounds and the split above is no longer necessary — delete it rather than working around it.",
    ).toBeGreaterThan(ceilingOnPage);
  });
});

/**
 * A token scoped to LARGE display type stays there (#1766). `--faction-ua-vermil`
 * is measured at `AA_LARGE` per its declaration; a 14px/600 rank once read 4.12
 * with every ratio green. So: a reader allowlist the suite reads, not a scope in
 * a comment. Adding a reader is a diff that says "this is display size".
 * `--faction-ua` (fill) and `--faction-ua-glow` (ornament) are not covered.
 */
describe("UA's display-only vermilion stays on display type (#1766)", () => {
  const VERMIL = "--faction-ua-vermil";

  /** Every shipped file allowed to paint it, and what it draws there. */
  const READERS: Record<string, string> = {
    "pages/characterProfile/archetypes/UaProfileBody.tsx": "a gradient stop, not text",
    "pages/editPraxis/archetypes/UaEditPraxis.tsx": "the composer's errorColor",
  };

  it("is read only where the numeral is display type or the mark is not text", () => {
    const found = sourceFiles()
      .filter((path) => readStripped(path).includes(VERMIL))
      .map(toRelative);
    expect(
      found.filter((path) => !(path in READERS)),
      `${VERMIL} is scoped in index.css to large display type. A new reader owes 4.5:1, not the large-text 3:1 — take --faction-ua-card-accent (5.18 / 6.58 on the sheet) and, if the numeral really is display size, add the file here.`,
    ).toEqual([]);
  });

  it("keeps a reader for every file the allowlist names", () => {
    const found = new Set(
      sourceFiles()
        .filter((path) => readStripped(path).includes(VERMIL))
        .map(toRelative),
    );
    expect(
      Object.keys(READERS).filter((path) => !found.has(path)),
      "an allowlist entry with no reader is a scope nobody is spending — delete the line with the last draw call, the way #1293 deletes an unread font token.",
    ).toEqual([]);
  });
});

/**
 * `--everymen-ink` is STRUCTURE: surfaces grounded on the paper may not set
 * text in it (#2133). Same hex as `--everymen-paper-text` in light (#221a12),
 * so the bug has no light mode; in dark the paper flips and the ink does not
 * (1.16 / 1.06). Only `color:` bites (borders just dim). Per-file reader rule,
 * as #1793 / #1766.
 */
describe("`--everymen-ink` stays structure on the paper (#2133)", () => {
  for (const theme of BOTH_THEMES) {
    it(`the ink they take instead clears AA on both stocks (${theme})`, () => {
      const text = resolveColor("--everymen-paper-text", theme);
      expect(text.color, `--everymen-paper-text (${theme}) resolved to "${text.raw}"`).not.toBeNull();
      for (const stock of ["--everymen-paper", "--everymen-paper-deep"]) {
        const surface = resolveColor(stock, theme);
        expect(surface.color, `${stock} (${theme}) resolved to "${surface.raw}"`).not.toBeNull();
        const ratio = contrastRatio(text.color!, surface.color!);
        expect(
          ratio,
          `--everymen-paper-text on ${stock} (${theme}) is ${formatRatio(ratio)}`,
        ).toBeGreaterThanOrEqual(AA_NORMAL);
      }
    });
  }
});

/** `--faction-snide-acid` never touches paper (#2173): it carries a black plate, or the wall's ink. */
describe("`--faction-snide-acid` clears AA on its ground (#2173)", () => {
  for (const theme of BOTH_THEMES) {
    it(`acid clears AA on the plate, and the wall's ink on the wall (${theme})`, () => {
      for (const [ink, ground] of [
        ["--faction-snide-acid", "--faction-snide-ink"],
        ["--faction-snide-wall-text", "--faction-snide-wall"],
        ["--faction-snide-wall-text", "--faction-snide-wall-deep"],
      ] as const) {
        const text = resolveColor(ink, theme);
        const surface = resolveColor(ground, theme);
        expect(text.color, `${ink} (${theme}) resolved to "${text.raw}"`).not.toBeNull();
        expect(surface.color, `${ground} (${theme}) resolved to "${surface.raw}"`).not.toBeNull();
        const ratio = contrastRatio(text.color!, surface.color!);
        expect(ratio, `${ink} on ${ground} (${theme}) is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(
          AA_NORMAL,
        );
      }
    });
  }
});

/**
 * The S.N.I.D.E. field desk stands on the wall, masthead CUT (#2287). The
 * per-letter ransom cut is drawn once; source rows fail on a copy.
 *
 * The panel moved from `-card-bg` (black both themes) to the flipping wall, so
 * `-card-*` inks read ~1.05 by day; they move to `-note-*` (measured in
 * SNIDE_WALL_PAIRS). Acid and the level track take #2173's plate.
 *
 * A ransom cut is ground-portable while every scrap is OPAQUE — the alpha row
 * is load-bearing.
 *
 * `ponytail:` ink rows slice `<WallPanel>` out of the source, so inks from a
 * module-level style object (like `actionPillStyle`) are outside it. Upgrade:
 * the JSX walk the #2107 block declines.
 */
describe("the S.N.I.D.E. field desk stands on the wall (#2287)", () => {
  const ATOMS = "components/factionMarks/snideAtoms.tsx";
  /** The scraps as the module declares them, so this cannot drift. */
  function ransomScraps(): { bg: string; col: string }[] {
    const source = stripComments(sourceOf(ATOMS));
    const at = source.indexOf("const RANSOM = [");
    expect(at, `no \`RANSOM\` table in ${ATOMS}`).toBeGreaterThan(-1);
    const table = source.slice(at, source.indexOf("\n];", at));
    const scraps = [...table.matchAll(/bg:\s*"var\((--[a-z0-9-]+)\)",\s*col:\s*"var\((--[a-z0-9-]+)\)"/g)].map(
      (match) => ({ bg: match[1], col: match[2] }),
    );
    expect(scraps.length, `parsed ${scraps.length} scraps out of \`RANSOM\`; the table's shape changed`).toBe(5);
    return scraps;
  }

  for (const theme of BOTH_THEMES) {
    it(`acid and the track's two ends clear their plate (${theme})`, () => {
      for (const [ink, ground, floor, role] of [
        ["--faction-snide-acid", "--faction-snide-ink", AA_NORMAL, "the points figure, as TYPE"],
        ["--faction-snide-acid", "--faction-snide-ink", AA_LARGE, "the track fill's acid end, as a DRAWN mark"],
        ["--faction-snide-pink", "--faction-snide-ink", AA_LARGE, "the track fill's pink end"],
      ] as const) {
        const text = resolveColor(ink, theme);
        const surface = resolveColor(ground, theme);
        expect(text.color, `${ink} (${theme}) resolved to "${text.raw}"`).not.toBeNull();
        expect(surface.color, `${ground} (${theme}) resolved to "${surface.raw}"`).not.toBeNull();
        const ratio = contrastRatio(text.color!, surface.color!);
        expect(ratio, `${role}: ${ink} on ${ground} (${theme}) is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(
          floor,
        );
      }
    });

    it(`every ransom letter clears its own scrap, and every scrap is OPAQUE (${theme})`, () => {
      for (const { bg, col } of ransomScraps()) {
        const scrap = resolveColor(bg, theme);
        const letter = resolveColor(col, theme);
        expect(scrap.color, `${bg} (${theme}) resolved to "${scrap.raw}"`).not.toBeNull();
        expect(letter.color, `${col} (${theme}) resolved to "${letter.raw}"`).not.toBeNull();
        expect(
          scrap.color!.a,
          `${bg} (${theme}) is translucent. An opaque scrap is what makes the cut ground-portable — the masthead and the comment byline stand on two different grounds and neither re-measures the mark.`,
        ).toBe(1);
        const ratio = contrastRatio(letter.color!, scrap.color!);
        expect(ratio, `${col} on ${bg} (${theme}) is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(AA_NORMAL);
      }
    });
  }
});

/**
 * The S.N.I.D.E. FACTION PAGE stands on the wall (#2343), reversing #2227 on
 * the owner's ruling (`--faction-snide-paper` stays an ink). Flipping the
 * panels lands every acid-as-type site on paper at once, so seam (a) is a
 * SOURCE sweep for the general defect: an acid ink whose own style object
 * declares no plate.
 *
 * Seam (b): wall inks are SNIDE_WALL_PAIRS'; the rows below are plate grounds.
 * In dark panel and page are 1.000:1, so the edge is asserted.
 */
describe("the S.N.I.D.E. faction page stands on the wall (#2343)", () => {
  for (const theme of BOTH_THEMES) {
    it(`the pairings whose ground is the PLATE rather than the wall clear AA (${theme})`, () => {
      for (const [ink, ground, floor, role] of [
        // The chits' plate is opaque, so the numeral reads against the plate.
        ["--faction-snide-acid", "--faction-snide-ink", AA_LARGE, "the stat chit's numeral"],
        ["--faction-snide-card-muted", "--faction-snide-ink", AA_NORMAL, "the stat chit's label"],
        // The motto sticker and plated headings: #2173's pairing at this surface.
        ["--faction-snide-ink", "--faction-snide-acid", AA_NORMAL, "the motto on its acid sticker"],
      ] as const) {
        const text = resolveColor(ink, theme);
        const surface = resolveColor(ground, theme);
        expect(text.color, `${ink} (${theme}) resolved to "${text.raw}"`).not.toBeNull();
        expect(surface.color, `${ground} (${theme}) resolved to "${surface.raw}"`).not.toBeNull();
        const ratio = contrastRatio(text.color!, surface.color!);
        expect(ratio, `${role}: ${ink} on ${ground} (${theme}) is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(
          floor,
        );
      }
    });
  }
});

/**
 * #2364 — a frozen disc owes a frozen mark: the opposite of #2173. The
 * invariant `--faction-snide-paper` disc carried the flipping chrome hue
 * (1.07:1 in dark). Every other guard passed it, so the assertion is "disc
 * and mark resolve the same in both cascades", then the ratio. 3:1 (1.4.11).
 * The repair is the press's `-ink`; sibling surfaces are pinned too.
 *
 * The hero left this family (#2368): its disc is black, measured below.
 */
describe("a mark on the invariant xerox disc is frozen too (#2364)", () => {
  const DISC = "--faction-snide-paper";

  /** The three surfaces that draw a mark on this disc. */
  const DISC_MARKS: ReadonlyArray<readonly [string, string]> = [
    ["the faction page's inverted monogram (SnideFactionBody)", "--faction-snide-ink"],
    ["the praxis detail's avatar tile (SnidePraxisDetail)", "--faction-snide-ink"],
    ["the profile laurel's glyph (SnideProfileBody)", "--faction-snide-ink"],
  ];

  it("the disc itself cannot flip — the premise the rest of this block rests on", () => {
    const [light, dark] = BOTH_THEMES.map((theme) => resolveColor(DISC, theme).raw);
    expect(light, `${DISC} resolved to nothing in light`).not.toBeNull();
    expect(dark, `${DISC} is the press's stock and #2227 pinned it to one declaration`).toBe(light);
  });

  it("every mark drawn on it is frozen too", () => {
    for (const [role, token] of DISC_MARKS) {
      const [light, dark] = BOTH_THEMES.map((theme) => resolveColor(token, theme).raw);
      expect(light, `${token} resolved to nothing in light`).not.toBeNull();
      expect(
        dark,
        `${role} paints ${token}, which is ${light} by day and ${dark} by night. The stock under it has ONE value, so a mark that flips is read against the same cream twice — and the chrome hue's night value is 1.07:1 there (#2364).`,
      ).toBe(light);
    }
  });

  for (const theme of BOTH_THEMES) {
    it(`every mark clears the 3:1 graphical floor (${theme})`, () => {
      const ground = resolveColor(DISC, theme);
      expect(ground.color, `${DISC} (${theme}) resolved to "${ground.raw}"`).not.toBeNull();
      for (const [role, token] of DISC_MARKS) {
        const mark = resolveColor(token, theme);
        expect(mark.color, `${token} (${theme}) resolved to "${mark.raw}"`).not.toBeNull();
        const ratio = contrastRatio(mark.color!, ground.color!);
        expect(
          ratio,
          `${role}: ${token} on ${DISC} (${theme}) is ${formatRatio(ratio)}. A drawn mark owes WCAG 1.4.11's 3:1, and the acid a S.N.I.D.E. surface reaches for by reflex reads 2.40:1 on this stock even in light — there is no acid rung dark enough for cream (#2133's arithmetic, one surface over).`,
        ).toBeGreaterThanOrEqual(AA_LARGE);
      }
    });
  }
});

/**
 * #2368 — the hero medallion is black in both cascades (owner ruling), so the
 * flipping sigil is legal again (6.93 / 15.55). But the black rim on a black
 * disc vanishes, and at night the disc is 1.05 on the wall. Assertion: in EACH
 * cascade at least one of {disc, rim} clears 3:1 against the wall — no single
 * pairing row can state that.
 *
 * The subhead is checked here too: it was a quiet-tier body-font caption.
 */
describe("the S.N.I.D.E. hero's black medallion and its subhead (#2368)", () => {
  const HERO = "components/factionHero/SnideFactionHero.tsx";
  const WALL = "--faction-snide-wall";

  /** The aliases the rows below match, so a rename fails loudly (as #2343). */
  const ALIASES: ReadonlyArray<readonly [string, string]> = [
    ["WALL", "--faction-snide-wall"],
    ["NOTE_INK", "--faction-snide-note-ink"],
    ["PLATE", "--faction-snide-ink"],
    ["ACID", "--faction-snide-acid"],
    ["CHROME", "--faction-snide"],
    ["STOCK", "--faction-snide-paper"],
  ];

  function heroSource(): string {
    // `stripComments` only knows `/* … */`; this file argues in `//` lines between
    // declarations, so strip those too or reasoning could hide a declaration.
    const source = stripComments(sourceOf(HERO)).replace(/^[^\S\n]*\/\/.*$/gm, "");
    for (const [alias, token] of ALIASES) {
      expect(
        source,
        `${HERO} no longer binds \`${alias}\` to ${token}; retarget this guard at whatever it is called there now.`,
      ).toMatch(
        new RegExp(`const ${alias} = ["']${ROLE_READ}var\\(${token}\\)${ROLE_READ_END}["']`),
      );
    }
    return source;
  }

  /** An alias (bare, `{X}` or `${X}`) or a literal `var(--token)`, as its token. */
  function tokenOf(expression: string, role: string): string {
    const trimmed = expression.replace(/[`"'${}]/g, "").replace(/[,;]$/, "").trim();
    const alias = ALIASES.find(([name]) => name === trimmed);
    if (alias) return alias[1];
    // `CHROME` is a role read since #2676; both spellings resolve to one token.
    const bare = trimmed.match(new RegExp(`^${ROLE_READ}var\\((--[a-z-]+)\\)${ROLE_READ_END}$`));
    expect(bare, `${role} paints \`${trimmed}\`, which is neither an alias this guard knows nor a var()`).not.toBeNull();
    return bare![1];
  }

  /** The medallion, read OFF THE SOURCE so no row measures a token it stopped painting. */
  function medallion(): { disc: string; marks: Array<[string, string]>; raster: string } {
    const source = heroSource();
    const disc = source.match(/borderRadius: "50%",\s*background: ([^,\n]+),/);
    const rim = source.match(/border: [`"]2px solid ([^`"]+)[`"]/);
    const sigil = source.match(/<SnideSigil[^>]*color=([^\s/>]+)/);
    // The medallion's 6% raster (the wall grain is 5.5%, ghosts 7/3.5/2.5%).
    const raster = source.match(/color-mix\(in srgb, ([^\s]+) 6%, transparent\)/);
    expect(disc, "no disc in the hero — nothing here is measuring the medallion").not.toBeNull();
    expect(rim, "no `2px solid` rim on the hero medallion").not.toBeNull();
    expect(sigil, "the hero draws no `SnideSigil` in a colour this guard can read").not.toBeNull();
    expect(raster, "the medallion's 6% raster is gone").not.toBeNull();
    return {
      disc: tokenOf(disc![1], "the medallion's disc"),
      marks: [
        ["the medallion's rim", tokenOf(rim![1], "the medallion's rim")],
        ["the medallion's sigil", tokenOf(sigil![1], "the medallion's sigil")],
      ],
      raster: tokenOf(raster![1], "the medallion's raster"),
    };
  }

  it("the disc is black in both cascades — the owner's ruling, as a measurement", () => {
    const { disc } = medallion();
    const [light, dark] = BOTH_THEMES.map((theme) => resolveColor(disc, theme));
    expect(light.raw, `${disc} resolved to nothing in light`).not.toBeNull();
    expect(dark.raw, `the medallion grounds on ${disc}, which flips ${light.raw} -> ${dark.raw}. The ruling is that this disc is black no matter what the cascade does.`).toBe(light.raw);
    expect(
      relativeLuminance(light.color!),
      `${disc} is ${light.raw}, whose relative luminance is not a black disc's. Freezing the stock is only half the ruling.`,
    ).toBeLessThan(0.05);
  });

  for (const theme of BOTH_THEMES) {
    it(`every mark on the disc clears the 3:1 graphical floor (${theme})`, () => {
      const { disc, marks, raster } = medallion();
      const ground = resolveColor(disc, theme);
      expect(ground.color, `${disc} (${theme}) resolved to "${ground.raw}"`).not.toBeNull();
      for (const [role, token] of marks) {
        const mark = resolveColor(token, theme);
        expect(mark.color, `${token} (${theme}) resolved to "${mark.raw}"`).not.toBeNull();
        const ratio = contrastRatio(mark.color!, ground.color!);
        expect(
          ratio,
          `${role}: ${token} on ${disc} (${theme}) is ${formatRatio(ratio)}. A drawn mark owes WCAG 1.4.11's 3:1, and the failure this catches is the cheap one — leaving a mark in the ink the disc itself became.`,
        ).toBeGreaterThanOrEqual(AA_LARGE);
      }
      // A texture owes no ratio, but in the disc's own ink it draws nothing.
      expect(raster, "the medallion's raster is the disc's own colour, so it draws nothing").not.toBe(disc);
    });
  }

  for (const theme of BOTH_THEMES) {
    it(`the sticker has an edge against the wall (${theme})`, () => {
      const { disc, marks } = medallion();
      const wall = resolveColor(WALL, theme);
      expect(wall.color, `${WALL} (${theme}) resolved to "${wall.raw}"`).not.toBeNull();
      const rim = marks[0][1];
      const readings = [disc, rim].map((token) => {
        const value = resolveColor(token, theme);
        expect(value.color, `${token} (${theme}) resolved to "${value.raw}"`).not.toBeNull();
        return { token, ratio: contrastRatio(value.color!, wall.color!) };
      });
      const best = Math.max(...readings.map((r) => r.ratio));
      expect(
        best,
        `neither the disc nor its rim separates the medallion from the wall in ${theme}: ${readings
          .map((r) => `${r.token} ${formatRatio(r.ratio)}`)
          .join(", ")}. One of the two has to carry the edge in each cascade — the black disc does it by day (15.95:1 on xerox stock), and at night it is 1.05:1 on the #0a0a0b wall and only the rim is left.`,
      ).toBeGreaterThanOrEqual(AA_LARGE);
    });
  }

  /** The wordmark's expansion line, as `style={{ … }}` up to the string it renders. */
  function subhead(): string {
    const source = heroSource();
    const at = source.indexOf("identity.snide.fullName");
    expect(at, `${HERO} no longer renders the faction's full name`).toBeGreaterThan(-1);
    const open = source.lastIndexOf("style={{", at);
    expect(open, "the expansion line is rendered by no styled element").toBeGreaterThan(-1);
    return source.slice(open, at);
  }

  for (const theme of BOTH_THEMES) {
    it(`the subhead's ink clears AA on the hero's real ground (${theme})`, () => {
      const ink = subhead().match(/color: ([^,\n]+),/);
      expect(ink, "the expansion line sets no colour").not.toBeNull();
      const token = tokenOf(ink![1], "the expansion line");
      const text = resolveColor(token, theme);
      const ground = resolveColor(WALL, theme);
      expect(text.color, `${token} (${theme}) resolved to "${text.raw}"`).not.toBeNull();
      const ratio = contrastRatio(text.color!, ground.color!);
      expect(
        ratio,
        `the wordmark's subhead: ${token} on ${WALL} (${theme}) is ${formatRatio(ratio)}. The hero's ground is the wall, not the slab — the card tiers read 1.05:1 and 1.24:1 on it by day (#2173).`,
      ).toBeGreaterThanOrEqual(AA_NORMAL);
    });
  }
});

/**
 * A `--color-text-primary` fill takes `--color-bg-page` as its ink, never
 * `--color-text-on-accent` (#2107): `-on-accent` is `#ffffff` and never flips,
 * so it is white on cream (1.24) in dark. No documentation pairs those, and
 * Part B is nightly and skips profiles — it shipped twice (#1819, #2107).
 *
 * `ponytail:` FILE-level intersection, coarser than per style object; could
 * false-positive on a file doing both to different elements (none today).
 * Precise version: a JSX/AST walk, a dependency this suite does not carry.
 */
describe("a --color-text-primary fill takes the page as its ink (#2107)", () => {
  const FILL = /background[A-Za-z]*:[^;\n]*var\(--color-text-primary\)/;
  const WRONG_INK = "var(--color-text-on-accent)";

  it("no file inks the primary neutral's fill with the accent's white", () => {
    const found = sourceFiles()
      .filter((path) => {
        const source = readStripped(path);
        return FILL.test(source) && source.includes(WRONG_INK);
      })
      .map(toRelative);
    expect(
      found,
      "`--color-text-on-accent` is #ffffff in BOTH themes and `--color-text-primary` flips to cream (#f0e6d0) in dark — the pair is 1.24:1 there (#1819, #2107). Ink a primary-neutral fill with `--color-bg-page`, the ground that neutral is measured against.",
    ).toEqual([]);
  });
});

/**
 * The cream slabs go dark (#2227) — a reversal, guarded at both halves.
 * Everymen's `PAPER_FRAME` (`--everymen-cream`) and S.N.I.D.E.'s `PAPER_PANEL`
 * (`--faction-snide-paper`) were invariant light grounds: every value and
 * pairing green, a headlight on a dark page. Source guard on the grounds.
 *
 * `--faction-snide-paper` must not flip — six components use it as `color:`
 * on the ink panel — so it keeps exactly one declaration and the fix is per-site.
 */
describe("no kit grounds a panel on a light token that cannot flip (#2227)", () => {
  it("--faction-snide-paper keeps exactly one declaration", () => {
    const declarations = stripComments(CSS_TEXT).match(/--faction-snide-paper\s*:/g) ?? [];
    expect(
      declarations.length,
      "minting a dark half would turn six correct `color:` readers dark-on-dark (SnideDuelSealConfirm, SnideFactionHero, SnideFeedFrame, SnideProfileBody, SnideEditPraxis, SnideFactionBody). The reversal is per-site, not per-token.",
    ).toBe(1);
  });

  /**
   * Every (ground, ink) pairing the reversal creates, both themes. S.N.I.D.E.'s
   * read the same twice by design; measuring twice proves it.
   */
  const REVERSED_PAIRS: [string, string, string][] = [
    ["everymen frame, body copy", "--everymen-paper", "--everymen-paper-text"],
    ["everymen frame, eyebrow", "--everymen-paper", "--everymen-muted"],
    ["everymen frame, accent ink", "--everymen-paper", "--everymen-paper-accent"],
    ["snide panel, body copy", "--faction-snide-ink", "--faction-snide-paper"],
    ["snide panel, quiet copy", "--faction-snide-ink", "--faction-snide-card-muted"],
    ["snide panel, marker heading", "--faction-snide-ink", "--faction-snide-acid-deep"],
    ["snide panel, roster level", "--faction-snide-ink", "--faction-snide-pink"],
    ["snide badge chip, glyph", "--faction-snide-acid", "--faction-snide-ink"],
  ];

  for (const theme of BOTH_THEMES) {
    for (const [what, surface, text] of REVERSED_PAIRS) {
      it(`${what} clears AA (${theme})`, () => {
        const ground = resolveColor(surface, theme);
        const ink = resolveColor(text, theme);
        expect(ground.color, `${surface} (${theme}) resolved to "${ground.raw}"`).not.toBeNull();
        expect(ink.color, `${text} (${theme}) resolved to "${ink.raw}"`).not.toBeNull();
        const ratio = contrastRatio(ink.color!, ground.color!);
        expect(
          ratio,
          `${text} on ${surface} (${theme}) is ${formatRatio(ratio)}`,
        ).toBeGreaterThanOrEqual(AA_NORMAL);
      });
    }
  }
});

/**
 * Coven's witch hat on the slip (#2325). Not a `PAIRS` row: `AA_LARGE` there
 * means large TYPE; this is 1.4.11's 3:1. The directory tile has no band and
 * hands no `markColor`, so it uses `--faction-coven-slip-deep` (`--faction-coven`
 * is 2.11). `-slip-mid` is the worst stop in both cascades.
 */
describe("the Coven directory tile's mark clears the graphical floor", () => {
  for (const theme of BOTH_THEMES) {
    it(`the witch hat reads on the slip's worst stop (${theme})`, () => {
      const ink = resolveColor("--faction-coven-slip-deep", theme);
      const ground = resolveColor("--faction-coven-slip-mid", theme);
      expect(ink.color, `-slip-deep (${theme}) resolved to "${ink.raw}"`).not.toBeNull();
      expect(ground.color, `-slip-mid (${theme}) resolved to "${ground.raw}"`).not.toBeNull();
      const ratio = contrastRatio(ink.color!, ground.color!);
      expect(
        ratio,
        `the hat is ${formatRatio(ratio)} on the ramp's worst stop (${theme}); a drawn mark owes 1.4.11's 3:1`,
      ).toBeGreaterThanOrEqual(AA_LARGE);
    });
  }
});

/**
 * Everymen's cog rule on the bill paper (#2327). Not a `PAIRS` row (see Coven).
 * The same pair is `everymen/sheet accent on paper` in BASELINE (4.49 text,
 * #651); as the dashed rule and cog it is a graphic owing 3:1. Pins both the
 * directory tile and `EverymenTaskCard`. The cog's hub is the paper.
 */
describe("the Everymen bill's drawn rule clears the graphical floor", () => {
  for (const theme of BOTH_THEMES) {
    it(`the dashed rule and its cog read on the paper (${theme})`, () => {
      const ink = resolveColor("--everymen-red", theme);
      const ground = resolveColor("--everymen-paper", theme);
      expect(ink.color, `--everymen-red (${theme}) resolved to "${ink.raw}"`).not.toBeNull();
      expect(ground.color, `--everymen-paper (${theme}) resolved to "${ground.raw}"`).not.toBeNull();
      const ratio = contrastRatio(ink.color!, ground.color!);
      expect(
        ratio,
        `the rule is ${formatRatio(ratio)} on the bill (${theme}); a drawn mark owes 1.4.11's 3:1`,
      ).toBeGreaterThanOrEqual(AA_LARGE);
    });
  }
});

/**
 * S.N.I.D.E. IS NOT AN ALWAYS-DARK FACTION (#2631, ADR-0085). `-wall` and
 * `-note-paper` flip; only `-ink` (the press) and the `-card-*` slab do not.
 * This catches the SEVENTH surface, in two seams:
 *
 *  (a) THE PIN. `dataTheme` freezes every alias in a skin to one cascade;
 *      swept over the whole tree, and exactly one kit may do it.
 *  (b) THE GROUND. A page/panel on the press or slab is a dark island. Swept
 *      per file through its aliases; marks that bring their own stock (censor
 *      plate, chit, pasted black clipping; #2066 / #2173) are listed one by one.
 *      A new background on either token fails until added to the inventory.
 *
 * The moved-onto inks are measured in SNIDE_WALL_PAIRS; the rail's well and
 * level track are the rows at the bottom of this block.
 */
describe("S.N.I.D.E. is not an always-dark faction (#2631)", () => {
  /** The only kit whose ground is one colour in both cascades. */
  const PINNED = "pages/characterProfile/archetypes/SingularityProfileBody.tsx";

  it("exactly one profile kit pins a theme, and it is the terminal", () => {
    const pinned = sourceFiles()
      .filter((path) => /dataTheme:\s*['"](?:dark|light)['"]/.test(readStripped(path)))
      .map(toRelative);
    expect(
      pinned,
      "a `dataTheme` pin freezes every alias inside the container, so a faction whose tokens FLIP cannot be pinned at all — `--faction-singularity-card-bg` is #050f08 in both cascades, and S.N.I.D.E.'s ground has not been invariant since #1023.",
    ).toEqual([PINNED]);
  });

  /**
   * The five component surfaces the ruling names, and each site still allowed
   * to paint the press or slab as a `background`, by the file's alias. (The rail
   * reaches its ground through a shared seam; checked below.)
   */
  const SURFACES: { file: string; grounds: string[]; why: string }[] = [
    {
      file: "pages/characterProfile/archetypes/SnideProfileBody.tsx",
      // The acid heading's censor plate (#2173) and the level track's groove.
      // `pageBackground` is the wall, so that knob is swept too.
      grounds: ["INK", "INK"],
      why: "the page, the header, the progression panel, the badge board and the empty states take the wall",
    },
    {
      file: "components/factionHero/SnideFactionHero.tsx",
      // The wordmark's censor plate, the medallion disc (#2368) and the stat chits.
      grounds: ["PLATE", "PLATE", "PLATE"],
      why: "the hero's own `<header>` took the wall in #2343",
    },
    {
      file: "pages/characterPaths/archetypes/SnideCreateCharacter.tsx",
      grounds: [],
      why: "the sheet is the shared `WALL` from `factionMarks/snideAtoms`, and the press is only ever an ink here",
    },
    {
      file: "pages/editPraxis/archetypes/SnideEditPraxis.tsx",
      grounds: [],
      why: "the composer moved onto the wall in #2177; `PRESS_INK` is the ink acid is paired with",
    },
    {
      file: "pages/fieldDesk/mobileArchetypes/SnideFieldDesk.tsx",
      // `RansomCard` and its chips are the black clipping ON the wall (#2066); the
      // points figure's plate and track groove are acid's plate (#2287).
      grounds: ["INK", "INK", "INK", "INK", "PLATE", "PLATE"],
      why: "the credential panel is `WallPanel`, on the shared `WALL`",
    },
  ];

  /**
   * Every GROUND a file declares that resolves to the press or the slab. Includes
   * `ProfileKit` knobs (`pageBackground`, `barTrack`): a `background:`-only sweep
   * read the profile skin as clean.
   */
  function pressGrounds(file: string): string[] {
    const source = stripComments(sourceOf(file));
    // {@link ROLE_READ} matters here: lane 06 made four `SnideFieldDesk` ground
    // aliases role reads, and a blind alias map reports the file cleaner.
    const SNIDE_TOKEN = String.raw`var\((--faction-snide-[\w-]+)\)`;
    const aliases = new Map(
      [
        ...source.matchAll(
          new RegExp(
            `const ([A-Z_][A-Z_0-9]*) = ["']${ROLE_READ}${SNIDE_TOKEN}${ROLE_READ_END}["']`,
            "g",
          ),
        ),
      ].map((match) => [match[1], match[2]] as const),
    );
    return [...source.matchAll(/(?:background(?:Color)?|pageBackground|barTrack):\s*([^,;\n}]+)/g)]
      .map((match) => match[1].trim())
      .filter((value) => {
        const token =
          aliases.get(value) ??
          value.match(new RegExp(`^${ROLE_READ}${SNIDE_TOKEN}${ROLE_READ_END}$`))?.[1];
        return token === "--faction-snide-ink" || token === "--faction-snide-card-bg";
      });
  }

  for (const { file, grounds, why } of SURFACES) {
    it(`${file.split("/").pop()} grounds on the wall, not the press or the slab`, () => {
      expect(
        pressGrounds(file).sort(),
        `${file}: ${why}. \`--faction-snide-ink\` is the PRESS and \`-card-bg\` is the SLAB — both invariant, and a page or a panel painted with either is a dark island on a light page (ADR-0085). A mark that brings its own stock is not a ground; if this is one of those, name it in SURFACES with the ruling that allows it.`,
      ).toEqual([...grounds].sort());
    });
  }

  it("the rail's own ground is the wall too", () => {
    // The rail's ground is the `chrome` ground of `utils/factionRoles.ts`; ask the
    // resolver. The rendered `<aside>` is `layout/__tests__/sidebarFactionFace.test.tsx`'s.
    expect(factionRoleVar("snide", "paper", "chrome"), "the rail's sheet is the wall").toBe(
      "var(--faction-snide-wall)",
    );
    expect(
      factionRoleVar("snide", "paper", "sheet"),
      "the other seven skins take `-card-bg`, which is the right stock for a faction whose card sheet IS its chrome. S.N.I.D.E.'s is the slab pasted ON its chrome.",
    ).toBe("var(--faction-snide-card-bg)");
  });

  /**
   * The rail's two readings SNIDE_WALL_PAIRS cannot reach: `--rail-well`
   * (`railFaceVars`, ink at 10%) and the level track drawn on it (1.4.11, 3:1).
   * `--faction-snide` read 1.87 on the groove; `-wall-credit` (#2177) reads 6.28.
   */
  for (const theme of BOTH_THEMES) {
    it(`the rail's ink and its level track clear the wall's own well (${theme})`, () => {
      for (const [ink, floor, role] of [
        ["--faction-snide-note-ink", AA_NORMAL, "the identity line, as TYPE on the well"],
        ["--faction-snide-wall-credit", AA_LARGE, "the level track's fill, as a DRAWN mark"],
      ] as const) {
        const surface = resolveColor("--faction-snide-wall", theme);
        const wash = resolveColor("--faction-snide-note-ink", theme);
        const text = resolveColor(ink, theme);
        expect(surface.color, `the wall (${theme}) resolved to "${surface.raw}"`).not.toBeNull();
        expect(wash.color, `the well's ink (${theme}) resolved to "${wash.raw}"`).not.toBeNull();
        expect(text.color, `${ink} (${theme}) resolved to "${text.raw}"`).not.toBeNull();
        const ground = compositeOver({ ...wash.color!, a: RAIL_WELL_ALPHA }, surface.color!);
        const ratio = contrastRatio(text.color!, ground);
        expect(
          ratio,
          `${role}: ${ink} on the rail well (${theme}) is ${formatRatio(ratio)}`,
        ).toBeGreaterThanOrEqual(floor);
      }
    });
  }
});

/**
 * THE MASTHEAD BANDS STAND ON THEIR OWN GROUND (#2635). Not a ratio: both moved
 * bands were legible, but stood on borrowed tokens (`--faction-ua-hair`, a
 * divider; `--faction-coven-slip-sigil-ground`, a sigil disc). A band's ground
 * must belong to the band (`-mast`, `-note-bar`) or to a material the kit
 * draws; the table is the decision record, so a change of ground must say
 * which material. The other five were right (flattening them would have made
 * S.N.I.D.E.'s bar acid).
 *
 * Nine bands in two files (#2648): `factionBands.tsx` holds seven (no card
 * band for na/Albescent, ADR-0048); `metataskSeal/sealBands.tsx` the seal's
 * two. Per-file census, so seven cannot silently become eight.
 */
describe("the nine masthead bands stand on their own ground (#2635, #2648)", () => {
  const CARD_BANDS = "components/cardMasthead/factionBands.tsx";
  const SEAL_BANDS = "components/metataskSeal/sealBands.tsx";

  /** Band function → its file, the token it grounds on, and what that token IS. */
  const BAND_GROUNDS = [
    { band: "CovenBand", file: CARD_BANDS, ground: "--faction-coven-mast", role: "the band's own, minted by #2635" },
    { band: "EphemeristsBand", file: CARD_BANDS, ground: "--faction-ephemerists-plate-disc", role: "the medallion's disc, a material the plate draws" },
    { band: "EverymenBand", file: CARD_BANDS, ground: "--faction-everymen-bill-mast", role: "the band's own, a frozen red" },
    { band: "SingularityBand", file: CARD_BANDS, ground: "--faction-singularity-term-chrome", role: "the terminal's window chrome" },
    { band: "SnideBand", file: CARD_BANDS, ground: "--faction-snide-note-bar", role: "the clipping's printed bar" },
    { band: "UaBand", file: CARD_BANDS, ground: "--faction-ua-mast", role: "the band's own, minted by #2635" },
    { band: "WowBand", file: CARD_BANDS, ground: "--faction-wow-plum-surface", role: "the plum the decree's CTA already stands on" },
    // Seal-only bands (#2648) stand on the na card's own stock, which both seals
    // paint; that pairing is in ROLE_PAIRS.
    { band: "AlbescentBand", file: SEAL_BANDS, ground: "--faction-default-card-bg", role: "the na card's stock — Albescent IS the unaffiliated sheet plus a drift (ADR-0048)" },
    { band: "DefaultBand", file: SEAL_BANDS, ground: "--faction-default-card-bg", role: "the na card's stock, which is the na kit's one material" },
  ] as const;

  /**
   * The bands, comments stripped: `factionBands.tsx`'s header names the two
   * retired grounds on purpose, and a guard a comment can trip gets deleted.
   */
  const SOURCES = new Map(
    [CARD_BANDS, SEAL_BANDS].map((file) => [
      file,
      stripComments(sourceOf(file)).replace(/^\s*\/\/.*$/gm, ""),
    ]),
  );

  const fileOf = (name: string) =>
    BAND_GROUNDS.find((row) => row.band === name)?.file ?? CARD_BANDS;

  /**
   * One band's body: `function XBand(` up to the closing `\n}`. Ignores the
   * signature on purpose: `UaBand` takes `inert` since #2995, and matching empty
   * parens broke rows about paint.
   */
  function bandBody(name: string): string {
    const file = fileOf(name);
    const source = SOURCES.get(file)!;
    const at = source.indexOf(`function ${name}(`);
    expect(at, `no \`${name}\` in ${file}`).toBeGreaterThan(-1);
    return source.slice(at, source.indexOf("\n}", at));
  }

  /**
   * The token a band declaration paints with: `var(--x)` or a role read with
   * `--x` as fallback ({@link ROLE_READ}). The material is `--x` either way.
   */
  const paintedBy = (declaration: string, body: string): string | null =>
    body.match(
      new RegExp(
        String.raw`${declaration}: "${ROLE_READ}var\((--[a-z0-9-]+)\)${ROLE_READ_END}"`,
      ),
    )?.[1] ?? null;

  const groundOf = (name: string): string | null =>
    paintedBy("background", bandBody(name));

  for (const file of [CARD_BANDS, SEAL_BANDS]) {
    it(`declares every band ${file} paints`, () => {
      // The census: without it a new band on a borrowed token passes every row.
      // `\(` not `\(\)`: see {@link bandBody}.
      const declared = [...SOURCES.get(file)!.matchAll(/function (\w+Band)\(/g)].map(
        (match) => match[1],
      );
      expect(
        [...declared].sort(),
        "a new band owes this table a row saying which material it stands on (#2635)",
      ).toEqual(
        BAND_GROUNDS.filter((row) => row.file === file)
          .map((row) => row.band)
          .slice()
          .sort(),
      );
    });
  }

  for (const { band, ground, role } of BAND_GROUNDS) {
    it(`${band} grounds on ${ground} — ${role}`, () => {
      expect(
        groundOf(band),
        `${band}'s ground moved. A band stands on a token named for the band or for a material the kit draws; if the move is deliberate, edit the row above and say which material it is now.`,
      ).toBe(ground);
    });
  }

  it("no band borrows a hairline or the sigil's disc", () => {
    // The two borrowings actually seen (a divider, a mark's ground), by name.
    const borrowed = BAND_GROUNDS.map((row) => [row.band, groundOf(row.band)] as const).filter(
      ([, ground]) => ground !== null && /-hair$|-sigil-ground$/.test(ground),
    );
    expect(
      borrowed,
      "a hairline is a divider and a sigil ground is what sits behind a mark; neither is a band (#2635)",
    ).toEqual([]);
  });

  it("the two bands on a faction fill hand the mark an ink it can be seen in", () => {
    // A faction's mark vanishes on its own hue (UA glow 1.30, Coven 3.15), which
    // is what `CardMasthead`'s `markColor` is for.
    for (const [band, ink] of [
      ["UaBand", "--faction-ua-mast-ink"],
      ["CovenBand", "--faction-coven-mast-ink"],
    ] as const) {
      expect(
        bandBody(band),
        `${band} paints a faction fill, so its mark needs \`markColor\` — the sigil's own default is the ground's own hue`,
      ).toContain(`markColor="var(${ink})"`);
    }
  });

  it("the two seal-only bands letter in the na card's ink and hand the mark nothing", () => {
    // #2648's bands letter in the na card pairing (ROLE_PAIRS). No `markColor`
    // on purpose: their sigils are filled from `--faction-default-rainbow-conic`
    // (#783); a flat colour would flatten the spectrum.
    for (const band of ["AlbescentBand", "DefaultBand"] as const) {
      const body = bandBody(band);
      expect(
        paintedBy("color", body),
        `${band} letters in the na card's ink, which is what its ground is measured against`,
      ).toBe("--faction-default-card-text");
      expect(
        body,
        `${band}'s mark is spectrum-filled and carries no hue — an ink here would flatten it`,
      ).not.toContain("markColor");
    }
  });
});
