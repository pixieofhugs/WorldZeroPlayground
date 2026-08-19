/**
 * Part A of the contrast foundation (#651) — the token-value test.
 *
 * WHY THIS EXISTS. The same contrast bug has been fixed three times, one
 * instance at a time (#595, #594, #649), and each eyeball audit left siblings
 * alive. 7 factions x 2 themes x ~6 surfaces is a few hundred pairings; no
 * human and no file-reading agent covers that reliably. So the audit is
 * mechanical — and once mechanical, the audit and the regression guard are the
 * same artifact. SPEC-faction-ui-profile.md §4 item 15 already *requires* AA
 * verification at faction registration; this is the test that bullet always
 * should have been.
 *
 * WHAT IT CATCHES. The *value* shape of the bug: a token whose declared color
 * simply doesn't clear AA against the surface it is documented to sit on, in
 * either theme. It cannot catch the *pairing* shape (a component grabbing
 * `--everymen-ink` for text on `--everymen-paper`) — pairings only exist once
 * rendered, which is what `e2e/contrast.spec.ts` (Part B) is for.
 *
 * THE MANIFEST is the §3 token contract, not a guess: the standard
 * `--faction-{key}-card-*` suffix set, the faction fills under
 * `--color-text-on-accent`, and the archetype-private primitives whose roles
 * index.css states verbatim ("text on gold/parchment elements", "bright text
 * on dark elements", "primary text on vellum").
 *
 * ALPHA IS COMPOSITED. Several inks are rgba, and measuring them un-composited
 * is exactly what let #594's 2.78:1 muted ink ship green.
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
import { readStripped, sourceFiles, toRelative } from "../../test/sourceScan";
import { readThemes, resolveVar, stripComments, type Theme } from "./cssVars";

const CSS_PATH = fileURLToPath(new URL("../../index.css", import.meta.url));
const THEMES = readThemes(readFileSync(CSS_PATH, "utf8"));
const BOTH_THEMES: Theme[] = ["light", "dark"];

/** Every faction that supplies the standard `--faction-{key}-card-*` block (§3). */
const CARD_KEYS = [
  "ua",
  // `wow` supplied the §3 block and nothing more until #896 gated the chronicle
  // primitives, so it now appears here AND in ARCHETYPE_PAIRS below. The §3
  // block still covers four of the kit's six stated pairs on its own — see the
  // WOW comment down there for which.
  "wow",
  "everymen",
  "coven",
  "snide",
  "ephemerists",
  "singularity",
  "default",
] as const;

/**
 * Factions whose primary is a solid fill that carries text. `default` (na) is
 * absent on purpose: ADR-0039 says the unaffiliated fill is a *gradient*, not
 * a hue, and its neutral `--faction-default` hex is canvas/SVG only — it is
 * never a text backdrop. That is why #649 counts 14 pairs (7 x 2), not 16.
 */
const FILL_KEYS = CARD_KEYS.filter((key) => key !== "default");

type Pair = {
  /** Human label — this is what a failure message has to make actionable. */
  what: string;
  surface: string;
  text: string;
  /**
   * A translucent layer sitting BETWEEN the surface and the text — a banner
   * wash, a scrim, a tint (#694). A literal CSS colour where the wash is a
   * component's own and not a declared token; a `--var` name where it IS one
   * (#1169 minted `--color-danger-veil` / `--color-warning-veil`, so the two
   * moderation badges name their tokens rather than restating their rgba).
   *
   * Without this the manifest can only ask "is this ink legible on that sheet",
   * which is the wrong question the moment anything is laid over the sheet —
   * and "the pair measured is not the pair on screen" is precisely the shape of
   * bug that got past both guards in #694.
   *
   * AN ARRAY IS A STACK, applied outermost-last (#1715). A selected faction
   * filter row is page -> `--filter-well` -> `--filter-thumb` -> ink: two washes
   * of the same token at two alphas, and it is the tightest neutral ground in
   * the app. One wash short is how this issue's first measurement read the
   * profile card as fine — the answer moves by ~0.5 of a ratio point per layer,
   * which is the whole margin at stake.
   */
  veil?: Veil | Veil[];
  /** AA floor. Defaults to 4.5; set AA_LARGE only where the role is large display type. */
  floor?: number;
};

/**
 * A veil is either a literal (see above) or A DECLARED TOKEN AT AN ALPHA (#1302).
 *
 * The literal form cannot express `color-mix(in srgb, var(--faction-x-card-notice)
 * 8%, transparent)`, because the colour it names is per-faction — and writing the
 * resolved hex here is exactly the raw-`rgba()`-of-a-token's-own-hue costume #1169
 * named. So the wash gives its token and its alpha, and the resolver composites
 * `alpha x token` over the ground, which is what `color-mix(… N%, transparent)`
 * computes.
 *
 * It matters that the wash is a MIX OF THE INK ITSELF: such a veil always pulls
 * the ground toward the ink, so it can only ever tighten the reading. That is how
 * the mode chip's shipped 12% wash was caught at 4.41:1 on the Ephemerists plate
 * while the same ink cleared 5.20:1 on the bare sheet.
 */
type Veil = string | { token: string; alpha: number };

const CARD_PAIRS: Pair[] = CARD_KEYS.flatMap((key) => [
  { what: `${key} card body text`, surface: `--faction-${key}-card-bg`, text: `--faction-${key}-card-text` },
  { what: `${key} card muted text`, surface: `--faction-${key}-card-bg`, text: `--faction-${key}-card-muted` },
  // "metadata / decorative accent" (§3) — metadata is text, so it owes 4.5:1.
  { what: `${key} card accent`, surface: `--faction-${key}-card-bg`, text: `--faction-${key}-card-accent` },
]);

/**
 * #649 — text on each faction's solid fill. The global `--color-text-on-accent`
 * (#ffffff) failed AA on 7 of these 14 pairs, so each faction now owns a
 * per-theme `--faction-{key}-on-fill` (white or ink); this measures that token.
 */
const FILL_PAIRS: Pair[] = FILL_KEYS.map((key) => ({
  what: `${key} fill, on-fill`,
  surface: `--faction-${key}`,
  text: `--faction-${key}-on-fill`,
}));

/**
 * #924 — text on each comment voice's COMPOSER ACCENT. The submit button is
 * painted in the accent the voice passes, NOT the fill, so this is a distinct
 * question from FILL_PAIRS: WOW's accent is plum (white legible), its fill is
 * gold (ink legible). The surface here is the exact var each voice hands
 * `ComposerControls` as `accent` — most send `card-accent`, but SNIDE sends
 * `--faction-snide-pink` and Singularity sends `--faction-singularity-card-text`,
 * so the surface column cannot be generated from the key. `default` (na) is
 * INCLUDED here where FILL_PAIRS omits it: the na composer paints its button in a
 * solid accent (not the rainbow), so `--faction-default-on-accent` is real text.
 *
 * SEVEN, NOT EIGHT (#1232). `EphemeristsComment` no longer passes an `-on-accent`
 * at all: the Valley plate gave the voice its own CTA pair (`-plate-cta-bg` /
 * `-plate-cta-ink`, measured by `ephemerists plate CTA band` below), which left
 * `--faction-ephemerists-on-accent` with no reader anywhere in the app except the
 * row that measured it. A row whose only consumer is itself is not coverage, so
 * the token and the row went together.
 *
 * The remaining seven were re-checked against their voices at the same time. Two
 * name an ALIAS rather than the literal var the voice passes — everymen's
 * `-card-accent` resolves to `--everymen-red` and singularity's
 * `-card-text` to `--faction-singularity-term-bright`, both value-for-value — so
 * they measure the pairing that is on screen. Coven's does not: the voice sends
 * `--faction-coven-slip-cta-from` / `-cta-ink`, which `coven slip CTA band top`
 * already measures, so coven's row here is the same dead shape ephemerists had.
 * It is left standing because `--faction-coven-on-accent` still has a reader; if
 * that ever goes, this row should follow ephemerists'.
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
 * #694 — the COLLAB ROSTER's functional inks, on every faction sheet.
 *
 * WHY THIS BLOCK IS DIFFERENT FROM THE ONES BELOW. Everything else in
 * ARCHETYPE_PAIRS is a role index.css states in words. These two tokens exist
 * because a *shared* component paints its state colours on eight different
 * faction sheets, and neither guard could see that:
 *
 *   - This test measures a token against the surface its DOCUMENTATION names.
 *     `--color-warning` documents no faction surface at all, so no row of this
 *     file could ever have named the pairing. The manifest is authored from
 *     index.css's stated roles, and "the collab roster paints this on UA's
 *     cream" was not one.
 *   - `e2e/contrast.spec.ts` walks `/`, `/tasks`, `/praxis`, `/leaderboard`,
 *     `/factions` and `/factions/{slug}`. The composer is on none of them, and
 *     the roster only renders at >= 2 members with a MIXED cast state — a
 *     fixture no route walk reaches. So the sweep never rendered the surface.
 *
 * The rows are generated over CARD_KEYS rather than typed out because the
 * whole point is that the ink has to clear on ALL eight, not on the one that
 * got reported. `default` is included: `factionCssVar` maps na and albescent
 * to it, and the read-only roster on the praxis detail page is where they land.
 *
 * The notice ink is measured twice. The holdout banner lays it over an amber
 * veil (`rgba(234,179,8,0.08)`), which moves the ground toward the ink on a
 * light sheet and away from it on a dark one — either way the veiled reading
 * is the tighter of the two, so it is the one that gates.
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
  // A CAST row fills with the faction's own sheet and sets its own ink, so the
  // name and the "· you" byline are `card-text` / `card-muted` on `card-bg` —
  // pairings CARD_PAIRS has gated since #651. They are deliberately not
  // repeated here; a second name for one measurement is what the WOW block
  // below warns about. The cast pill is `card-accent` on the same sheet, which
  // is `{key} card accent` up there — and for everymen / coven / ephemerists
  // that pair is BASELINE debt owned by #651. #694 does not make it worse (the
  // fill it replaced measured 1.05:1) and does not fix it either.
]);

/**
 * #2269 / #2267 — THE COLLAB BLOCK, ON THE GROUND ITS COMPOSER ACTUALLY PAINTS.
 *
 * ROSTER_PAIRS above measures the roster's inks against `--faction-{key}-card-bg`,
 * and the owner's #2269 ruling keeps it there: the composer IS the card's
 * surface, so the roster is right to read the card family. That ruling is a
 * statement about which FAMILY, and this block is the other half — whether the
 * ground each archetype hands the block is in fact that family's ground.
 *
 * For seven skins it is, exactly or within a hair:
 *
 *   ua · wow · default   `--faction-{key}-card-bg`, the same token
 *   everymen             `--everymen-paper`, which `-card-bg` aliases
 *   ephemerists          `--faction-ephemerists-plate-bg`, which `-card-bg`
 *                        aliases since #2141
 *   coven                `--faction-coven-ward-card`, the ward panel — a
 *                        DIFFERENT token from `-card-bg`, and lighter
 *   singularity          `--faction-singularity-term-bg`, the chassis — also a
 *                        different token, and lighter in the light half
 *
 * S.N.I.D.E. IS THE ONE THAT IS NOT, and the reason this block exists. Its
 * composer wears the flyposted WALL (#2177), while `--faction-snide-card-*` is
 * pinned photocopier-black in BOTH themes for the slabs pasted ON that wall
 * (#2066; `factionMarks/snideAtoms` states the rule). `-card-muted` — "faded
 * newsprint grey on ink" — measured 1.24:1 there, which is the ghost box and
 * ghost text #2267 was filed from. That skin now hands in wall-measured tokens,
 * so its rows resolve through SNIDE_WALL_PAIRS instead and only the cast pill's
 * fill pair, which nothing else gates, is added here.
 *
 * THE `quiet` ROW IS THE ONE THE `+ invite` CHIP READS, and it is deliberately a
 * second name for a measurement some other row also makes — the same call #694
 * made above, and for the same reason: the ratio is not the fact at risk, the
 * SITE is. A skin that repoints its quiet tier has to stay legible at this site
 * too, and no row named for a brief or a caption says so.
 */
const COLLAB_SKINS = [
  {
    key: "ua",
    source: "pages/editPraxis/archetypes/UaEditPraxis.tsx",
    ground: "--faction-ua-card-bg",
    quiet: "--faction-ua-card-muted",
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
    quiet: "--faction-default-card-muted",
  },
  {
    key: "everymen",
    source: "pages/editPraxis/archetypes/EverymenEditPraxis.tsx",
    ground: "--everymen-paper",
    quiet: "--everymen-muted",
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
    quiet: "--faction-coven-slip-soft",
  },
  {
    key: "singularity",
    source: "pages/editPraxis/archetypes/SingularityEditPraxis.tsx",
    ground: "--faction-singularity-term-bg",
    quiet: "--faction-singularity-term-dim",
  },
  {
    key: "snide",
    source: "pages/editPraxis/archetypes/SnideEditPraxis.tsx",
    // The tighter of the wall's two ramp stops. The two washed corners are
    // SNIDE_WALL_PAIRS' four-reading generator, which already carries every ink
    // this skin hands in.
    ground: "--faction-snide-wall-deep",
    quiet: "--faction-snide-composer-muted",
  },
] as const;

/**
 * The card-family inks the roster still resolves through `factionCssVar`, on the
 * composer ground rather than on `-card-bg`. Skipped for the S.N.I.D.E. skin,
 * which overrides all three with wall tokens.
 */
const COLLAB_FALLBACK_KEYS = COLLAB_SKINS.filter((skin) => skin.key !== "snide");

const COLLAB_PAIRS: Pair[] = [
  ...COLLAB_SKINS.map((skin) => ({
    what: `${skin.key} collab quiet tier, on its composer ground`,
    surface: skin.ground,
    text: skin.quiet,
  })),
  ...COLLAB_FALLBACK_KEYS.flatMap((skin) => [
    {
      // The holdout notice lays the banner's OWN ink at 8% under itself (#1609),
      // which always pulls the ground toward the ink — so the veiled reading is
      // the tighter one and the only one worth gating.
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
    // NO `accent as ink` ROW, and this is the same call ROSTER_PAIRS makes
    // above rather than an omission. `accent` is the roster's DONE tier and it
    // is spent as an ink twice — the waiting notice and the nudge control — but
    // that is `{key} card accent` in CARD_PAIRS, which for everymen and coven is
    // BASELINE debt owned by #651. Measured on the composer grounds it reads
    // 4.49:1 / 4.16:1 (everymen paper, light / dark) and 2.98:1 (coven ward
    // panel, light) — the same three failures at the same three ratios, because
    // the composer sheet and the card sheet are the same stock. #2269 does not
    // make it worse and does not fix it, and the ratchet only ever shrinks, so
    // the debt stays named where it already is instead of gaining a second row.
    // `accentInk` is the seam that will carry the fix when #651 reaches it.
  ]),
  // S.N.I.D.E.'s cast pill is acid as a FILL with the press's near-black on it,
  // and that pair is `snide badge chip, glyph` in the #2227 block at the foot of
  // this file — same two theme-invariant pigments, already gated in both halves.
];

/**
 * #1302 — THE PRAXIS CARD'S ADMIN OVERLAY AND MODE CHIP, on all eight sheets.
 *
 * The third instance of the shape #694 and #1168 already fixed twice, and the
 * one nobody had measured: `components/praxisCard/shared.tsx` is a SHARED
 * component mounted inside every faction's praxis-card frame, and it painted the
 * app's global `--color-danger` / `--color-warning` / `--color-success` — inks
 * chosen against a near-white page — straight onto cream, vellum, papyrus, a
 * pink ward slip and two near-black plates. Every one of those pairings failed
 * AA in light; see the PR table.
 *
 * THE SURFACE COLUMN IS THE SHEET THE CARD ACTUALLY PAINTS, not
 * `--faction-{key}-card-bg`, and for half the set those differ:
 *
 *   ua           `--faction-ua-panel`            the parchment ramp's DARKEST stop
 *                                                (`--faction-ua-card-parchment` is a
 *                                                gradient; `parseColor` cannot read
 *                                                one, and the tightest stop is the
 *                                                only honest scalar reading — the
 *                                                same call `ua leaf darkest stop` makes)
 *   coven        `--faction-coven-ward-card`     the ward panel, not the slip
 *   (ephemerists  WAS in this list and left it in #2141. `-card-bg` aliased the
 *                 cornice band, a different sheet from the plate this card
 *                 paints; the owner ruling repointed it at `-plate-bg`, so the
 *                 name and the sheet are one token again and the crossing this
 *                 map existed to record is gone rather than remapped.)
 *   wow          `--faction-wow-chronicle-bg`    same value as `-card-bg` today, a
 *                                                different token tomorrow (the reason
 *                                                the snide composer block gives)
 *
 * That is WORLD_ZERO_STYLE §3's "when a surface gains a sheet, re-measure the
 * inks it already had" — `ROSTER_PAIRS` gates these same inks on `-card-bg`, and
 * for those four factions that is not the sheet in question.
 */
const PRAXIS_CARD_SHEET: Record<(typeof CARD_KEYS)[number], string> = {
  default: "--faction-default-card-bg",
  ua: "--faction-ua-panel",
  everymen: "--faction-everymen-card-bg",
  coven: "--faction-coven-ward-card",
  // The FLYPOSTED WALL since #2177, at the ramp's deep stop — its other three
  // readings (the top of the ramp and the two washed corners) are measured in
  // SNIDE_WALL_PAIRS below, and the black dress the card wears on task detail
  // is measured there too.
  snide: "--faction-snide-wall-deep",
  wow: "--faction-wow-chronicle-bg",
  // The same token `--faction-ephemerists-card-bg` aliases since #2141. Kept
  // spelled out rather than dropped to the default: this map is read as the
  // list of sheets a praxis card paints, and an entry that agrees with the
  // default is still an answer.
  ephemerists: "--faction-ephemerists-plate-bg",
  singularity: "--faction-singularity-card-bg",
};

/**
 * The four whose sheet is a different TOKEN from `--faction-{key}-card-bg`.
 *
 * EPHEMERISTS LEFT IN #2141 (owner ruling). Its `-card-bg` now aliases
 * `-plate-bg`, which is the sheet its praxis card paints, so `ephemerists
 * praxis card sheet, muted ink` would resolve the identical (ink, ground) pair
 * as `ephemerists card muted text` in CARD_PAIRS — a second name for one
 * measurement, which is the thing this file keeps warning about. The pairing is
 * still gated; it is gated once.
 */
const OWN_SHEET_KEYS = ["ua", "coven", "wow", "snide"] as const;

/**
 * WHICH INK THE CARD'S SHARED SLOTS ACTUALLY RESOLVE (#2177).
 *
 * `sheetInk` types `--faction-{key}-card-{role}` and nothing else, so for seven
 * factions the name in the component IS the token measured here. S.N.I.D.E. is
 * the eighth: its card wears a ground that FLIPS (the wall) while `-card-*` is
 * pinned near-black in both themes for the slabs pasted ON that wall (#2066), so
 * the frame RE-POINTS those four custom properties on its own root to the wall's
 * family. The cascade is the seam — `.snd-praxis-*` in index.css — and this map
 * is what keeps the manifest measuring the token the cascade delivers rather
 * than the name the shared component happens to type.
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

/**
 * The chip's own wash, as a fraction of the ink printed on it. 8%, not the 12%
 * that shipped: a mix of the ink's own hue only ever pulls the ground toward the
 * ink, and 12% took the Ephemerists plate to 4.41:1 (8% reads 4.66:1, and the
 * tightest in the family). See `Veil`.
 */
const CHIP_WASH = 0.08;

const PRAXIS_CARD_PAIRS: Pair[] = [
  ...CARD_KEYS.flatMap((key) => {
    const surface = PRAXIS_CARD_SHEET[key];
    const notice = cardInk(key, "notice");
    const alarm = cardInk(key, "alarm");
    return [
      // The two moderation badges, and the two moderator controls that sit side
      // by side above them (#1449). Each mark is measured under THE VEIL IT IS
      // PAINTED ON, and after the alarm ink lands that is one veil per mark:
      // the flagged badge and the `hide` control take the alarm ink on the
      // danger veil, the failed badge and the `fail` control the notice ink on
      // the warning veil.
      //
      // Both marks used to read the notice ink, so both veils had to be
      // measured against that one token — which of the two gated FLIPPED with
      // the theme (danger is 5% in light against warning's 5%, on a red rather
      // than an amber; both jump to 14% in dark). One ink per veil retires that
      // question rather than answering it.
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
      // `moderateError` — the paragraph a failed hide/fail call writes — sets
      // the alarm ink straight on the sheet, with nothing over it. The veiled
      // row above is the tighter reading on all eight sheets in both themes
      // today, because a veil made of the mark's own polarity always pulls the
      // ground toward the ink; that is a property of two alpha values rather
      // than of the family, so the bare pairing is NAMED rather than inferred
      // from the veiled one.
      { what: `${key} praxis card error text, alarm ink`, surface, text: alarm },
      // The mode chip — "Duel" / "Collaboration · N" / "still open". Ink, wash
      // and rule all come off ONE faction ink now, which is what #694 means by
      // "a row that paints its own ground must paint its own ink".
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
  // The BARE-sheet muted reading, for the four sheets `-card-bg` does not stand
  // in for: the `hidden` badge sets the muted ink there (its 5% wash is gone —
  // see the component). For the other five keys that is `{key} card muted
  // text`, and a second name for one measurement is what this file keeps
  // warning about.
  //
  // A bare NOTICE row used to sit beside it, for `moderateError`. That
  // paragraph reads the alarm ink now (#1449) and nothing on this card paints
  // the notice ink bare any more, so the row lost its consumer and went — the
  // notice ink is still measured on these four sheets, under the warning veil,
  // which is the tighter of the two readings anyway.
  ...OWN_SHEET_KEYS.flatMap((key) => [
    {
      what: `${key} praxis card sheet, muted ink`,
      surface: PRAXIS_CARD_SHEET[key],
      text: cardInk(key, "muted"),
    },
  ]),
];

/**
 * ── S.N.I.D.E. WEARS ONE GROUND: THE FLYPOSTED WALL (#2177) ─────────────────
 *
 * The owner's ruling puts the composer and the praxis card on the same ground
 * the task card already wore, so three surfaces' worth of ink lands on one
 * stock — and the ink each of them brought was measured on a stock it no longer
 * has. The composer's tiers were read on `-composer-sheet` (flat xerox stock);
 * the praxis card's were read on `-card-bg`, which is near-black in BOTH themes
 * while the wall FLIPS.
 *
 * THE WALL IS FOUR GROUNDS, NOT ONE, and that is why this block exists rather
 * than one row per ink. It is a 180deg ramp from `-wall` to `-wall-deep` with an
 * acid wash off the top-left corner and a pink one off the bottom-right, so an
 * ink that clears at the top of the ramp can miss in a corner — the shape #1028
 * names and #1451 already hit once on the detail page's own ramp. Measured
 * flat, `-note-muted` reads 4.92:1 in light; under the pink wash it is 4.22:1,
 * and that corner is where a tall composer puts its footer.
 *
 * WHAT IS NOT MODELLED: the raster and the scanline. Both are ~5% of a near-
 * black over the whole stock at a 1-in-4 duty, so no glyph sits on one — they
 * average into the ground rather than becoming it, and treating a 2px stripe as
 * a surface would gate every ink on a texture no reader resolves. The corner
 * washes are solid area tints and are modelled.
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
 * Every ink S.N.I.D.E. prints straight on that wall, across the four surfaces.
 * The `-note-*` tiers are the clipping's (task card, praxis card, both detail
 * columns); the `-composer-*` tiers are the sheet's. They carry the same values
 * today and stay two families for #1181's reason.
 *
 * The FOURTH surface is the faction page itself (#2343): its hero and all four
 * panels stopped grounding on the invariant press ink and took this wall, so
 * every tier below is read there too. Two rows are new with it — both are inks
 * that already existed for this ground and were only ever measured UNDER a wash
 * (the badge's danger veil, the mode chip's own 8%), and the faction page reads
 * them BARE: `-wall-credit` as the marker scrawl over the About flyer and the rap
 * sheet, `-wall-alarm` as the join error. A reading through a veil does not vouch
 * for the reading without one, which is #1028 in the direction people forget.
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
] as const;

const SNIDE_WALL_PAIRS: Pair[] = [
  ...SNIDE_WALL_GROUNDS.flatMap(({ where, surface, wash }) => [
    ...SNIDE_WALL_INKS.map(([role, text]) => ({
      what: `snide ${where}, ${role}`,
      surface,
      veil: wash,
      text,
    })),
    // The praxis card's three functional inks, on the ground the frame's
    // re-point measures them against (see PRAXIS_CARD_INK). The generated rows
    // above cover the deep stop; these are the other three readings.
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
    // The composer's error banner, which moved stock with the composer.
    {
      what: `snide ${where}, composer error banner alarm ink under the danger veil`,
      surface,
      veil: [wash, "--color-danger-veil"].filter((layer) => layer !== undefined) as Veil[],
      text: "--faction-snide-composer-alarm",
    },
  ]),
  // ── THE ONE EXCEPTION: the praxis card on TASK DETAIL is black ───────────
  //
  // A wall inside a wall stops reading as a thing pasted ON something (#2066's
  // ruling, restated by #2177), so on the detail page the card is a slab and
  // its shared slots resolve the `-card-*` family they were always measured on.
  // `{key} card body/muted/accent` already pin the three reading inks on that
  // ground; these are the three functional inks the generator used to cover for
  // snide before its sheet became the wall.
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
  // The score stamp is a black well punched into the card, and it is the one
  // thing inside the frame that keeps the slab's inks on BOTH dresses — which
  // is only true while its plate is OPAQUE. It was a 40% black over the card,
  // so on the wall's light half it composited to mid-grey and took the acid
  // figure to 2.71:1. See `--faction-snide-stamp-bg`.
  {
    what: "snide score stamp plate, acid figure",
    surface: "--faction-snide-stamp-bg",
    text: "--faction-snide-acid",
  },
  {
    what: "snide score stamp plate, typed caption",
    surface: "--faction-snide-stamp-bg",
    text: "--faction-snide-vote-off",
  },
];

/**
 * The Singularity seal's inner panel — the accent phosphor at 5% over the
 * always-dark chassis (`GLASS` in `SingularityDuelSealConfirm`). Theme-invariant,
 * like everything else in that skin. Written as a literal for the reason `Pair.veil`
 * states: it is a component's own wash, not a declared token.
 */
const SEAL_GLASS_VEIL = "rgba(74,222,128,0.05)";

/**
 * Archetype-private primitives. Each entry is a role index.css states in
 * words; nothing here is inferred from how a component happens to use a token.
 */
const ARCHETYPE_PAIRS: Pair[] = [
  // Everymen — "the paper surface + its text FLIP in dark"; ink is structure:
  // "borders, rules, text on gold/parchment elements".
  { what: "everymen paper", surface: "--everymen-paper", text: "--everymen-paper-text" },
  // The stock the SAME ink lands on one rung down (#2133). `.em-backdrop` ramps
  // from the paper to the deep stock and then vignettes 55% of the deep stock
  // over the whole thing, so the page's ground is not one flat token — a
  // heading near the bottom of the faction page is reading against this end of
  // it, and only the paper end was measured.
  { what: "everymen deep stock, ink", surface: "--everymen-paper-deep", text: "--everymen-paper-text" },
  { what: "everymen paper, muted", surface: "--everymen-paper", text: "--everymen-muted" },
  { what: "everymen cream element, ink", surface: "--everymen-cream", text: "--everymen-ink" },
  { what: "everymen gold element, ink", surface: "--everymen-gold", text: "--everymen-ink" },
  { what: "everymen poster field, cream", surface: "--everymen-field", text: "--everymen-cream" },

  // Ephemerists — "the VELLUM surface + its text FLIP in dark"; --eph-ink
  // "stays dark in both themes"; --eph-parchment is "bright text on dark elements".
  { what: "ephemerists vellum", surface: "--eph-vellum", text: "--eph-vellum-text" },
  { what: "ephemerists vellum, muted", surface: "--eph-vellum", text: "--eph-muted" },
  { what: "ephemerists vellum, rubric", surface: "--eph-vellum", text: "--eph-rubric" },
  { what: "ephemerists gold element, ink", surface: "--eph-gold", text: "--eph-ink" },
  { what: "ephemerists parchment element, ink", surface: "--eph-parchment", text: "--eph-ink" },
  { what: "ephemerists lapis field, parchment", surface: "--eph-field", text: "--eph-parchment" },

  // S.N.I.D.E. — the flyposted wall is the one SNIDE surface that flips.
  { what: "snide flyposted wall", surface: "--faction-snide-wall", text: "--faction-snide-wall-text" },
  { what: "snide deep wall", surface: "--faction-snide-wall-deep", text: "--faction-snide-wall-text" },
  { what: "snide xerox paper, ink", surface: "--faction-snide-paper", text: "--faction-snide-ink" },

  // (The legacy UA gilt-salon family was measured here until #853 deleted it.
  // Every surface that painted with it now reads the sun-bleached primitives
  // below, which are measured in BOTH themes rather than light only.)

  // UA — the sun-bleached practice (#788, #848). UA is the first faction with
  // FOUR themed surfaces (page ground, card, inset panel, raised lift) rather
  // than one, and a minimal desert palette sits in a narrow luminance band, so
  // an ink that clears the card can still fail the ground two steps away. That
  // is exactly how the design kit shipped a 4.38:1 muted; every ink is
  // therefore measured against every surface it is allowed to sit on.
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
  // The two UA colours that do NOT owe 4.5:1, and why. Both are documented
  // roles, not exemptions: --faction-ua is a fill and large-type hue (4.04:1 as
  // body text on the card, which is why --faction-ua-card-accent exists), and
  // --faction-ua-vermil sets the ensō score numeral at display size. There is a
  // third UA colour below AA — --faction-ua-glow, 3.12:1 — and it is absent on
  // purpose: it is ornament (the ensō stroke, the mandala) and never text, so
  // it has no text/background pair to measure.
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

  // WOW — the cream/gold/plum chronicle (#838, ADR-0050). The faction kit
  // states six contrast pairs; FOUR of them are the §3 card block measured in
  // both themes, so CARD_PAIRS already gates them and repeating them here would
  // be a second name for one measurement:
  //   text / card-bg  (both themes) = `wow card body text`
  //   plum / card-bg  (both themes) = `wow card accent`
  // What is left are the chronicle's own primitives, which no generator reaches.
  //
  // The kit's "on-fill / gold" pair puts ink on the frame gold. Its stated ink
  // #2a1d02 has no token and does not need one: --faction-wow-on-gold is the
  // WOW ink, is theme-invariant like the gold it sits on, and measures 7.64:1
  // where the kit's own value manages 6.68:1 — not the 8.1:1 the kit claims.
  //
  // THE TEXT COLUMN SAID `-on-fill` UNTIL #2068 and this row is how that was
  // caught. The two tokens held the same near-black, so the borrow was free
  // right up to the moment the spine hue stopped being a gold: a plum fill needs
  // white, and white on this gold is 2.47:1. A row that names the ink by the
  // ground it was measured on cannot be re-broken by a hue change somewhere else
  // (WORLD_ZERO_STYLE §3, #1766).
  { what: "wow chronicle gold element, ink", surface: "--faction-wow-chronicle-gold", text: "--faction-wow-on-gold" },
  // The kit's "gold / card-bg dk" pair. The bright total is a *dark*-theme
  // value; measuring the token in both themes also gates its light sibling,
  // which the kit never states.
  { what: "wow stamp total, on card", surface: "--faction-wow-card-bg", text: "--faction-wow-stamp-total" },
  // The eyebrow/label ink #896 added. The kit's #8a6d1f fails AA on the cream
  // card (4.46:1) — it was chosen against the kit's near-white documentation
  // plate — so index.css ships it walked down the same hue.
  { what: "wow eyebrow ink, on card", surface: "--faction-wow-card-bg", text: "--faction-wow-accent-deep" },
  // The avatar's rank pill (#897) — the one piece of REAL TEXT the crest
  // composition carries. Ink and lozenge are both theme-invariant stamped metal
  // (the kit draws the same pill on its light and dark avatar plates), so
  // measuring against the gradient's DARKEST stop covers both themes and the
  // whole run of the lozenge.
  {
    what: "wow avatar rank pill ink",
    surface: "--faction-wow-avatar-pill-to",
    text: "--faction-wow-avatar-pill-text",
  },

  // WOW — THE LISTS (#895), the duel seal and the duel rail. The kit states its
  // own four `--faction-wow-duel-*` tokens and a contrast table, and the table
  // is wrong in BOTH directions: it claims 7.2:1 for champion/ink (measures
  // 7.78:1 against its own stated ink, 10.27:1 against the token that actually
  // ships) and 5.3:1 for ribbon/parchment (measures 6.34:1). So these rows exist
  // to hold the measurement, not to restate the claim.
  //
  // Only three of the kit's pairs name a token that is not already gated above:
  // its "headline / card" and "opp name / card" pairs are `--faction-wow-card-*`
  // on the cream, which CARD_PAIRS covers in both themes.
  //
  // The opponent's faction accent is deliberately ABSENT from this list. It can
  // be any hue in the palette, and the whole design of these two surfaces is
  // that it lands only as a rosette ring, a plate edge and a bar — never as an
  // ink and never as a text ground — so there is no text pair to measure. If a
  // future edit paints a string in it, THAT is what needs a row here.
  {
    // The winning stakes tile: WOW's ink on the champion gold. The tile's gold
    // is per-theme (#e7b94e / #e3b84a) and the ink is not, so this measures the
    // pairing twice — 10.27:1 and 10.07:1. `-on-gold`, not `-on-fill`, for the
    // reason the chronicle-gold row above spells out (#2068).
    what: "wow duel champion tile, ink",
    surface: "--faction-wow-duel-champion",
    text: "--faction-wow-on-gold",
  },
  {
    // The losing tile — the ribbon. `--faction-wow-stamp-chip-text` is the
    // parchment that stays parchment in both themes (light: the panel; dark:
    // the card text), which is exactly the kit's #F3E7C4 on its plum.
    what: "wow duel ribbon, parchment ink",
    surface: "--faction-wow-duel-ribbon",
    text: "--faction-wow-stamp-chip-text",
  },
  {
    // The lists ground carries the rail headline and the seal body — the two
    // longest strings on either surface.
    what: "wow duel lists ground, body ink",
    surface: "--faction-wow-duel-lists-bg",
    text: "--faction-wow-card-text",
  },
  {
    // ...and the section eyebrows ("The Roster", "The Stakes") in the same
    // olive-gold #896 walked down off the kit's failing #8a6d1f.
    what: "wow duel lists ground, eyebrow ink",
    surface: "--faction-wow-duel-lists-bg",
    text: "--faction-wow-accent-deep",
  },
  {
    // The ribbon line and the settled standing note, both plum on the ground.
    what: "wow duel lists ground, plum",
    surface: "--faction-wow-duel-lists-bg",
    text: "--faction-wow-card-accent",
  },

  // Coven — THE CANDLELIT SPELL SLIP (task card v2, #1023). The card ground is
  // a four-stop GRADIENT, which is what makes this block necessary: the design
  // annotated its inks against a near-white card, and three of them fail on the
  // gradient's darkest stop (#fbc4dd), so index.css ships them walked down. The
  // surface column below is that darkest stop deliberately — measuring the
  // lightest one would reproduce the design's own mistake.
  //
  // FOUR SURFACES READ THESE ROWS NOW (#2135): the task card, the praxis card
  // and both detail columns. That is also what forced the praxis card's `tint`
  // from DEEP to INK when its ground moved off the ward panel — `tint` is the
  // shared body's `accent`, which paints a collab member's name and a duel
  // rival's name at --text-content straight on the sheet, and DEEP reads 3.33:1
  // there against 4.70:1 on the panel it left. No row records that reading,
  // because after the swap nothing paints it: `coven ward panel, accent ink`
  // below still gates DEEP where DEEP is still text.
  { what: "coven slip, ink", surface: "--faction-coven-slip-mid", text: "--faction-coven-slip-ink" },
  { what: "coven slip, brief", surface: "--faction-coven-slip-mid", text: "--faction-coven-slip-soft" },
  { what: "coven slip, caption", surface: "--faction-coven-slip-mid", text: "--faction-coven-slip-label" },
  // ...and the lavender end of the same ramp, a different hue rather than a
  // lighter shade of the pink, so the stop above does not cover it.
  { what: "coven slip lavender, ink", surface: "--faction-coven-slip-vio", text: "--faction-coven-slip-ink" },
  { what: "coven slip lavender, brief", surface: "--faction-coven-slip-vio", text: "--faction-coven-slip-soft" },
  { what: "coven slip lavender, caption", surface: "--faction-coven-slip-vio", text: "--faction-coven-slip-label" },
  // The CTA is a band, so BOTH its stops carry the label. The design's own two
  // stops gave white 3.44:1 at the top; these are deepened until it clears, and
  // the dark band takes ink rather than white for the reason
  // --faction-coven-on-accent already states.
  { what: "coven slip CTA band top", surface: "--faction-coven-slip-cta-from", text: "--faction-coven-slip-cta-ink" },
  { what: "coven slip CTA band foot", surface: "--faction-coven-slip-cta-to", text: "--faction-coven-slip-cta-ink" },
  // The points numeral never sits on the slip: the sigil's core wash puts its
  // own ground behind it (white on the light slip, near-black on the dark one),
  // which is exactly why that ground is a scalar token rather than an alpha
  // chosen in the component.
  {
    what: "coven sigil ground, points numeral",
    surface: "--faction-coven-slip-sigil-ground",
    text: "--faction-coven-slip-deep",
  },

  // Coven — THE ARCHED POINTS PLATE (score stamp, #2019). The plate is a ramp
  // from `--faction-coven-ward-card` down to `-plate-foot`, so every ink on it
  // is measured on the FOOT: it is the darker stop in BOTH cascades, and
  // measuring the head would repeat the mistake the slip block above records.
  // The three row inks carry the design's colour code (base pink, multiplier
  // gold, votes blue) and ALL THREE of the design's own values fail here in
  // light — 3.27 / 1.89 / 3.18 — which is why index.css ships them walked.
  // 19px/600 serif, 21px on the group subtotal, so AA_NORMAL governs.
  { what: "coven plate, base figure", surface: "--faction-coven-slip-plate-foot", text: "--faction-coven-slip-row-base" },
  { what: "coven plate, multiplier figure", surface: "--faction-coven-slip-plate-foot", text: "--faction-coven-slip-row-mult" },
  { what: "coven plate, votes figure", surface: "--faction-coven-slip-plate-foot", text: "--faction-coven-slip-row-votes" },
  // The meta, group and habit figures take the plain ink, and the ✦-bulleted
  // labels beside all six take the brief ink. Same ground, so the plate's whole
  // working is gated rather than only the coloured half.
  { what: "coven plate, subtotal figure", surface: "--faction-coven-slip-plate-foot", text: "--faction-coven-slip-ink" },
  { what: "coven plate, row label", surface: "--faction-coven-slip-plate-foot", text: "--faction-coven-slip-soft" },
  // The cauldron below it is not on the plate: its own belly is the ground, a
  // 94% wash of the ward paper, and it carries the total and the `points`
  // caption. `coven ward panel, brief` already gates the caption's ink on that
  // stock; the large display figure is the pairing this row adds.
  {
    what: "coven cauldron belly, total figure",
    surface: "--faction-coven-ward-card",
    text: "--faction-coven-slip-deep",
  },

  // Coven — THE CANDLELIT WARD (task detail v2, #1031). The detail page opens
  // the slip out, so the same three inks meet two NEW grounds: the page wash the
  // header sits directly on, and the panel the brief sits on. Both are flat, not
  // gradients, which is why they measure as scalars here — but the page ground
  // additionally carries a haze, and that composited worst case is written out
  // in index.css beside the `--faction-coven-ward-haze` declaration (this test
  // measures declared token values; a radial-gradient bloom is not one).
  { what: "coven ward page, ink", surface: "--faction-coven-ward-page", text: "--faction-coven-slip-ink" },
  { what: "coven ward page, brief", surface: "--faction-coven-ward-page", text: "--faction-coven-slip-soft" },
  { what: "coven ward page, caption", surface: "--faction-coven-ward-page", text: "--faction-coven-slip-label" },
  // THE TWO DETAIL COLUMNS LEFT THAT GROUND (#2135). Both wore
  // `.coven-candle-backdrop` — the ward page under a haze — and both now wear
  // the SLIP, so the copy that sits outside a panel on those pages is measured
  // against the gradient instead. The three rows above stay live and are not a
  // duplicate of these: `CovenFieldDesk` still grounds a whole mobile page on
  // the ward page, and it is the class's one remaining mount.
  //
  // The surfaces are the ramp's two ENDS, for the reason the task card's block
  // gives up top: `-mid` is the darkest stop an ink meets and `-vio` is a
  // different hue rather than a lighter shade of it, so neither covers the
  // other. Same token pair as the card's rows by design — this is the manifest
  // recording that a second surface reads them, which is what makes a future
  // walk-down of one of these inks show up as three failures and not one.
  { what: "coven detail column, ink", surface: "--faction-coven-slip-mid", text: "--faction-coven-slip-ink" },
  { what: "coven detail column, brief", surface: "--faction-coven-slip-mid", text: "--faction-coven-slip-soft" },
  { what: "coven detail column, caption", surface: "--faction-coven-slip-mid", text: "--faction-coven-slip-label" },
  { what: "coven detail column lavender, ink", surface: "--faction-coven-slip-vio", text: "--faction-coven-slip-ink" },
  { what: "coven detail column lavender, brief", surface: "--faction-coven-slip-vio", text: "--faction-coven-slip-soft" },
  { what: "coven detail column lavender, caption", surface: "--faction-coven-slip-vio", text: "--faction-coven-slip-label" },
  { what: "coven ward panel, ink", surface: "--faction-coven-ward-card", text: "--faction-coven-slip-ink" },
  { what: "coven ward panel, brief", surface: "--faction-coven-ward-card", text: "--faction-coven-slip-soft" },
  { what: "coven ward panel, caption", surface: "--faction-coven-ward-card", text: "--faction-coven-slip-label" },
  // The "you already hold this task" band. Candle gold, theme-INVARIANT except
  // for its upper stop, which reads --faction-coven-slip-gold and so brightens
  // in dark; both stops are measured because the ink runs across the whole band.
  { what: "coven hold band top", surface: "--faction-coven-slip-gold", text: "--faction-coven-ward-hold-ink" },
  { what: "coven hold band foot", surface: "--faction-coven-ward-hold-to", text: "--faction-coven-ward-hold-ink" },

  // Everymen — THE HELP WANTED BILL (task card v2, #1023). Short, because the
  // design's palette IS the `--everymen-*` family measured above; only the roles
  // that family had no home for are new.
  { what: "everymen bill masthead", surface: "--faction-everymen-bill-mast", text: "--faction-everymen-bill-mast-ink" },
  { what: "everymen bill CTA bar", surface: "--faction-everymen-bill-cta-bg", text: "--faction-everymen-bill-cta-ink" },
  // The modifier badge's ink, walked down off the design's goldDeep (3.11:1).
  { what: "everymen bill modifier ink", surface: "--everymen-paper", text: "--faction-everymen-bill-mult-ink" },
  // The bill's level caption ("Grade" until #1702 renamed it). Olive on the
  // paper was never measured before this card set a label in it.
  { what: "everymen paper, olive label", surface: "--everymen-paper", text: "--everymen-olive" },
  {
    // The seal's points numeral. Red on the paper is 4.49:1 — a hair under the
    // body floor, which is why nothing on this card sets PROSE in it. The
    // numeral is 32px/24px Bebas, large display type, so AA_LARGE is its floor
    // and it clears with room (the same call `ua primary` makes above). The
    // 8px "POINTS" caption beneath it is stamp text, i.e. ornament (§4).
    what: "everymen seal numeral, large display type",
    surface: "--everymen-paper",
    text: "--everymen-red",
    floor: AA_LARGE,
  },

  // Ephemerists — THE VALLEY PLATE (task card v2, #1023; the register split in
  // two halves in #2141). Four surfaces, not one: the sheet, the cornice's
  // compass-blue band, the medallion's disc and the CTA bar, each carrying its
  // own ink. `-brass` is absent from this list on purpose and for the same
  // reason as WOW's chronicle gold — it rules and frames, it is never painted as
  // text. The caption ink that REPLACED it in the one text slot the design gave
  // it is measured here instead.
  //
  // EVERY ROW HERE IS NOW TWO REAL MEASUREMENTS. Between #1627 and #2141 the
  // whole register was night-valued in both cascades, so each of these ratios
  // was one reading taken twice, and the light column of this file said nothing
  // about the faction at all. The sheet is vellum by day now; what did NOT
  // follow it is the band and the disc, which are the compass blue #12151f in
  // both themes because the metals struck on them have no light value. That
  // asymmetry is the trap the three disc rows below exist to hold shut.
  { what: "ephemerists plate, ink", surface: "--faction-ephemerists-plate-bg", text: "--faction-ephemerists-plate-ink" },
  { what: "ephemerists plate, brief", surface: "--faction-ephemerists-plate-bg", text: "--faction-ephemerists-plate-muted" },
  { what: "ephemerists plate, caption", surface: "--faction-ephemerists-plate-bg", text: "--faction-ephemerists-plate-caption" },
  { what: "ephemerists cornice band, masthead", surface: "--faction-ephemerists-plate-band", text: "--faction-ephemerists-plate-band-ink" },
  // THE TASK CARD'S BAND IS THE DISC NOW (#2067), and that is a NEW pairing
  // rather than the row above wearing a different ground. The restrained
  // masthead grounds on `-plate-disc` — the medallion's own field, two values
  // lighter than the cornice band — and keeps `-plate-band-ink`, so the gold
  // that was measured on #0a0c15 is now also asked to clear #12151f. It does;
  // the row exists so that the NEXT move of this band cannot repeat #1627's
  // failure, where an ink stayed put while the ground under it changed and every
  // row in this file went on passing. #2141 CLOSED THE GAP THIS ROW WAS SPLIT
  // FOR: the cornice band moved onto #12151f too, so the band and the disc are
  // now one hex and both readings are 7.59:1. The row stays anyway — two
  // surfaces that agree today are still two surfaces, and this file's whole
  // method is that a shared value is a coincidence until something asserts it
  { what: "ephemerists card masthead band, wordmark", surface: "--faction-ephemerists-plate-disc", text: "--faction-ephemerists-plate-band-ink" },
  // THE DISC'S INK BUDGET IS THE BAND'S (#2141), and these two rows moved for
  // that reason rather than to make a failing measurement pass. The disc is a
  // THEME-INVARIANT SURFACE; `-plate-ink` and `-plate-muted` became FLIPPING
  // INKS the moment the register grew a vellum half, and the pairings they had
  // held since #1023 went to 1.00:1 (the sheet ink is the same #12151f as the
  // disc in light) and 1.82:1. Both ends stayed real tokens the whole time,
  // which is exactly why no lint, no census and no "is it tokenized" grep could
  // have seen it — only a pairing measured in BOTH themes, i.e. this file.
  // The two inks the compass blue actually admits are the band's own, and they
  // do not flip either: the mark at 7.59:1 and its second tier at 8.37:1.
  { what: "ephemerists medallion disc, points", surface: "--faction-ephemerists-plate-disc", text: "--faction-ephemerists-plate-band-ink" },
  { what: "ephemerists medallion disc, unit", surface: "--faction-ephemerists-plate-disc", text: "--faction-ephemerists-plate-band-quiet" },
  { what: "ephemerists plate CTA band", surface: "--faction-ephemerists-plate-cta-bg", text: "--faction-ephemerists-plate-cta-ink" },
  // THE PROFILE HEADER ADDS NO ROW, and that is the finding rather than an
  // omission. `EphemeristsProfileBody` handed `profileSkin` a kit whose `muted`
  // was `-plate-quiet` — the ink measured for the plate, the page and the panel
  // cells — while its `headerStyle` grounds on the cornice BAND, so five quiet
  // lines inside `<header>` sat on a sheet their ink was never chosen for and
  // read 2.07:1 in light, with every row in this file green.
  //
  // The first fix written was a row for that crossing. It would have measured
  // 6.73:1 and passed, and it would have recorded the WRONG (ink, ground) pair
  // as the intended one: `-plate-band-quiet` is the ink the band owns, it only
  // read 6.73 because #1627 repainted the ground under the bug, and the pairing
  // that ships now — band-quiet on the band — is `ephemerists cornice band,
  // quiet ink` further down, which has gated it since #1199. So the kit grew a
  // `headerMuted` and this file gains nothing: a second name for one
  // measurement is what the WOW block above warns about, and a row that
  // certifies a bug is worse than no row at all.
  //
  // THE LOGGED-OUT VOTE GATE (#1627). `VoteShell`'s gate voice paints
  // `--faction-ephemerists-card-accent`, and `EphemeristsVote` early-returns the
  // gate BEFORE it draws its own night vote plate — so the ink lands on whatever
  // the mounting surface painted, which for both the praxis card and the praxis
  // detail's vote section is `-plate-bg`. A card ink on the plate: the same
  // (ink, ground) crossing the row above records, one surface over, and likewise
  // uncovered — it measured 3.75:1 in dark while `ephemerists card accent` was
  // green against `-card-bg`, the sheet this gate never sits on.
  { what: "ephemerists vote login gate, card accent on the plate", surface: "--faction-ephemerists-plate-bg", text: "--faction-ephemerists-card-accent" },
  // THE FLAGGED BANNER (#1636), on the praxis detail's page ground. Neutral
  // chrome that paints no ground of its own — so it is the same shape as the
  // gate above, and the one a dark-in-light move CREATES rather than exposes.
  // Undressed it read 3.01:1 (body, the app neutral) and 3.68:1 (label,
  // `--color-warning`) once `-plate-page` went dark: both halves failing, and
  // the amber failing as a light-cascade value on a night sheet. Singularity
  // already deviates onto `--color-warning` at 3.78:1 on its own wall, so the
  // precedent settles that the banner may be dressed and not what to dress it
  // in. This is the faction's own attention ink, which is what `-card-notice`
  // is for; the border takes it too, so the mark's ink and rule agree (#1449).
  { what: "ephemerists flagged banner, notice ink on the page ground", surface: "--faction-ephemerists-plate-page", text: "--faction-ephemerists-card-notice" },

  // …and the three surfaces task detail (#1032) added, where the plate stops
  // being one card on the app's ground and becomes the page. `-quiet` exists
  // precisely because of the first row here: the DARKER page ground drops
  // `-muted` to 4.31 and `-caption` to 4.45, both of which measure fine on the
  // plate above. `-nile` was walked for the same reason (4.24 on the page as the
  // design drew it) and carries every link plus the "level met" yes, so it is
  // measured on all three grounds it lands on.
  { what: "ephemerists page ground, quiet ink", surface: "--faction-ephemerists-plate-page", text: "--faction-ephemerists-plate-quiet" },
  { what: "ephemerists page ground, links", surface: "--faction-ephemerists-plate-page", text: "--faction-ephemerists-plate-brass-light" },
  { what: "ephemerists page ground, title", surface: "--faction-ephemerists-plate-page", text: "--faction-ephemerists-plate-ink" },
  { what: "ephemerists plate, quiet ink", surface: "--faction-ephemerists-plate-bg", text: "--faction-ephemerists-plate-quiet" },
  { what: "ephemerists panel cell, ink", surface: "--faction-ephemerists-plate-inner", text: "--faction-ephemerists-plate-ink" },
  { what: "ephemerists panel cell, caption", surface: "--faction-ephemerists-plate-inner", text: "--faction-ephemerists-plate-caption" },
  { what: "ephemerists panel cell, quiet ink", surface: "--faction-ephemerists-plate-inner", text: "--faction-ephemerists-plate-quiet" },
  { what: "ephemerists panel cell, links", surface: "--faction-ephemerists-plate-inner", text: "--faction-ephemerists-plate-brass-light" },
  // OCHRE AS AN INK, which is new in #2145 and is the reason it gets a row.
  // `EphemeristsDuelSealConfirm` records "ochre is a mark, never an ink HERE"
  // and the scope of that word is the papyrus: #a6432b measures 4.46:1 on
  // `-plate-bg`, a near miss, which is why nothing legible is set in it there.
  // The score stamp's metatask line lands on the PANEL CELL, one sheet lighter,
  // at 4.97:1 light and 4.99:1 dark. It reaches this ground by REPLACING a
  // worse reading rather than by relaxing a rule: the row shipped as an
  // 11px `-plate-disc` label on an ochre CHIP, which is the same two colours
  // inverted and therefore the same 3.0007:1 — a normal-text pairing sitting on
  // the LARGE-text floor, and clearing it by seven ten-thousandths at that.
  { what: "ephemerists panel cell, metatask award", surface: "--faction-ephemerists-plate-inner", text: "--faction-ephemerists-plate-ochre" },
  // `ephemerists medallion disc, caption` STOOD HERE and is retired rather than
  // repointed (#2141). It measured `-plate-caption` on the disc, and the caption
  // is a SHEET ink — #6f5620 by day, 2.63:1 on a chip that does not flip — so
  // the medallion's caption took `-band-quiet` with the rose's unit. That makes
  // it byte-identical to `ephemerists medallion disc, unit` above, and a second
  // `what` for one (ink, ground) pair measures nothing new: it is the call the
  // WOW block and the four "checked and deliberately NOT written" pairings make.

  // Singularity — THE TERMINAL SESSION (task card v2, #1023). The one card in
  // the wave that is DARK IN BOTH THEMES (§6), so every row here is measured
  // twice against a near-black ground rather than once against a light one. The
  // light half is the tighter of the two — its chassis is the LIGHTER black —
  // and the design annotated it as though the reverse held, so `-blue` and
  // `-dim` ship walked UP. The chrome bar is the binding surface for both,
  // being lighter than the chassis, so it is what the label rows measure.
  { what: "singularity terminal chassis, title", surface: "--faction-singularity-term-bg", text: "--faction-singularity-term-bright" },
  { what: "singularity terminal chassis, brief", surface: "--faction-singularity-term-bg", text: "--faction-singularity-term-dim" },
  { what: "singularity terminal chassis, boot line", surface: "--faction-singularity-term-bg", text: "--faction-singularity-term-blue" },
  { what: "singularity window bar, process name", surface: "--faction-singularity-term-chrome", text: "--faction-singularity-term-dim" },
  { what: "singularity window bar, ordinal", surface: "--faction-singularity-term-chrome", text: "--faction-singularity-term-blue" },
  // The points well. Its ground is a RESOLVED colour rather than the design's
  // alpha-over-chassis, precisely so this row can exist at all.
  { what: "singularity points well, total", surface: "--faction-singularity-term-readout", text: "--faction-singularity-term-blue-bright" },
  { what: "singularity points well, unit", surface: "--faction-singularity-term-readout", text: "--faction-singularity-term-blue" },
  { what: "singularity CTA, prompt", surface: "--faction-singularity-term-cta-bg", text: "--faction-singularity-term-cta-ink" },
  // THE ONE ROW THE TASK CARD DOES NOT ALREADY MAKE (#2326). The directory tile
  // draws the same key UNLIT at rest and lights it on hover, so its label sits
  // on a 14% wash of `-term-blue` over the chassis rather than on the solid
  // `-term-cta-bg` the row above measures. The wash is only 1.16:1 against the
  // bare chassis, which is the point of writing it down: what makes the control
  // findable is its `-term-bright` edge, not its fill, and what makes the label
  // legible is that the wash barely moves the ground under it. Every other
  // pairing on that tile IS one of the rows above, ink for ground, so none of
  // them is restated here — a second `what` for one pair measures nothing new.
  { what: "singularity tile CTA at rest, label", surface: "--faction-singularity-term-bg", veil: { token: "--faction-singularity-term-blue", alpha: 0.14 }, text: "--faction-singularity-term-bright" },

  // S.N.I.D.E. — THE RANSOM CLIPPING (task card v2, #1023). Unlike the faction's
  // older ink-dark families, this one FLIPS, so each row genuinely measures two
  // different grounds rather than one ground twice. Hot zine pink is the whole
  // story: it is a poster colour, so it survives wherever it is a DRAWN LINE (the
  // pen circle, the struck-out cross — neither is here, because neither is text)
  // and is walked down wherever it carries a word.
  { what: "snide clipping, headline", surface: "--faction-snide-note-paper", text: "--faction-snide-note-ink" },
  { what: "snide clipping, brief", surface: "--faction-snide-note-paper", text: "--faction-snide-note-muted" },
  { what: "snide clipping, points caption", surface: "--faction-snide-note-paper", text: "--faction-snide-note-pink-ink" },
  { what: "snide clipping bar, ordinal", surface: "--faction-snide-note-bar", text: "--faction-snide-note-bar-ink" },
  { what: "snide clipping bar, wordmark", surface: "--faction-snide-note-bar", text: "--faction-snide-acid" },
  // Headline cut 2 — a knockout, which is why it names its own pair instead of
  // reusing paper/ink: those two swap under the cascade and would cancel.
  { what: "snide headline knockout", surface: "--faction-snide-note-knockout-bg", text: "--faction-snide-note-knockout-ink" },
  // Headline cut 1 and the CTA bar are the same pairing — ink on acid — and the
  // acid does not flip, so one row covers both in both themes.
  { what: "snide acid CTA bar", surface: "--faction-snide-note-cta-bg", text: "--faction-snide-note-cta-ink" },
  // The DIRECTORY TILE's CTA on hover (#2322), which floods with the acid
  // itself rather than with `-note-cta-bg`. Same hex today, and deliberately a
  // row of its own: the tile's source names `--faction-snide-acid`, and a
  // fixture that measures a synonym stops measuring the site the day one of the
  // two moves. The resting state is the bar, covered by "clipping bar, wordmark"
  // one block up.
  { what: "snide select tile CTA, hovered", surface: "--faction-snide-acid", text: "--faction-snide-note-cta-ink" },
  // The modifier chip. The design set its label in PAPER on the pink (3.10:1);
  // it takes the near-black CTA ink instead, one value for both themes because
  // `--faction-snide-pink` does not flip either.
  { what: "snide modifier chip", surface: "--faction-snide-pink", text: "--faction-snide-note-cta-ink" },

  // UA — THE VELLUM LEAF (task card v2, #1023). Shortest block in the wave: the
  // design's palette turned out to BE the shipped `--faction-ua-*` family
  // value-for-value, `cardGrad` included (it is `--faction-ua-card-parchment`,
  // both themes), so this card introduced no token at all. What the rows below
  // add is the one surface nothing had measured against — the parchment
  // gradient's DARKEST stop, which is `-panel` by day and `-card-bg` by night.
  // Measuring the lightest stop instead is the mistake wave A caught on Coven.
  { what: "ua leaf darkest stop, title", surface: "--faction-ua-panel", text: "--faction-ua-card-text" },
  { what: "ua leaf darkest stop, brief", surface: "--faction-ua-panel", text: "--faction-ua-card-muted" },
  // The score numeral. The design paints it in `--faction-ua-glow`, which is
  // 2.93:1 here and so misses even AA_LARGE — the ONE ink this card walks down,
  // onto the accent it already owns rather than onto a new token.
  { what: "ua leaf darkest stop, score numeral", surface: "--faction-ua-panel", text: "--faction-ua-card-accent" },
  { what: "ua leaf CTA", surface: "--faction-ua-card-chip-bg", text: "--faction-ua-card-chip-ink" },
  // The one row #2324 owed. The DIRECTORY TILE now wears the leaf's register,
  // and every ink it paints was already measured by the four rows above — with
  // this exception: the tile's CTA has a hover the card's has not, and it swaps
  // the chip's ground for `-card-accent` while keeping `-card-chip-ink` on top.
  // `--faction-ua-on-accent` measures the same two hexes today, but a fixture
  // that measures a synonym stops measuring the site the day one of the two
  // moves — so the pairing is written at the names the tile actually names.
  { what: "ua leaf CTA, hovered", surface: "--faction-ua-card-accent", text: "--faction-ua-card-chip-ink" },

  // WOW — THE QUEST DECREE (task card v2, #1023). Every pairing on this card
  // resolves to a family measured somewhere above, which is the whole finding:
  // the design's palette IS WOW's shipped skin, and where the two disagreed the
  // repo was already right. Its dark CTA plum (#8a5aae) measures 4.10:1 under
  // cream — the exact value note 1 beside `--faction-wow-plum-surface` rejected
  // when it made that token theme-invariant — so the card takes the token and
  // the two rows below pin the pairing rather than a new hue.
  { what: "wow decree CTA / modifier chip", surface: "--faction-wow-plum-surface", text: "--faction-wow-on-plum" },
  // The plaque: a burnt-gold total and a plum unit on the parchment plate. The
  // ✦ between them is a DINGBAT, not text, which is the only reason it may be
  // painted in the 2.00:1 chronicle gold — so it is deliberately not a row here.
  { what: "wow decree plaque, total", surface: "--faction-wow-chronicle-panel", text: "--faction-wow-stamp-total" },
  { what: "wow decree plaque, unit", surface: "--faction-wow-chronicle-panel", text: "--faction-wow-card-accent" },

  // ── THE DUEL SEAL / FORFEIT DIALOGS (#1168) ──────────────────────────────
  //
  // WHY THIS BLOCK EXISTS, and why it is the only guard that can. These sixteen
  // components (`components/duel/*DuelSealConfirm.tsx`) are the second instance
  // of the #694 shape: a GLOBAL FUNCTIONAL INK on faction paper. `--color-danger`
  // and `--color-success` were chosen against the app's near-white surface, and
  // the seal dialogs paint them on eight different sheets — three of which are
  // dark in BOTH themes while the tokens flip with the viewer, so the light
  // halves land on grounds they were never chosen for.
  //
  // Neither existing guard could see it, for the two reasons #694 already
  // records and one new one:
  //   - This test measures a token against the surface its DOCUMENTATION names,
  //     and `--color-danger` documents no faction surface. The pairing was not
  //     missing from the manifest, it was unrepresentable in it.
  //   - `e2e/contrast.spec.ts` walks READ ROUTES. A seal dialog exists only in a
  //     composer STATE (a duel side, mid-cast, before confirm), which no route
  //     walk produces. "The surface is skinned by a faction" is not the same
  //     claim as "the sweep has been there".
  //   - Two of the failing inks were not reachable from a skin AT ALL until this
  //     issue: `StakesTiles` and `RaceRoster` hardcoded them, so no amount of
  //     per-skin care could have fixed them. `DuelSlotTheme` now takes
  //     `credit` / `alarm`, which is what makes the routed rows below possible.
  //
  // WHAT IS DELIBERATELY NOT REPEATED HERE. Four of the sixteen pairings resolve
  // to a pair some row above already measures, and a second name for one
  // measurement is what the WOW block warns against:
  //   ua seal body / note              = `ua roster notice ink` / `credit ink`
  //   singularity seal body / note     = `singularity roster notice / credit ink`
  //   ephemerists forfeit cost panel   = `ephemerists cornice band, masthead`
  //                                      (#1208 moved the panel onto the plate's
  //                                      night band; the ratio is symmetric, so
  //                                      swapping which is the ground measures
  //                                      nothing new)
  //   ephemerists seal note            = `ephemerists plate, quiet ink`
  //   default stakes panel             = `default seal note` (one ground)
  //
  // The BODY LINE and the reopen NOTE are 18px content copy and owe 4.5:1. The
  // roster's "sealed" mark is 18px regular and owes 4.5:1 too — it is the
  // TIGHTEST consumer of `credit`, which is why the stakes-panel rows below are
  // written at the normal floor even though the win figure beside them is 24px
  // bold. Only the ZERO figure takes AA_LARGE, and it is 24px/700 by inspection.
  //
  // The 3px `--color-danger` RULE each routed skin now draws beside its forfeit
  // paragraph is deliberately absent from this list, on the same reasoning the
  // WOW block gives for the opponent accent: it is a drawn mark carrying no
  // text, so it has no pair to measure. If a later edit paints a string in it,
  // THAT is what needs a row.
  {
    what: "default seal body, notice ink",
    surface: "--color-bg-page",
    text: "--faction-default-card-notice",
  },
  // #1209 moved this ground: the seal dialogs were a `coven.exe` window on the
  // dotted board and are the candlelit ward page now. The RED still fails on it
  // — 4.31:1 in light, the identical reading it had on the board — so the notice
  // ink survives the move for exactly the reason it was routed in the first place.
  { what: "coven seal body, notice ink", surface: "--faction-coven-ward-page", text: "--faction-coven-card-notice" },
  { what: "wow seal body, notice ink", surface: "--faction-wow-duel-lists-bg", text: "--faction-wow-card-notice" },
  { what: "everymen seal body, notice ink", surface: "--everymen-paper", text: "--faction-everymen-card-notice" },
  // Snide had already routed its own body ink: the forfeit copy sits in a
  // redaction bar, hot pink on the photocopier black.
  { what: "snide seal body, pink on the redaction bar", surface: "--faction-snide-ink", text: "--faction-snide-pink" },

  // The reopen note. Five sheets keep `--color-success` because they MEASURE —
  // they are light by day and dark by night, so the token flips with them.
  { what: "default seal note, success on the page", surface: "--color-bg-page", text: "--color-success" },
  { what: "coven seal note, success on the ward page", surface: "--faction-coven-ward-page", text: "--color-success" },
  { what: "wow seal note, success on the lists ground", surface: "--faction-wow-duel-lists-bg", text: "--color-success" },
  { what: "everymen seal note, success on the paper", surface: "--everymen-paper", text: "--color-success" },
  { what: "snide seal note, acid on the halftone", surface: "--faction-snide-ink", text: "--faction-snide-acid" },

  // The stakes panel — a SECOND sheet on every skin, and the one the shared
  // slots actually land on. `--faction-*-card-*` inks are measured against
  // `card-bg`, so a skin mounting the slots on a deeper stock has to re-measure
  // (WORLD_ZERO_STYLE §3: "when a surface gains a sheet, re-measure the inks it
  // already had"). Gates the roster's 18px "sealed" mark and the win figure.
  { what: "coven seal stakes panel, credit ink", surface: "--faction-coven-ward-card", text: "--color-success" },
  { what: "wow seal stakes plate, credit ink", surface: "--faction-wow-chronicle-panel", text: "--color-success" },
  {
    // The terminal's green glass, laid over the always-dark chassis before any
    // ink lands — a veil in exactly #694's sense.
    what: "singularity seal glass panel, credit ink",
    surface: "--faction-singularity-card-bg",
    veil: SEAL_GLASS_VEIL,
    text: "--faction-singularity-card-credit",
  },
  { what: "everymen seal stakes panel, credit ink", surface: "--everymen-paper-deep", text: "--color-success" },
  {
    // The same panel in FORFEIT mode, where Everymen inverts it to ink. The
    // green is 1.88:1 there, so the skin hands `credit` its own gold instead.
    what: "everymen seal stakes panel inverted, gold credit",
    surface: "--everymen-ink",
    text: "--everymen-gold",
  },
  { what: "snide seal stakes scrap, credit ink", surface: "--faction-snide-ink", text: "--faction-snide-card-credit" },
  // #1208 swept this dialog off the codex; the band is the plate's panel cell.
  // The INK moved too, in #1627: the panel cell is dark in both cascades now, so
  // the light-theme `--color-success` lands on a night ground at 1.76:1 and the
  // skin routes its own credit — S.N.I.D.E.'s and Singularity's call, made here
  // for the third time and for the identical reason.
  { what: "ephemerists seal ledger band, credit ink", surface: "--faction-ephemerists-plate-inner", text: "--faction-ephemerists-card-credit" },
  { what: "ua seal stakes well, credit ink", surface: "--faction-ua-panel", text: "--color-success" },

  // ── THE STAKES PANEL'S MUTED INK (#1173) ─────────────────────────────────
  //
  // The same second sheet, one slot further in. #1168 routed the two GLOBAL
  // functional inks the panel carries; the panel also carries each faction's OWN
  // muted ink, because `StakesTiles` and `RaceRoster` paint `theme.muted` on
  // whatever ground the skin mounts them over. That ink was chosen against the
  // faction's SHEET, and CARD_PAIRS measures it there — which is why two of them
  // could sit under AA on the deeper stock with every guard green.
  //
  // What it carries at 18px: the roster's "walking" mark for a side that has not
  // cast, `duelStakes.tieLine` + `duelStakes.beforeVotes`, and — while the duel
  // is `pending` — `duelStakes.soloFallback`, i.e. the whole stakes block. It
  // also sets the two tile captions at label size. Normal floor throughout.
  //
  // Two factions, not three. WOW's `-card-muted` read 4.24:1 on the chronicle
  // panel and Everymen's `-muted` 4.25:1 on the deep stock, so each grew a
  // `-quiet` sibling for its own panel; the ink itself is untouched and keeps
  // clearing on the body ground (CARD_PAIRS still measures it there). The
  // EPHEMERISTS panel needed nothing: #1208 moved that band off the codex onto
  // the Valley plate's inner cell, whose quiet ink `ephemerists panel cell,
  // quiet ink` above already measures — at 6.21 / 5.52 then, and at 5.52 in both
  // cascades since #1627 made the register theme-invariant. The same pairing
  // either way, so a second row here would be a second name for one measurement.
  { what: "wow seal stakes plate, quiet ink", surface: "--faction-wow-chronicle-panel", text: "--faction-wow-chronicle-quiet" },
  { what: "everymen seal stakes panel, quiet ink", surface: "--everymen-paper-deep", text: "--everymen-quiet" },

  // The ZERO figure — `--color-danger` on every stakes panel, which is what a
  // S.N.I.D.E. duelist sees in the lose tile (0.0×, `eras/era_1.py`). 24px/700,
  // so AA_LARGE genuinely applies; every one of these clears it as shipped and
  // none is repainted. They are rows so that a later repaint of any panel is
  // caught. `ephemerists seal zero figure` used to measure 3.01:1 and be the
  // narrowest margin in the family; #1208 moved that band onto the Valley
  // plate's panel cell and it reads 3.93:1 there, so the tightest reading in
  // this group is now somebody else's.
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
    // Singularity is the one skin that keeps `--color-danger` as TEXT: its
    // forfeit heading is 24px, so the 3:1 floor applies and 4.03:1 clears it.
    // The 18px body under it did not, and took the notice ink.
    what: "singularity seal forfeit heading, large display type",
    surface: "--faction-singularity-card-bg",
    text: "--color-danger",
    floor: AA_LARGE,
  },

  // ── THE DANGER FILL (#1169, absorbing #1174) ─────────────────────────────
  //
  // The row that could not exist before the token did. `--color-danger` has two
  // roles — an INK (`color:` on error copy, ~30 sites) and a FILL (the forfeit
  // button, the confirm dialog's destructive half, the flag chips) — and only
  // the ink role was ever measured, by the seal rows above. The fill role had no
  // named ink at all: eight sites reached for whichever pale token was nearby
  // (`--color-text-on-accent` white, `--color-bg-page`, and, on two flag chips,
  // the TRANSLUCENT `--color-bg-surface`), and each of the three fails somewhere:
  //
  //   white       on danger  4.83 light / 2.77 dark
  //   bg-page     on danger  4.40 light / 6.72 dark
  //   bg-surface  on danger  3.08 light / 1.04 dark   ← alpha, composited
  //
  // `--color-on-danger` is one named ink for the one fill, in the shape #649 and
  // #924 already established for faction fills. Deepening `--color-danger` in
  // dark was the rejected lever: it is the same token the ink role reads.
  {
    what: "danger fill, on-danger ink",
    surface: "--color-danger",
    text: "--color-on-danger",
  },

  // ── THE EDIT-PRAXIS COMPOSERS (#1179) and THE FEED CHASSIS (#1192) ───────
  //
  // WHY BOTH WAVES LAND IN ONE PR, and why they had to. Every skin agent in
  // both epics declined to touch this file while its siblings were live, and
  // each was right: `ARCHETYPE_PAIRS` is asserted BOTH ways (listed = measured,
  // unlisted = nothing), so two branches that each restate it drop each other's
  // rows — every branch green, `main` red only after the second squash. The
  // deferral was correct and the debt is settled here, once, for all eight.
  //
  // WHAT IS NEW ABOUT THESE SURFACES. Both waves put shared slots on a SECOND
  // faction stock: `PraxisWaitingSurface` renders `dress.bodyStyle` and
  // `dress.quietStyle` INSIDE `dress.panelStyle`, and the feed frames paint the
  // app's global inks on a faction chassis. That is #1173's shape again
  // (WORLD_ZERO_STYLE §3: "when a surface gains a sheet, re-measure the inks it
  // already had"), and re-measuring is exactly how the three failures this issue
  // fixed were found — none of them was visible from the ink's own sheet.
  //
  // TWO FACTIONS ADD NOTHING, which is a finding rather than an omission:
  //   - UA's composer draws entirely from `--faction-ua-{card-bg,panel}` with
  //     `-card-{text,body,muted,accent}` and the fill/on-fill pair. All twelve
  //     pairings are in the sun-bleached block above. Its FEED frame grounds on
  //     `--faction-ua-parchment`, a gradient; `ua leaf darkest stop, *` already
  //     measures that ramp's tightest stop, which is the only honest scalar
  //     reading of it.
  //   - Ephemerists' composer is the Valley plate's own token set, measured in
  //     the plate blocks above. (Its masthead band is a `color-mix()` of
  //     `-plate-band` toward nile, which `parseColor` cannot resolve; the band's
  //     lower stop is plain `-plate-band` and IS measured. A row for the mixed
  //     stop would fail as "not a solid color", which is a hole this guard
  //     cannot close — `e2e/contrast.spec.ts` is the one that can.)
  //
  // Four more pairings were checked and deliberately NOT written, because each
  // is a second name for a measurement already here:
  //   snide acid cast bar        = `snide seal note, acid on the halftone`
  //                                (contrast is symmetric; swapping which of
  //                                `-ink` / `-acid` is the ground measures
  //                                nothing new)
  //   snide pink modifier scrap  = `snide composer accent, on-accent`
  //   everymen red mode button   = `everymen composer accent, on-accent`
  //                                (`-card-accent` resolves to `--everymen-red`)
  //   wow plate prose            = `wow seal stakes plate, quiet ink` — the WOW
  //                                dress now hands its panel slots
  //                                `-chronicle-quiet`, the ink #1173 minted for
  //                                that plate, so the pairing is that row's.

  // na / Default — THE AURORA SHEET (#1181). Three tiers, and the field is the
  // tighter ground of the two: it is a shade LIGHTER than the sheet by day and
  // a lifted stock by night, so an ink that clears the sheet can still miss it.
  // That is how `-composer-faint` was caught at 2.08:1 — it had never been
  // measured against anything.
  { what: "na composer field, ink", surface: "--faction-default-composer-field", text: "--faction-default-card-text" },
  { what: "na composer field, prose", surface: "--faction-default-composer-field", text: "--faction-default-card-muted" },
  { what: "na composer field, faint ink", surface: "--faction-default-composer-field", text: "--faction-default-composer-faint" },
  { what: "na composer sheet, faint ink", surface: "--faction-default-card-bg", text: "--faction-default-composer-faint" },
  // The cast bar. na paints it in its own INK rather than an accent — the one
  // composer in the set whose primary is the body colour — so this is not the
  // `default composer accent, on-accent` pair up in ACCENT_PAIRS.
  { what: "na cast bar, on-accent", surface: "--faction-default-card-text", text: "--faction-default-on-accent" },

  // WOW — THE WRIT (#1186). The chronicle plate carries the composer's fields
  // and the waiting surface's panels, so the two inks it had never been paired
  // with get rows. `-card-muted` is absent by design: see the note above.
  { what: "wow chronicle plate, ink", surface: "--faction-wow-chronicle-panel", text: "--faction-wow-card-text" },
  { what: "wow chronicle plate, label ink", surface: "--faction-wow-chronicle-panel", text: "--faction-wow-accent-deep" },

  // S.N.I.D.E. — THE FLYPOSTED SHEET (#1184). The third of this faction's four
  // stocks, and index.css declares it apart from `-note-*` / `-slip-*` on
  // purpose ("same values today, a different surface's contract tomorrow"). The
  // rows follow that: measuring `-slip-paper` would not guard `-composer-sheet`
  // the day one of them is repainted, which is the whole reason for two names.
  { what: "snide composer sheet, ink", surface: "--faction-snide-composer-sheet", text: "--faction-snide-composer-ink" },
  { what: "snide composer sheet, prose", surface: "--faction-snide-composer-sheet", text: "--faction-snide-composer-muted" },
  { what: "snide composer sheet, faint ink", surface: "--faction-snide-composer-sheet", text: "--faction-snide-composer-faint" },
  { what: "snide composer field, ink", surface: "--faction-snide-composer-field", text: "--faction-snide-composer-ink" },
  { what: "snide composer field, prose", surface: "--faction-snide-composer-field", text: "--faction-snide-composer-muted" },
  { what: "snide composer field, faint ink", surface: "--faction-snide-composer-field", text: "--faction-snide-composer-faint" },
  // Acid as TEXT, on both stocks it lands on: the POINTS caption sits on the
  // task slip (the field) and the same ink runs on the sheet. The bright acid
  // is 1.35:1 on the light stock, which is why this ink exists at all.
  { what: "snide composer field, acid caption", surface: "--faction-snide-composer-field", text: "--faction-snide-composer-acid-ink" },
  { what: "snide composer sheet, acid ink", surface: "--faction-snide-composer-sheet", text: "--faction-snide-composer-acid-ink" },
  // The masthead bar takes THE PRESS's theme-invariant pigments, not the
  // sheet's flipping ones — the stage word in paper, the wordmark in acid.
  { what: "snide composer bar, stage word", surface: "--faction-snide-composer-bar", text: "--faction-snide-paper" },
  { what: "snide composer bar, wordmark", surface: "--faction-snide-composer-bar", text: "--faction-snide-acid" },

  // Everymen — THE WORK ORDER (#1187). `--faction-everymen-sheet-panel` is the
  // stock the sheet accent was MEASURED on, and the composer, the praxis detail
  // and the comment voice all mount their typed area on it for that reason: red
  // as ink is 4.49:1 on `--everymen-paper` and never set there. That near-miss
  // is deliberately NOT a row — the pairing does not exist on screen, and a row
  // for it would assert a failure nothing is committing.
  { what: "everymen sheet panel, ink", surface: "--faction-everymen-sheet-panel", text: "--everymen-paper-text" },
  { what: "everymen sheet panel, prose", surface: "--faction-everymen-sheet-panel", text: "--everymen-muted" },
  { what: "everymen sheet panel, red ink", surface: "--faction-everymen-sheet-panel", text: "--faction-everymen-sheet-accent" },

  // Singularity — THE SESSION (#1185) and its feed chassis (#1201). Always-dark
  // in both themes (§6), so every row is two readings of a near-black ground.
  // `-term-panel` had no row at all before this: it is the fields' ground in the
  // composer and `--color-bg-surface` on the feed chassis, which is four inks.
  { what: "singularity terminal panel, ink", surface: "--faction-singularity-term-panel", text: "--faction-singularity-term-ink" },
  { what: "singularity terminal panel, title", surface: "--faction-singularity-term-panel", text: "--faction-singularity-term-bright" },
  { what: "singularity terminal panel, label", surface: "--faction-singularity-term-panel", text: "--faction-singularity-term-dim" },
  { what: "singularity terminal panel, level pill", surface: "--faction-singularity-term-panel", text: "--faction-singularity-term-blue" },
  // The chassis carries the composer's page ink and the feed row's body.
  { what: "singularity terminal chassis, prose", surface: "--faction-singularity-term-bg", text: "--faction-singularity-term-ink" },
  // The points well's third ink — `-blue-bright` and `-blue` are measured on it
  // above; the unit caption is `-dim`, and this well is its tighter ground.
  { what: "singularity points well, caption", surface: "--faction-singularity-term-readout", text: "--faction-singularity-term-dim" },
  // The two feed pairings #1252 argued out in prose. The chassis remaps
  // `--color-danger` to the faction's notice ink through a cascade override, and
  // the actor's name is the one body ink that override cannot reach (it is a
  // `--faction-*` token, so `FeedRowSkin` carries it instead). Both are rows now
  // rather than a comment, because a ratio in a comment is indistinguishable
  // from a measurement and this one is computed.
  { what: "singularity terminal chassis, alarm ink", surface: "--faction-singularity-term-bg", text: "--faction-singularity-card-notice" },
  { what: "singularity terminal chassis, actor name", surface: "--faction-singularity-term-bg", text: "--faction-singularity-card-accent" },

  // Coven — THE CANDLELIT COMPOSER (#1183). The ward's two grounds were already
  // measured against the slip's three inks; what is new is the fourth, `-deep`,
  // and the cast band.
  { what: "coven ward panel, accent ink", surface: "--faction-coven-ward-card", text: "--faction-coven-slip-deep" },
  {
    // `-deep` on the ward PAGE is 4.44:1, which is why the composer's own note
    // rules it ornament-and-rules-only there (#1295). The ONE string it sets on
    // that ground is the task slip's points numeral at `--text-title` (24px), so
    // AA_LARGE genuinely applies — the same call `everymen seal numeral` makes.
    what: "coven ward page, points numeral, large display type",
    surface: "--faction-coven-ward-page",
    text: "--faction-coven-slip-deep",
    floor: AA_LARGE,
  },
  // Once your part is in the CTA band goes green. Both stops carry the label,
  // for the same reason the slip's own CTA band has two rows.
  { what: "coven cast band top", surface: "--faction-coven-cast-from", text: "--faction-coven-cast-ink" },
  { what: "coven cast band foot", surface: "--faction-coven-cast-to", text: "--faction-coven-cast-ink" },

  // S.N.I.D.E. — THE INTERCEPTED SLIP (#1198), the feed chassis and the comment
  // sheet. Twelve tokens shipped with no row; these are the eight pairings they
  // actually make. The stock FLIPS (that repoint was itself the fix for 1.10:1
  // body copy at night), so each row is two different grounds, not one twice.
  { what: "snide slip, ink", surface: "--faction-snide-slip-paper", text: "--faction-snide-slip-ink" },
  { what: "snide slip, byline", surface: "--faction-snide-slip-paper", text: "--faction-snide-slip-muted" },
  { what: "snide slip, faint ink", surface: "--faction-snide-slip-paper", text: "--faction-snide-slip-faint" },
  // The two poster colours walked down for the one job each does as TYPE: the
  // marker prompt across the head of the slip, and a resolved @mention.
  { what: "snide slip, marker prompt", surface: "--faction-snide-slip-paper", text: "--faction-snide-slip-pink-ink" },
  { what: "snide slip, mention ink", surface: "--faction-snide-slip-paper", text: "--faction-snide-slip-acid-ink" },
  // The editor's input, and the first of the five ransom scraps — the only one
  // that flips, being a paler patch of the sheet itself.
  { what: "snide slip field, ink", surface: "--faction-snide-slip-field", text: "--faction-snide-slip-ink" },
  // The intake bar. Near-black in BOTH themes, so it takes THE PRESS's
  // invariant pigments exactly as the composer's masthead does.
  { what: "snide slip intake bar, kicker", surface: "--faction-snide-slip-bar", text: "--faction-snide-paper" },
  { what: "snide slip intake bar, acid", surface: "--faction-snide-slip-bar", text: "--faction-snide-acid" },

  // Ephemerists — THE FEED PLATE (#1199). Two pairings the dress relies on and
  // nothing above reached: the cornice band's SECOND ink tier (declared rather
  // than faked with an opacity, which is why it is measurable at all), and nile
  // on the plate — that link ink is measured on the page ground and the panel
  // cell already, but the feed card grounds on `-plate-bg`, a third stock.
  { what: "ephemerists cornice band, quiet ink", surface: "--faction-ephemerists-plate-band", text: "--faction-ephemerists-plate-band-quiet" },
  { what: "ephemerists plate, links", surface: "--faction-ephemerists-plate-bg", text: "--faction-ephemerists-plate-brass-light" },

  // Everymen — THE DISPATCH SLIP (#1200). The masthead band: red as a FILL with
  // the broadsheet's masthead ink on it. Its dark reading is the tightest in
  // this whole group, which is why the dateline and the tag chip on that band
  // print at FULL ink and separate themselves by face rather than by opacity.
  { what: "everymen masthead band, ink", surface: "--everymen-red", text: "--everymen-masthead-text" },

  // ── THE COMPOSER'S ERROR BANNER, on all eight sheets (#1231) ─────────────
  //
  // `ErrorBanner` took no props, so every composer painted the neutral
  // `--color-danger` on its own faction stock and no skin could reach it —
  // #1153's missing seam, not a missing measurement. ADR-0061 keeps the hues
  // neutral (the `-veil` wash and the `-edge` rule are #1169's global rungs on
  // every skin); what is faction-aware is THE GROUND, and therefore the ink.
  //
  // The neutral ink missed AA on ALL EIGHT sheets in light under its own veil —
  // 3.31 (ephemerists), 3.47 (everymen), 3.71 (ua), 3.85 (singularity), 3.97
  // (snide), 4.08 (wow), 4.23 (coven), 4.41 (na) — and cleared on all eight in
  // dark (4.80-5.97). That asymmetry is #1449's finding restated: the light hue
  // was chosen against the app's near-white page, and six of these sheets are
  // warm paper while two are near-black in both themes.
  //
  // SEVEN SKINS MINT NOTHING. `--faction-{key}-card-alarm` already exists for
  // all eight keys in both cascades, and it clears every composer ground it is
  // asked for here (5.70 worst, on the Ephemerists plate). That is #1302's
  // shape: a shared component inside a faction frame takes the faction's card
  // ink family rather than a global functional one.
  //
  // S.N.I.D.E. IS THE ONE MINT, and the reason is §6 rather than a hue: its
  // CARD is photocopier-black in BOTH themes, so `-card-alarm` is pinned bright
  // and reads 1.56:1 on the composer's light xerox stock — while the composer
  // sheet flips. `--faction-snide-composer-alarm` is that walked pink, declared
  // in the composer block rather than borrowed from `-slip-pink-ink`, which is
  // #1181's rule (same value today, a different surface's contract tomorrow).
  //
  // The veiled reading is the one on screen, and it is the tighter one on the
  // six paper stocks (a wash of the ink's own polarity) while it LIFTS the two
  // near-black grounds toward the ink. Either way it is what gates (§3, #1302).
  ...(
    [
      ["na", "--faction-default-card-bg", "--faction-default-card-alarm"],
      ["coven", "--faction-coven-ward-card", "--faction-coven-card-alarm"],
      ["ephemerists", "--faction-ephemerists-plate-bg", "--faction-ephemerists-card-alarm"],
      ["everymen", "--everymen-paper", "--faction-everymen-card-alarm"],
      ["singularity", "--faction-singularity-term-bg", "--faction-singularity-card-alarm"],
      ["snide", "--faction-snide-composer-sheet", "--faction-snide-composer-alarm"],
      ["ua", "--faction-ua-card-bg", "--faction-ua-card-alarm"],
      ["wow", "--faction-wow-card-bg", "--faction-wow-card-alarm"],
    ] as const
  ).map(([key, surface, text]) => ({
    what: `${key} composer error banner, alarm ink under the danger veil`,
    surface,
    veil: "--color-danger-veil" as Veil,
    text,
  })),

  // ── THE PRAXIS DETAIL'S OWN ALARM MARKS, on all nine walls (#1451) ───────
  //
  // `praxisDetail/shared.tsx` owns five slots that every skin mounts on its own
  // page ground: the failed banner's title and admin note, the withdraw error,
  // the forfeit trigger and the pull-back confirm. All five painted the neutral
  // `--color-danger` / `--color-warning`, and ADR-0061 makes this ONE shared
  // page that nine factions dress — so those are global functional inks landing
  // on nine different stocks. #1302's third instance, on a fourth surface.
  //
  // THE WALL IS NOT `-card-bg`, and for six of the nine it is not even the token
  // the composer rows above measure (#1302's warning, restated). Four skins put
  // the page on a class in this file — `.eph-plate-sheet`, `.em-dispatch`,
  // `.snd-detail-sheet`, `.wow-detail-field` — and the surface column is read
  // off those rules rather than generated from the key. S.N.I.D.E. contributes
  // TWO grounds because its sheet is a 180deg ramp from `-wall` to `-wall-deep`,
  // and the deep end is what gates the light hue. `na` covers Albescent, which
  // renders `DefaultPraxisDetail` plus an ornament layer (#1140).
  //
  // WHAT FAILED, measured before the fix: 25 of these 54 assertions in light and
  // one in dark. Bare on the wall, `--color-danger` ran 3.32 (ephemerists) to
  // 4.75 (na); under its own veil — the banner's and the confirm button's fill —
  // 3.11 to 4.41, i.e. every one of the nine. `--color-warning` under that same
  // veil ran 3.23 to 4.62. Dark cleared everywhere except Everymen at 4.47.
  //
  // SEVEN SKINS MINT NOTHING. `-card-alarm` (#1449) and `-card-notice` (#694)
  // exist for all eight keys in both cascades and clear every wall asked of them
  // here — worst 4.56:1, the notice ink under the danger veil on the Ephemerists
  // page. S.N.I.D.E. is the one mint for the third time (#1302, #1231) and for
  // the same §6 reason its card gives every time: photocopier-black in BOTH
  // themes, so both card inks are pinned bright and read 1.61 / 1.41 on the
  // light wall. Its own walked pink is not enough either — `-note-pink-ink` was
  // measured on the note stock and reads 4.14:1 veiled at the ramp's deep end —
  // so `--faction-snide-wall-alarm` / `-wall-notice` are declared for this
  // ground, and the deep-end row below is the one that pins them.
  ...(
    [
      ["na", "--faction-default-card-bg", "--faction-default-card"],
      ["coven", "--faction-coven-ward-page", "--faction-coven-card"],
      ["ephemerists", "--faction-ephemerists-plate-page", "--faction-ephemerists-card"],
      ["everymen", "--faction-everymen-sheet-panel", "--faction-everymen-card"],
      ["singularity", "--faction-singularity-term-bg", "--faction-singularity-card"],
      // Both ends of `.snd-detail-sheet`'s ramp, against the wall-scoped mint.
      ["snide", "--faction-snide-wall", "--faction-snide-wall"],
      ["snide deep", "--faction-snide-wall-deep", "--faction-snide-wall"],
      ["ua", "--faction-ua-page", "--faction-ua-card"],
      ["wow", "--faction-wow-detail-field", "--faction-wow-card"],
    ] as const
  ).flatMap(([key, surface, family]) => [
    // The withdraw error and the forfeit trigger — bare on the wall.
    { what: `${key} praxis detail wall, alarm ink`, surface, text: `${family}-alarm` },
    // The failed banner's title and the pull-back confirm's label, both of
    // which fill with `--color-danger-veil` before the ink lands. The rule and
    // the wash stay #1169's neutral rungs on every skin (ADR-0061).
    {
      what: `${key} praxis detail wall, alarm ink under the danger veil`,
      surface,
      veil: "--color-danger-veil" as Veil,
      text: `${family}-alarm`,
    },
    // The moderator's fail note, inside that same banner.
    {
      what: `${key} praxis detail wall, notice ink under the danger veil`,
      surface,
      veil: "--color-danger-veil" as Veil,
      text: `${family}-notice`,
    },
  ]),

  // ── THE PRAXIS DETAIL'S NEUTRAL CHROME, over the frost (#1413) ───────────
  //
  // The other ten of #1451's fifteen alarm sites, plus the quiet inks beside
  // them. `PraxisAdminBar` and `PraxisFlagBlock` do NOT sit on a faction wall:
  // they are `.sidebar-card`, mounted bare by all nine skins because ADR-0061
  // keeps moderation and system chrome out of a faction's voice. So their inks
  // are the global `--color-*` set and they are the RIGHT inks — the faction
  // ones are actively wrong there (`--faction-singularity-card-alarm` reads
  // 1.00:1 on this composite). What is wrong is the GROUND.
  //
  // `--color-bg-surface` IS ALPHA — rgba(255,255,255,0.72) light, 0.04 dark —
  // so `.sidebar-card` has no ground of its own. It composites against whatever
  // it happens to be mounted on, which on this page is nine different walls,
  // and `parseColor` cannot read a browser composite. That is why this file
  // could measure every one of these inks and stay green: the pairing was not
  // merely missing from the manifest, the surface had no value to name.
  //
  // The frost is modelled here as a VEIL, which is exactly what it is — a
  // translucent layer laid over the ground before the ink lands (#694). That
  // costs nothing new: `Veil` already resolves a declared token and composites
  // it at its own alpha.
  //
  // NINE ROWS BECAME ONE, and the collapse IS the fix. Written against the nine
  // walls these read, in light: danger 2.54 (singularity) / 4.37 (ephemerists) /
  // 4.45 (ua, snide deep) / 4.55 (wow) / 4.61 (snide) / 4.62 (everymen) / 4.68
  // (coven) / 4.81 (na); warning, tertiary and secondary all under AA on the
  // terminal at 2.65 / 3.11 / 3.24; and in dark, everymen secondary at 4.15.
  // Eight assertions red. `.sidebar-card` now paints the frost over a declared
  // `--card-ground` and its neutral-chrome mounts wear `.card-on-page`, so the
  // stock is the app's page on every skin and the wall is no longer part of the
  // pairing — there is one ground to measure because there is one ground.
  //
  // The structural half of that claim is asserted separately, at the bottom of
  // this file: a ratio row on a fixed ground cannot notice the ground going
  // back to being the mount's business.
  //
  // THE REST OF THE PAGE'S NEUTRAL CHROME WAS AUDITED AND ADDS NO ROW, which is
  // a finding rather than an omission. `.btn-outline` is the same shape — it
  // fills with `--color-bg-surface` too — and every one of its praxis-detail
  // mounts but one is INSIDE these cards, where it lays a second frost over a
  // ground that is now fixed. The exception is the withdraw-confirm's Cancel,
  // which sits on the bare wall; it prints `--color-text-primary`, and that ink
  // over the frost runs 9.76:1 (Singularity, light — the tightest of the
  // eighteen) to 18.43. Nothing there is close, so `.btn-outline` keeps its
  // translucent fill and `--card-ground` stays a one-consumer property.
  ...[
    // The five global inks `PraxisAdminBar` / `PraxisFlagBlock` paint on the
    // card's own stock. `--color-text-primary` is left out on purpose: it only
    // reaches this surface through `.btn-outline`, which lays a SECOND
    // `--color-bg-surface` frost of its own before it prints.
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

  // ── THE NEUTRAL TEXT TIERS, ON THE APP'S OWN TWO STOCKS (#1549) ──────────
  //
  // The most-painted pairing in the repo and it was not in this manifest. The
  // rows above reach `--color-text-secondary` / `-tertiary` only THROUGH the
  // frost, on one card class, on one page — so the bare page ground and the
  // alt surface, which between them carry every eyebrow, timestamp, byline,
  // placeholder and inactive nav link in the app, were unmeasured.
  //
  // `--color-bg-surface-alt` is opaque in light and rgba(255,255,255,0.06) in
  // DARK, so it cannot be a `surface` — it is modelled as a veil over the page,
  // which is exactly what it composites to. Same trick, same reason as the
  // frost rows above (#1413).
  //
  // These are the pairings #1549's repaint moves, so they are the ones that
  // have to be pinned: light tertiary goes #6c6358 -> #656081, which is a hue
  // swing at held weight and reads a fraction HIGHER on every one of them
  // (page 5.37 -> 5.40, alt 5.04 -> 5.07). The tier separation itself is not a
  // ratio and is asserted at the bottom of this file.
  //
  // ── AND THEY OWE AAA, NOT AA (#1715) ─────────────────────────────────────
  //
  // The rows above landed at AA and the tokens then settled ONTO it: dark
  // secondary read 4.87:1 on the alt surface, clearing the floor by 0.37 while
  // carrying `23 / 60 pts this level` on the profile. AA is the line below
  // which text is a defect, and the most-painted ink in the repo should not be
  // resting on it — so the two neutral stocks take `AAA_NORMAL`.
  //
  // THE ALT SURFACE IS THE ONE THAT GATES, in both cascades and for opposite
  // reasons: in light it is a DARKER sheet than the page (#f0ede6 against
  // #f7f4ee) and in dark it is a LIGHTER one (0.06 white over #13121a composites
  // to #212028), so either way it closes on the ink. The first measurement of
  // #1715 used the page and read the profile as fine; the profile's panels are
  // this token.
  //
  // The two filter grounds are AA rows, not AAA ones, and that is a size call
  // rather than a shrug: the well and the selected row carry `--text-lg` at
  // 12px, so 4.5:1 is what WCAG asks. They are here because they are the
  // TIGHTEST neutral stocks in the app — the selected row is two washes of
  // `--color-text-primary` deep — and both inks failed AA on it before the lift
  // (light 4.05 / 3.90, dark 3.80 / 4.19). The lift is what fixes them: 5.63 /
  // 5.66 light and 5.63 / 6.04 dark. On those numbers #1579 deleted the rule
  // that promoted the selected row's count to secondary — tertiary is the
  // louder ink on that stock in BOTH themes now, so the count keeps it. Both
  // inks stay measured: secondary still crosses the thumb on the rail (the
  // thumb animates over segments that carry it), and the promotion is one CSS
  // line from returning.
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
    // `--filter-well` is `color-mix(in srgb, --color-text-primary 6%, --color-bg-page)`,
    // which is that token at 6% alpha over the page — the same arithmetic the
    // `{ token, alpha }` veil already does, and the only way to reach a
    // `color-mix()` at all (`parseColor` returns null for one, by design).
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

  // ── THE FEED ROW'S ACTOR NAME, on the four chassis #1252 left (#1341) ────
  //
  // `resolveFeedRowInk` defaults `actor` to `factionCssVar(slug)` — the raw
  // spine hue — at 18px/700, which owes 4.5:1 because 700 weight only reaches
  // the large-text exemption at 18.66px. #1252 repointed UA, WOW and Singularity
  // to an accent that already cleared their own ground and left these four,
  // which failed in LIGHT at 2.41 (snide), 2.98 (coven), 4.37 (ephemerists, and
  // 4.15 with the plate wash composited) and 4.49 (everymen). All four clear
  // dark on the raw hue; #1252's "ephemerists 3.16:1 dark" was the LIGHT wash
  // measured over the DARK plate, and `--faction-ephemerists-plate-wash` is
  // `none` in dark, so that composite is not a surface anything paints.
  //
  // THREE OF THE FOUR ADD NO ROW, which is a finding rather than an omission —
  // each fix repoints to an ink whose pairing with that exact ground is already
  // asserted above, and a second `what` for two identical tokens measures
  // nothing new (the same call the four "checked and deliberately NOT written"
  // pairings make further up):
  //   snide       -slip-acid-ink on -slip-paper   = `snide slip, mention ink`
  //   coven       -slip-deep     on -ward-card    = `coven ward panel, accent ink`
  //   ephemerists -plate-brass-light on -plate-bg  = `ephemerists plate, links`
  //
  // Everymen is the one mint, and the one new row. Its red has no rung that
  // survives this stock in both themes: `--everymen-red` is the 4.49 above,
  // `-red-deep` is 2.67:1 at night, and `--faction-everymen-sheet-accent` is the
  // same red measured on the lighter sheet PANEL, so it carries the light miss
  // with it. `--everymen-paper-accent` is #1173's (role, ground) split applied
  // to the ACCENT role instead of the muted one — the shape the family already
  // uses for `-sheet-accent`, one stock further down.
  { what: "everymen paper, actor name", surface: "--everymen-paper", text: "--everymen-paper-accent" },

  // Albescent's FACTION tokens are gone (#783) — it renders Default's surfaces,
  // which `default` already covers. What remains is the always-light palette
  // private to the reveal surfaces (invitation letter, secret placeholder). It
  // still carries body text, and it is where #594's 2.78:1 muted ink shipped, so
  // it stays measured. The whole palette is one hue at varying alpha over the
  // sheet, which makes compositing the entire question.
  {
    what: "albescent reveal sheet, ink",
    surface: "--albescent-reveal-surface",
    text: "--albescent-reveal-ink",
  },
  {
    what: "albescent reveal sheet, muted",
    surface: "--albescent-reveal-surface",
    text: "--albescent-reveal-text-muted",
  },
  {
    what: "albescent reveal sheet, text",
    surface: "--albescent-reveal-surface",
    text: "--albescent-reveal-text",
  },

  // ── Three accents used as TEXT on grounds that are not their fill (#1766) ──
  //
  // The nightly sweep found these RENDERED; these rows are the same pairings
  // asserted at the value level, so a repaint of any of these grounds is caught
  // here rather than overnight. All three fixes are site by site, per the
  // 2026-08-14 owner ruling: no per-faction on-page ink tier is minted.
  //
  // na's POINTS caption was the whole light half of the sweep on its own — it
  // failed all FOURTEEN light combinations, because `--faction-default-gold` is
  // site chrome rather than one faction's hue and every walked route paints it.
  // It was `var(--faction-default-stop-3)`, a ramp position read back as type:
  // 2.94:1 on the white score plate, 2.89:1 on the card sheet. The stop is
  // untouched — seven surfaces are cut from it — and the ink walked down.
  //
  // The PLATE is the tighter of the two grounds and the one that gates: pure
  // white by day, and a stock the sheet does not share.
  { what: "na score plate, POINTS caption", surface: "--faction-default-stamp-bg", text: "--faction-default-gold" },
  { what: "na card sheet, points caption", surface: "--faction-default-card-bg", text: "--faction-default-gold" },
  // The consumer that could not come along. Singularity's roster readouts read
  // the same gold, on a terminal that is near-black in BOTH themes, so the two
  // grounds want opposite directions — §3's "these inks flip on the SHEET's
  // polarity, not on the theme". The band is provably EMPTY: white needs
  // luminance <= 0.183 and the terminal >= 0.191. `--faction-singularity-amber`
  // carries what the alias resolved to, so nothing on that surface repaints;
  // the row exists so the split cannot be quietly re-collapsed.
  { what: "singularity terminal, credits amber", surface: "--faction-singularity-card-bg", text: "--faction-singularity-amber" },
  // Everymen's mobile field desk stamps its Characters / Edit chits out of the
  // DEEP stock, where red-as-text is 3.75:1. This is the family's third
  // (role, ground) split after `-sheet-accent` (the broadsheet panel) and
  // `-paper-accent` (#1341's paper); the token's own comment records why
  // neither of those survives this stock in both themes.
  { what: "everymen deep stock, accent ink", surface: "--everymen-paper-deep", text: "--everymen-deep-accent" },
  // Not a row: the same page's "view all" link is 11px on the Plate's PAPER, at
  // 4.49 / 4.16 in the bare red — the pairing #1341 already minted
  // `-paper-accent` for, and a site that ink had not reached. It now takes it,
  // and `everymen paper, actor name` above is that measurement already.
  //
  // Also not a row: UA's member-row rank numeral, item 2 of #1766. It was
  // `--faction-ua-vermil` ("large display type only") at 14px/600, 4.12:1 on the
  // dark sheet, and now takes `--faction-ua-card-accent` — which `ua card
  // accent` in CARD_PAIRS has measured on that exact ground since #848. A
  // second `what` for one measurement measures nothing; the guard that the ink
  // stays in scope is the reader allowlist below.
];

/**
 * A `SKY_PAIRS` block stood here (#1792): seven rows measuring each faction's
 * `-on-night` ink against `--sky-bg`, the Constellation's own night canvas.
 *
 * #1855 retires the Constellation, and with it both the canvas and the tier —
 * the Players page draws on the ordinary page ground. The rows are not relaxed;
 * they have no surface left to measure on. Anything that paints a permanently
 * dark ground again needs its own measured ink and its own rows here — #1792's
 * reasoning is why, and it is kept in git rather than as a comment about a token
 * nobody declares.
 *
 * THE SENTENCE THAT USED TO FOLLOW WAS WRONG, AND IT IS WHY #1932 SHIPPED.
 * It read: "where the ordinary faction hue is the theme-correct ink and
 * `FILL_PAIRS` / `ACCENT_PAIRS` already gate it." Both halves fail.
 *
 * THEME-CORRECT IS NOT LEGIBLE. `--faction-{key}` flipping with the cascade was
 * the whole of #1792's bug, so a hue that flips reads as the fix — and it is,
 * for the flip. It says nothing about the ratio. Light `--faction-wow` is
 * 1.96:1 on `--color-bg-page` and 2.09:1 on the frost the signed-in player's own
 * roster row wears; dark's is 11.47 / 10.47. Every one of the nightly's fourteen
 * failures was LIGHT, which is the tell: a bug that sorts cleanly by cascade is
 * one bug, and this one is "the light hue is a fill".
 *
 * AND NEITHER BLOCK GATES THAT PAIRING. `FILL_PAIRS` measures
 * `--faction-{key}-on-fill` ON the hue — the hue is the GROUND there, which is
 * the same arithmetic seen from the other side and is exactly why
 * `--faction-wow-on-fill`'s declaration already carries the words "white only
 * 2.15:1". `ACCENT_PAIRS` measures a named accent against a named sheet. The
 * bare spine hue as INK on the app's own neutral stock is a pairing neither one
 * can name, and no row is added here for it: the honest assertion is not a ratio
 * but that nothing paints it, which is
 * `pages/players/__tests__/playersFactionInk.test.tsx`.
 */

const PAIRS: Pair[] = [
  ...CARD_PAIRS,
  ...FILL_PAIRS,
  ...ACCENT_PAIRS,
  ...ROSTER_PAIRS,
  ...COLLAB_PAIRS,
  ...PRAXIS_CARD_PAIRS,
  ...SNIDE_WALL_PAIRS,
  ...ARCHETYPE_PAIRS,
];

/**
 * Part C — the baseline allowlist (the ratchet).
 *
 * This spec was red on landing: the bug family is real and pre-dates the
 * guard. Rather than block the guard on the fixes, known failures are
 * enumerated here so the suite is green and NEW violations are blocked —
 * mirroring the repo's `no-raw-style-values` ratchet doctrine.
 *
 * **This list only ever shrinks.** Fixing a token means DELETING its line, not
 * editing the ratio: an allowlisted pair that starts passing fails this test
 * on purpose. Never add a line for new work.
 *
 * `ratio` is the measured value at the time of landing; `issue` is the child
 * that owns the fix. `651` means "found by the sweep, listed in #651's audit
 * comment, awaiting triage into a child".
 */
const BASELINE: Record<string, { ratio: number; issue: number }> = {
  // ── #649 fixed: `--faction-{key}-on-fill` now carries AA-legible text on every
  //    faction fill in both themes, so the 7 failing white-on-fill pairs are gone. ──

  // ── Albescent faint ink — the sibling #594 left alive (named in #651) ──

  // ── Found by this sweep — awaiting triage into children (#651 audit comment) ──
  // Card accents used as metadata text (§3: "metadata / decorative accent").
  // #848 fixed both `ua card accent` entries: the sun-bleached repaint gave UA
  // a metadata sienna that is not the fill hue (5.18:1 light, 6.58:1 dark).
  "light | everymen card accent": { ratio: 4.49, issue: 651 },
  "light | coven card accent": { ratio: 2.81, issue: 651 },
  "dark | everymen card accent": { ratio: 4.16, issue: 651 },
  // (`dark | ephemerists card accent` stood here at 3.72:1 from the sweep until
  // #1627 moved the card contract off the codex's rubric vermilion onto the
  // plate's brass highlight — 11.98:1, in both cascades. The entry below is the
  // SAME vermilion on the same vellum, reached through the archetype-private
  // primitive; it survives because the `--eph-*` family is still declared, and
  // it should go with the family's deletion rather than be fixed.)
  "dark | ephemerists vellum, rubric": { ratio: 3.72, issue: 651 },
  // (UA mono metadata labels on the legacy gilt sheet measured 3.06:1 in both
  // themes and were listed here until #853 deleted the legacy family, exactly
  // as this entry predicted. The surfaces that used to paint that pair now read
  // --faction-ua-card-muted, which clears AA on every UA surface.)
};

function key(theme: Theme, pair: Pair): string {
  return `${theme} | ${pair.what}`;
}

function resolveColor(name: string, theme: Theme) {
  const raw = resolveVar(name, theme, THEMES);
  return { raw, color: raw === null ? null : parseColor(raw) };
}

/**
 * The stylesheet as text, and one rule out of it.
 *
 * Two blocks at the bottom of this file assert on DECLARATIONS rather than on
 * ratios (#1413, #1307), because the bugs they guard are structural: a ground
 * that is not a ground, an ink that is not reachable. Every ratio above stays
 * green through both, which is the whole reason source assertions belong in a
 * contrast spec at all. Shared so there is one reader of the file.
 */
const CSS_TEXT = readFileSync(CSS_PATH, "utf8");

function ruleBody(selector: string): string {
  const at = CSS_TEXT.indexOf(`${selector} {`);
  expect(at, `index.css declares no \`${selector}\` rule`).toBeGreaterThan(-1);
  return CSS_TEXT.slice(at, CSS_TEXT.indexOf("}", at));
}

/** A component's source, for the same reason `ruleBody` exists. */
function sourceOf(relative: string): string {
  return readFileSync(fileURLToPath(new URL(`../../${relative}`, import.meta.url)), "utf8");
}

/**
 * `dress.pageStyle` out of `EphemeristsEditPraxis` — THE SECOND EPHEMERISTS
 * ROOT, and the one two separate seams (#1636's links, #1800's labels) have now
 * had to be declared on. One reader, so the third seam does not re-derive the
 * slice.
 */
function ephemeristsComposerPageStyle(): string {
  const source = sourceOf("pages/editPraxis/archetypes/EphemeristsEditPraxis.tsx");
  // `breadcrumbInk:` was the end marker until #2102 deleted the field; `sheetStyle`
  // is the next key in the dress literal and is the same boundary.
  return source.slice(source.indexOf("pageStyle: {"), source.indexOf("sheetStyle,"));
}

describe("faction token contrast (WCAG AA)", () => {
  for (const theme of BOTH_THEMES) {
    describe(theme, () => {
      for (const pair of PAIRS) {
        it(`${pair.what} clears AA`, () => {
          const surface = resolveColor(pair.surface, theme);
          const text = resolveColor(pair.text, theme);

          // Fail loudly, never skip: an unresolvable or non-solid token is a
          // hole in the audit, and a silent hole is what makes axe useless here.
          expect(surface.color, `${pair.surface} (${theme}) resolved to "${surface.raw}" — not a solid color`).not.toBeNull();
          expect(text.color, `${pair.text} (${theme}) resolved to "${text.raw}" — not a solid color`).not.toBeNull();
          expect(surface.color!.a, `${pair.surface} is a surface — it must be opaque`).toBe(1);

          // A veil is composited onto the surface before the text is, so what
          // the ink is measured against is what a viewer actually sees.
          let ground = surface.color!;
          for (const layer of pair.veil === undefined ? [] : [pair.veil].flat()) {
            // A token-at-an-alpha wash resolves the token, then scales its alpha
            // — which is what `color-mix(in srgb, <token> N%, transparent)`
            // computes. A literal parses as-is. See `Veil`.
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

  it("uses the WCAG large-text floor only where a role is large display type", () => {
    // Guard against the floor becoming an escape hatch: 3:1 is a real WCAG
    // allowance, not a way to launder a failing token.
    const large = PAIRS.filter((pair) => pair.floor === AA_LARGE);
    expect(large.every((pair) => pair.what.includes("display"))).toBe(true);
  });
});

/**
 * #1449 — THE ALARM AND NOTICE ROLES ARE TWO HUES, ON EVERY SHEET.
 *
 * The bug this file exists for is a ratio; the bug #1449 fixed is not, and the
 * distinction is worth keeping visible. `-card-notice` was the card family's
 * whole attention role, so `sheetInk` handed it to the flagged badge AND the
 * failed badge, and to the moderator's `hide` and `fail` controls sitting side
 * by side — four marks, two meanings, one colour. Every one of those pairings
 * measured well clear of AA the entire time, because contrast maths knows what
 * an ink sits on and never what it sits BESIDE.
 *
 * So the family carries a second ink and this is the assertion that keeps it a
 * second ink. Without it, `--faction-{key}-card-alarm: var(--faction-{key}-card-
 * notice)` would restore the collapse with every row above still green.
 *
 * ponytail: this only catches the collapse it was written for — one value doing
 * both roles. It cannot see two reds a viewer could not tell apart, because
 * "distinguishable hue" is not something a hex inequality knows. The upgrade
 * path is a hue-distance floor between the two, and the time to mint it is when
 * a repaint walks them together, not now: the shipped pair differs by ~22° of
 * hue in light (red-800 against amber-900) and is a salmon against an amber in
 * dark.
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

  // The S.N.I.D.E. WALL pair (#1451) is the same two roles on a ground the card
  // family cannot reach, so it owes the same non-ratio assertion: a `var()`
  // alias between them would leave every ratio above green.
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
 * #1549 — THE NEUTRAL TEXT VOCABULARY IS THREE INKS, NOT TWO.
 *
 * This is #1449's ponytail collected. That block guards the card family's
 * alarm/notice split with a hex INEQUALITY, and says so: it cannot see two reds
 * a viewer could not tell apart, and the upgrade path is a distance floor, to
 * be minted "when a repaint walks them together, not now". This is that
 * repaint, one token family over.
 *
 * `--color-text-secondary` (#6b6050) and `--color-text-tertiary` (#6c6358) were
 * one hex step apart per channel in LIGHT — ΔE 3.4, 5.60:1 against 5.37:1 on
 * the page — so the site advertised a three-tier vocabulary and rendered two.
 * A hex inequality would have passed that the entire time, and so did every
 * ratio in this file, because both inks were comfortably AA-clear on every
 * ground. THE TIERS WERE LEGIBLE AND INDISTINGUISHABLE, which is a defect a
 * contrast manifest is structurally unable to notice.
 *
 * WHY A DISTANCE AND NOT A RATIO-GAP. The obvious guard — "tertiary must be N
 * ratio points quieter than secondary" — encodes an assumption #1549 measured
 * and rejected. Secondary bottomed out UNDER AA on the selected filter row
 * (4.05:1 light, 3.80:1 dark), so a rung genuinely below it and still above AA
 * had nowhere at all to stand. The third tier is a TEMPERATURE (a lavender
 * against warm greys, in both cascades), and temperature is a distance, not a
 * ratio.
 *
 * #1715 LIFTED BOTH TIERS AND THE FLOOR BELOW IS NOW THE BINDING CONSTRAINT IN
 * DARK, which is worth knowing before the next repaint reaches for more. Dark
 * primary is a warm cream and dark secondary is the same hue family, so the two
 * are separated by lightness alone: the AAA lift spends 12 of the 32.7 ΔE
 * between them and lands at 20.7, against this block's floor of 20. Tertiary
 * escapes by hue and has 36.9 to spend. There is about 1 L* of room left on
 * secondary, and after that a lift has to move primary.
 *
 * THE FLOOR IS 20, well under the 29.5 the tightest shipped pair measures and
 * an order of magnitude over the 3.4 that failed. It is deliberately not set
 * just under today's values: a floor that tracks the current palette turns
 * every future re-tune into a test edit, and the question being asked here is
 * "can a viewer tell these apart", to which 20 is a confident yes and 3.4 an
 * equally confident no.
 *
 * ponytail: CIE76 under-reports hue swings very close to neutral, so a pair
 * this passes is genuinely distinct while a pair it fails MIGHT be. That is the
 * safe direction for a floor. Swap in CIEDE2000 if a legitimate palette ever
 * trips it — do not lower the number.
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
 * #1413 — A TRANSLUCENT SURFACE IS NOT A GROUND.
 *
 * The ratios above are the symptom; this is the shape. `--color-bg-surface` is
 * alpha in both themes, so a card filled with it has no value of its own — what
 * the ink is measured against is decided by the page it lands on, which for
 * `.sidebar-card` is nine faction walls on the praxis detail alone. No `Pair`
 * can name "72% white over whatever this happens to be mounted on", so the
 * whole family was unassertable and stayed green while `--color-danger` sat at
 * 2.54:1 on Singularity's terminal.
 *
 * The fix is to stop leaving it to the mount: the frost becomes a background
 * IMAGE and the stock under it becomes a declared property, `--card-ground`.
 * Unset it is `transparent`, which composites to exactly today's render — so
 * every card in the app that genuinely wants to frost what is behind it keeps
 * doing so, and only chrome that names a ground gets a fixed one.
 *
 * This is a source assertion rather than a ratio because the bug is structural:
 * every ratio in this file was green throughout. It is the same reason #1449's
 * alarm-is-not-notice row exists — a guard that measures an ink against a
 * ground is blind to the ground not being one.
 *
 * ponytail: it reads the declaration text, so it pins the MECHANISM and not the
 * rendering. A `.sidebar-card` whose ground resolved to a translucent token
 * would still pass here; `e2e/contrast.spec.ts` measures the real composite.
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
   * #1606 — the same promise, second property. `.eyebrow` HARDCODED
   * `--color-text-tertiary`, so a label inside the steward bar or the report
   * card was neutral whatever it was mounted in. #1307 replaced it with two
   * tiers that read `--label-ink`, a SEAM a faction frame is meant to set once
   * on its own root — and ADR-0061 mounts both of those cards BARE inside that
   * root. `WowFactionBody` already repoints the seam (on the faction detail
   * page, which holds no neutral chrome); the first praxis-detail skin to do
   * the same would tint moderation chrome on its wall and nowhere else.
   *
   * Pinning it here rather than colouring each label is the rule at the tiers'
   * own declaration: a per-label colour is the per-component contradiction
   * #1252 exists to stop, and it is invisible to every ratio in this file.
   */
  it("the neutral chrome keeps the app's own label ink too (#1606)", () => {
    expect(
      ruleBody(".card-on-page"),
      "`.card-on-page` must pin `--label-ink` back to the neutral. Without it, the first faction frame to repoint the seam tints the praxis detail's steward bar and report card — which ADR-0061 mounts bare on nine walls precisely so moderation chrome reads the same everywhere.",
    ).toContain("--label-ink: var(--color-text-tertiary)");
  });
});

/**
 * #1307 — THE LABEL TIER IS TWO TIERS, AND ITS INK IS A SEAM.
 *
 * WHY THERE ARE NO NEW `Pair` ROWS BELOW, which is a finding rather than an
 * omission and is the whole reason this block is shaped the way it is.
 *
 * #1307 ruled "measure first, per tier, on all eight faction grounds; where the
 * neutral fails a ground, mint a per-faction label ink". The measurement was
 * done and it says the family gains no member. Both tiers sit under WCAG's
 * large-text threshold (11px and 12px), so both owe 4.5:1 and ONE measurement
 * serves the pair. `--color-text-tertiary` clears that floor on the app's two
 * stocks — already gated above, "app page / app alt surface, tertiary ink"
 * (#1549) — and on all eight card sheets in dark. It fails on three sheets in
 * LIGHT, and the reason is polarity rather than taste: S.N.I.D.E., Singularity
 * and — since #1627 — the Ephemerists plate are near-black in BOTH themes. No
 * light-cascade neutral clears a near-black sheet, so this is #694's shape: a
 * colour that must differ between two factions within one theme is a faction
 * question. #1715's AAA lift darkens the light neutral and so widens exactly
 * that gap (2.19 / 2.27 / 2.01 where they were 3.18 / 3.29 / 2.92) while every
 * light PAPER sheet gains about two ratio points. The three that lose are the
 * three no global value could serve; the mint below is still the answer, and it
 * is still deferred.
 *
 * And that faction question already has an answer with a name and a row.
 * `--faction-{key}-card-muted` IS the measured quiet ink for this role on that
 * sheet — 4.70:1 at worst, the Ephemerists plate — gated by `{key} card muted
 * text` above and, for the four keys whose sheet is a different token, by
 * `{key} praxis card sheet, muted ink`. Adding `{key} label ink on its sheet`
 * beside those would be a second name for one measurement, which is what this
 * file keeps warning about. So the frame points `--label-ink` at its own
 * `-card-muted` and nothing is minted, exactly as #1302 concluded for the
 * praxis card's shared inks.
 *
 * WHAT IS LEFT IS STRUCTURAL, and it is the #1449 / #1413 shape: a guard that
 * measures an ink against a ground is blind to the ink not being reachable.
 * Every ratio in this file stays green through a `.label-caption` that
 * hardcodes `--color-text-tertiary` — and that version puts 2.19:1 back on the
 * S.N.I.D.E. sheet with no faction able to do anything about it, because the
 * seam a frame repoints would no longer be read. Likewise every ratio stays
 * green through a `.label-caption` that goes back to uppercase on 0.15em
 * tracking, which is `.eyebrow` again under a new name and the collapse #1307
 * undid.
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
    // The SELECTOR, not the string: the block above still names the class in
    // prose, and a comment is not a declaration.
    expect(
      CSS_TEXT.includes(".eyebrow-sentence {"),
      "`.eyebrow-sentence` was a caption wearing a heading's clothes (#850). The two-tier split is the rethink it should have had; keeping it is keeping a second thing to sync.",
    ).toBe(false);
  });

  /**
   * #1754 — THE SEAM IS SPENT, ON THE ONE SHEET THAT NEEDED IT.
   *
   * #1307 measured the mint and deferred it; #1715 lifted the neutral to AAA on
   * the app's own stocks and, being forbidden from patching around its own
   * global, reported the casualty instead. This is that report accepted. The
   * light neutral on the plate's three grounds measures 2.15 (page) / 2.01
   * (sheet) / 1.86 (inner cell) — it was 3.12 / 2.92 / 2.70 before the lift, so
   * the lift DEEPENED a surface that was already far under the floor rather than
   * breaking a passing one.
   *
   * The other two always-dark sheets cover themselves and are deliberately not
   * touched: the S.N.I.D.E. comment voice moved its shared slots onto flipping
   * slip stock, and both Singularity chassis repoint the global inks outright.
   *
   * WHY `-plate-quiet` AND NOT `-card-muted`, which is the default the seam's
   * own declaration names. `-card-muted` is the PRAXIS CARD's second tier and
   * is measured on the sheet that card paints; `.eph-plate-sheet`'s grounds are
   * the page, the plate and the panel cell, and `-plate-quiet` is the sibling
   * minted for exactly those three
   * (#1173: `-quiet` is the standing name for "same role, second ground"), and
   * it is what the plate's own quiet prose already reads, so the label tier
   * joins the register instead of introducing a fourth warm tone on the same
   * sheet. The three pairings are gated by `ephemerists page ground / plate /
   * panel cell, quiet ink` below, in BOTH cascades — since #2141 those are two
   * real readings each rather than one taken twice, because the register grew a
   * vellum half. The figures this note used to quote (6.38 / 5.98 / 5.52, and
   * "dark gives up ~2.3 points to hold one ink across a register that declares
   * nothing under dark") were measured on the frozen night-valued register and
   * are not restated here: the rows carry the numbers, and a comment that
   * restates them is the thing that goes stale.
   *
   * NO `Pair` ROW IS ADDED, for the reason this file keeps giving. All three
   * pairings are already gated above — `ephemerists page ground, quiet ink`,
   * `ephemerists plate, quiet ink`, `ephemerists panel cell, quiet ink` — and a
   * fourth row named for the label tier would be a second name for one
   * measurement. What a ratio row CANNOT see is the wiring: every number in this
   * file stays green through an `.eph-plate-sheet` that drops this declaration,
   * because the pairing that restores is "a global neutral on a faction ground",
   * which a token-value manifest is structurally unable to name (#694).
   *
   * The VELLUM sheet was checked at the same time and needs nothing: the codex
   * stock flips with the theme, so the neutral reads 6.33:1 on it in light and
   * 8.28:1 in dark. It also has no reader left in the app since #1627 — the
   * "vellum 4.36" figure the seam's declaration used to carry was measured on
   * the old tertiary AND on a surface nothing paints any more.
   */
  it("the Ephemerists plate repoints the label seam onto its own quiet ink (#1754)", () => {
    expect(
      ruleBody(".eph-plate-sheet"),
      "`.eph-plate-sheet` is the column both Ephemerists detail pages wear, and it is the one sheet in the kit where a bare `.label-caption` lands on the global neutral over a night ground — the comment leaves' owner controls and the thread heading at 2.01:1 in light. Without this the plate has no way to fix its own sheet.",
    ).toContain("--label-ink: var(--faction-ephemerists-plate-quiet)");
  });

  /**
   * #1800 — AND THE OTHER ROOT, which is the same finding #1636 made one
   * property over and the reason that block's assertion is not one assertion.
   * `.eph-plate-sheet` is worn by the two DETAIL columns and nothing else;
   * `EphemeristsEditPraxis`'s `dress.pageStyle` is the one Ephemerists root
   * outside that column, mounted by both `ComposerPage` and
   * `PraxisWaitingSurface`. Unset there, every `.label-caption` inside the
   * composer sheet reads the global tertiary on `-plate-bg` (2.01:1 light) and
   * inside a panel cell on `-plate-inner` (1.86:1) — the same numbers #1754
   * measured, on the column it was scoped out of.
   *
   * The composer's PAGE ground is not the plate's, and that is worth stating
   * because it is the trap: `ComposerPage` renders a bare `<div style={style}>`
   * with no background, so the ground under the sheet is the APP's
   * `--color-bg-page`, where `-plate-quiet` reads 2.64:1 in light. Nothing is
   * broken by that today — every `.label-caption` this root cascades to renders
   * inside `ComposerSheet` (`-plate-bg`) or a panel (`-plate-inner`), and the
   * breadcrumb, the one thing on the bare page, is neutral SITE chrome reading
   * the app's own tertiary — it took a `breadcrumbInk` off the dress until
   * #2102 collapsed the site onto one breadcrumb and deleted the field. A label
   * mounted directly on the composer page would be the
   * exception, and it would be the same defect #1793 fixed on the faction page.
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
 * #1636 — A PROSE LINK'S INK IS A SEAM TOO.
 *
 * `.markdown-preview` is the only rule in the app that colours a link, and it
 * carried ONE ink for every ground it is ever mounted on: `--color-text-
 * secondary`, a warm brown in light, chosen against the app's near-white page.
 * The praxis body is faction-skinned on all eight sheets, so that brown lands on
 * S.N.I.D.E.'s photocopier black (3.06:1 then, 2.20:1 since #1715's lift),
 * Singularity's terminal (3.17:1 / 2.28:1) and —
 * once the Valley plate is dark in both cascades — the Ephemerists' page ground,
 * where it was ALREADY the tightest reading in the family at 4.23:1.
 *
 * This is #1307's shape one property over, and it takes #1307's answer: the ink
 * becomes a seam a faction frame repoints once on its own root, defaulted at
 * `:root` to the neutral so it renders exactly what it renders today everywhere
 * else. NOTHING IS MINTED for the Ephemerists half — `-plate-brass-light` is
 * declared "links + affirmations" and is already measured on all three of the
 * register's sheets by the rows above, which is why this block asserts the
 * WIRING and adds no `Pair`. A second name for a measured value is a name
 * pretending to be one. (It was the register's nile until #2141 deleted the
 * faction's aqua; the seam is unchanged, only what it points at.)
 *
 * And the wiring is the only assertable half. Every ratio in this file stays
 * green through a `.markdown-preview a` that hardcodes the neutral, because the
 * pairing it creates is "a global ink on a faction ground" — the #694 shape a
 * token-value manifest is structurally unable to name.
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

  // ...and the OTHER root, which is why this assertion is not one assertion.
  // `.eph-plate-sheet` is worn by the two detail columns and nothing else, so
  // the seam reached `MarkdownPreview` on the detail pages and missed it in the
  // composer and the waiting surface — where `BodyPreview` renders the same
  // `.markdown-preview` into a panel cell, at 2.60:1 with hover at 1.16:1. Both
  // of those mount `dress.pageStyle`, which is the one Ephemerists root outside
  // that column, so the seam is declared there. A ratio row cannot see this: the
  // pairing it would name (`nile` on `-plate-inner`) is already green above,
  // measured on a surface that was not reading it.
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
 * #1636 — A TRANSITIONED `background` SHORTHAND CANNOT CARRY A THEMED TOKEN.
 *
 * The shorthand resets `background-image`, `-position`, `-size` and `-repeat`
 * along with the colour, and naming it in a `transition` names a list of
 * longhands only one of which is interpolable. A ground that has to re-resolve
 * through the `[data-theme]` cascade wants the colour in `background-color`,
 * where it is one declaration that one transition can carry — the shape
 * `.wow-detail-field` and `.ua-praxis-leaf` already use.
 *
 * Asserted on the declaration rather than on a render for the reason #1413
 * gives: a ground that is not a ground leaves every ratio in this file green.
 */
describe("a themed ground is a longhand (#1636)", () => {
  // A SCAN, NOT A LIST. This block began as four named selectors — the four
  // grounds #1636 fixed — which is precisely the shape WORLD_ZERO_STYLE warns
  // about two sections earlier: a per-file check leaves the fifth instance
  // unguarded, and the fifth instance is the one nobody is looking at. The
  // defect has an exact syntactic signature, so the whole stylesheet can be
  // asked at once and every future rule is covered for free.
  it("no rule transitions the `background` shorthand", () => {
    const offenders = [...stripComments(CSS_TEXT).matchAll(/transition:[^;}]*/g)]
      .map((match) => match[0].trim())
      // `background-color`, `background-size` and friends are longhands and are
      // exactly what this asks for; only the bare shorthand is the bug.
      .filter((declaration) => /(^|[\s,:])background(\s|,|$)/.test(declaration));
    expect(
      offenders,
      "a `transition` naming `background` animates a list of longhands only `background-color` interpolates, and the shorthand it goes with resets `-image`, `-position`, `-size` and `-repeat` every time the cascade re-resolves the token. Name the longhand.",
    ).toEqual([]);
  });

  // ...and the other half of the same swap: a rule that transitions a ground
  // must have a ground to transition. Also derived from the file rather than
  // named, so it grows with it.
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
 * #1793 — A NIGHT-PLATE INK ON THE APP'S OWN PAGE.
 *
 * `EphemeristsFactionBody`'s root is a bare `.wz-faction-grid`, so the ground
 * under everything it does NOT put inside a `CARD` is `--color-bg-page`. #1675
 * already found this once, for the section headings and their kickers, and
 * repainted those onto the app's own tiers with the ruling that names the shape:
 * "the root is a bare `.wz-faction-grid`, so the ground is the app's, and the
 * ink has to be the app's too." Three quiet paragraphs on the same page were
 * left behind — the tasks and praxis empty states, which the nightly rendered
 * sweep then caught at 2.64:1.
 *
 * WHY THE TOKEN DOES NOT MOVE, which is the answer this block exists to record
 * so the next reader does not re-run the search. `-plate-quiet` has to clear
 * 4.5:1 on the plate register's loosest ground, `-plate-inner` (#1d2130), which
 * puts a floor under its relative luminance of 0.2453; clearing 4.5:1 on the
 * light page ground (#f7f4ee) puts a CEILING on it of 0.1626. The intervals do
 * not overlap, so no sRGB value satisfies both and the search is not "pick a
 * better hex" — it is "this ink is not for this ground". Same conclusion the
 * Ephemerists register itself reached one cascade over, in the `-plate-bg`
 * comment in index.css.
 *
 * ASSERTED ON THE SOURCE, not on a ratio, for the reason #1413 and #1307 give:
 * the pairing "a faction ink on the app's page" is one a token-value manifest is
 * structurally unable to name, and every row above stays green through it.
 */
describe("the Ephemerists faction page paints the page's ink outside its cards (#1793)", () => {
  const SOURCE = sourceOf("pages/factionDetail/archetypes/EphemeristsFactionBody.tsx");

  // The two strings the nightly sweep measured, plus the roster's — the third
  // is INSIDE a `CARD` and is here to prove the guard can tell them apart.
  //
  // The keys were `ephemerists.tasks.empty` / `.praxis.empty` / `.roster.
  // emptyWithSpotlight` until #1911 collapsed all three families onto the
  // shared `detail.*` block. The ELEMENTS did not move and neither did their
  // inks: this guard is about which ground a paragraph sits on, and that is
  // still a property of this file rather than of the catalog.
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
    // The search #1793 asks for, run rather than asserted in prose. The plate's
    // loosest ground and the app's light page bound the ink's luminance from
    // opposite sides, and a ratio is monotonic in luminance — so if the floor
    // the one imposes is above the ceiling the other imposes, the set is empty
    // whatever the hue.
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
 * A token scoped to LARGE display type has to stay there (#1766).
 *
 * `--faction-ua-vermil` is declared "the ensō score numeral — large display type
 * only", and the manifest above measures it at `AA_LARGE` for exactly that
 * reason. Item 2 of #1766 was the mobile faction page painting it on a 14px/600
 * member-row rank — 4.12:1 on the dark sheet, a real AA failure that every ratio
 * in this file stayed green through, because the pairing the manifest asserts is
 * the one the DECLARATION describes and not the one a component drew.
 *
 * So the guard is a reader allowlist rather than a ratio, in the shape #1449 and
 * #1413 already set here: a scope written in a comment is a rule a future editor
 * has to remember, and a list the suite reads is one it cannot forget. Adding a
 * reader is fine — it is a line of diff that makes you say the numeral is at
 * display size. `--faction-ua` and `--faction-ua-glow` are not covered: the fill
 * has legitimate non-text uses everywhere, and the glow is ornament with no text
 * pairing at all.
 */
describe("UA's display-only vermilion stays on display type (#1766)", () => {
  const VERMIL = "--faction-ua-vermil";

  /** Every shipped file allowed to paint it, and what it draws there. */
  const READERS: Record<string, string> = {
    "pages/characterProfile/archetypes/UaProfileBody.tsx": "a gradient stop, not text",
    "pages/editPraxis/archetypes/UaEditPraxis.tsx": "the composer's errorColor",
    "pages/taskDetail/archetypes/UaTaskDetail.tsx": "the ensō numeral, display size",
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
 * `--everymen-ink` is STRUCTURE, and the two surfaces grounded on the paper may
 * not set text in it (#2133).
 *
 * The pairing shape, in the one cascade the value test cannot see. index.css
 * states the split in words — "the paper surface + its text FLIP in dark; ink is
 * structure: borders, rules, text on gold/parchment elements" — and the manifest
 * above measures both halves of it and stays green: `--everymen-ink` really does
 * clear on the cream and on the gold, and `--everymen-paper-text` really does
 * clear on the paper. No row of it can see a COMPONENT reaching past the
 * flipping ink for the frozen one.
 *
 * It is invisible by daylight too, which is why an eyeball audit kept missing
 * it: the two tokens are the SAME hex in light (#221a12), so the bug has no
 * light mode at all. In dark the paper flips to #221a16 and the ink does not
 * flip — 1.16:1 on the paper, 1.06:1 on the deep stock. That is the
 * "theme-invariant surface, flipping ink" trap read backwards.
 *
 * A `color:` is the only place it bites: a border or a box-shadow struck in the
 * frozen ink goes dim in dark, not illegible, and four sibling archetypes
 * already say as much in their own comments ("NOT `--everymen-ink`, which
 * vanishes on the dark sheet"). So the guard is a per-file reader rule, in the
 * shape #1793 and #1766 set here — the files whose GROUND is the paper are
 * named, and in those files the structure ink may not be a text colour.
 */
describe("`--everymen-ink` stays structure on the paper (#2133)", () => {
  const AS_TEXT = /color:\s*(INK\b|['"`]var\(--everymen-ink\))/g;
  const WHY =
    "on the paper the ink is 1.16:1 in dark (1.06:1 on the deep stock). Text on this ground takes `--everymen-paper-text`, which flips with the stock — 13.19:1 light, 13.96:1 dark — and is byte-identical to the ink in light, so nothing moves by day. Borders, fills and shadows keep `INK`.";

  /**
   * The alias every rule below is written against. A rename would otherwise
   * pass by matching nothing.
   */
  function paperSource(relative: string): string {
    const source = stripComments(sourceOf(relative));
    expect(
      source,
      `${relative} no longer binds \`INK\` to --everymen-ink; retarget this guard at whatever the structure ink is called there now.`,
    ).toMatch(/const INK = ['"]var\(--everymen-ink\)['"]/);
    return source;
  }

  /**
   * The faction page WAS a mixed file, and that is the whole reason the bug was
   * hard to see: nearly all of its type sat inside `PAPER_FRAME`, whose stock
   * was `--everymen-cream` — theme-invariant, so the frozen ink was correct
   * there and eight `color: INK` sites in this file were right. Only the two
   * section headings stood on the page, so #2133's rule was per-element.
   *
   * #2227 ENDED THE MIX. The cream slab was ruled a mistake, the frames took
   * `--everymen-paper`, and with that every one of those eight sites became the
   * bug this block is about. So the rule widens to the whole file, the shape
   * `EverymenFieldDesk` below has always had — and it is now the SAME rule for
   * the same reason, which is the point: one stock, one ink.
   *
   * The heading assertion stays as its own claim. A file-wide negative can be
   * satisfied by deleting the colour altogether; this says what the ink IS.
   */
  it("EverymenFactionBody sets no text in the structure ink at all", () => {
    const source = paperSource("pages/factionDetail/archetypes/EverymenFactionBody.tsx");
    expect(
      source,
      "`--everymen-cream` is an ink on this page, never a ground — the frames stand on `--everymen-paper` since #2227. A cream slab here is a headlight on a dark page AND it re-freezes the stock under eight ink sites.",
    ).not.toMatch(/background:\s*CREAM\b/);
    expect(source.match(AS_TEXT) ?? [], WHY).toEqual([]);
  });

  it("EverymenFactionBody's section heading is inked for the stock, not the structure", () => {
    const source = paperSource("pages/factionDetail/archetypes/EverymenFactionBody.tsx");
    const at = source.indexOf("const SECTION_HEADING_TEXT");
    expect(at, "no `SECTION_HEADING_TEXT` in EverymenFactionBody").toBeGreaterThan(-1);
    const style = source.slice(at, source.indexOf("};", at));
    expect(style, WHY).not.toMatch(AS_TEXT);
    expect(
      style,
      "`SectionHeading` renders straight into `.wz-faction-grid`, which stands on `.em-backdrop`.",
    ).toContain("color: PAPER_TEXT");
  });

  /**
   * The mobile desk is NOT mixed, which is why its rule can be the whole file:
   * every ground it paints is the paper, the deep stock, the red band or the
   * ink itself, and `CREAM` appears only as an ink on the last two. Six sites
   * read the frozen ink as text, all of them on the paper family. If a cream
   * plate is ever added here, `INK` becomes right on it and this rule has to
   * narrow to the elements the way the faction body's did.
   */
  it("EverymenFieldDesk sets no text in the structure ink at all", () => {
    const source = paperSource("pages/fieldDesk/mobileArchetypes/EverymenFieldDesk.tsx");
    expect(
      source,
      "`CREAM` is an ink on this desk, never a ground — every stock under its type is the paper family.",
    ).not.toMatch(/background:\s*CREAM\b/);
    expect(source.match(AS_TEXT) ?? [], WHY).toEqual([]);
  });

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

/**
 * `--faction-snide-acid` never touches paper (#2173).
 *
 * The SAME shape as `--everymen-ink` one block up, in the OPPOSITE cascade: a
 * theme-INVARIANT ink on a ground that flips. Everymen was unreadable at night;
 * S.N.I.D.E.'s acid heading was 1.03:1 by DAY on `.snide-backdrop`, and 16.33:1
 * by night. Part A could not see it — both tokens clear on the surfaces their
 * documentation names, and the pairing exists only at a call site.
 *
 * WHY THIS ONE COULD NOT BE A REPICK, which is what makes the guard's shape
 * different from #2133's. There was no ink to move to: the light wall's
 * relative luminance (0.8389) forces any AA-clearing ink below L 0.1475, and
 * acid green is a light colour, so every candidate at that luminance is a dark
 * olive — `-acid-deep` reaches 2.30:1 and is not a rung. So the owner's ruling
 * (2026-08-18) changes the GROUND, per §3's own doctrine, and turns the repair
 * into an ornament: acid keeps its acid and carries a photocopier-black plate,
 * which on the light wall reads as a CENSOR BAR.
 *
 * The pairing rows below are the ruling's two measurements. The source rows are
 * what a ratio cannot ask: that the plate is actually AT the site, and that the
 * empty states beside it stepped off the CARD's muted tier — the tier error the
 * issue diagnosed — onto the wall's own flipping ink.
 *
 * THE BAR IS EXPECTED TO DISSOLVE IN DARK, and nothing here asserts otherwise:
 * the plate and the dark wall are both near-black, so by night the heading is
 * plain acid, exactly as it was. That is why the plate is asserted to be
 * `--faction-snide-ink` by NAME rather than by any ratio against the wall.
 */
describe("`--faction-snide-acid` never touches paper (#2173)", () => {
  const BODY = "pages/factionDetail/archetypes/SnideFactionBody.tsx";

  /**
   * The aliases every rule below is written against. A rename would otherwise
   * pass by matching nothing — the failure mode `paperSource` guards one block
   * up, for the same reason.
   */
  function snideBodySource(): string {
    const source = stripComments(sourceOf(BODY));
    for (const [alias, token] of [
      ["ACID", "--faction-snide-acid"],
      ["INK", "--faction-snide-ink"],
      ["WALL_TEXT", "--faction-snide-wall-text"],
    ] as const) {
      expect(
        source,
        `${BODY} no longer binds \`${alias}\` to ${token}; retarget this guard at whatever it is called there now.`,
      ).toMatch(new RegExp(`const ${alias} = ["']var\\(${token}\\)["']`));
    }
    return source;
  }

  it("the section heading carries the plate, not the bare wall", () => {
    const source = snideBodySource();
    const at = source.indexOf("const SECTION_HEADING_TEXT");
    expect(at, `no \`SECTION_HEADING_TEXT\` in ${BODY}`).toBeGreaterThan(-1);
    const style = source.slice(at, source.indexOf("};", at));
    // The pairing is spelt once now and spread — #2343 flipped this page's
    // panels onto the wall, so the five OTHER acid headings that used to sit on
    // a black panel need the identical two declarations, and transcribing them
    // six times is how one of the six later loses its plate. The assertion is
    // the same assertion, read through the alias: this heading takes the plate,
    // and the plate is acid on photocopier black.
    expect(
      style,
      "`SectionHeading` renders straight into `.wz-faction-grid`, which stands on `.snide-backdrop` — and that wall FLIPS while the acid does not.",
    ).toContain("...ACID_PLATE");
    expect(
      source,
      "acid as TYPE owes a photocopier-black ground: 16.33:1 in both cascades, and on the light wall the plate is the censor bar the ruling asked for. Lightening it to make the bar visible at night spends exactly that ratio.",
    ).toMatch(/const ACID_PLATE: CSSProperties = \{ color: ACID, background: INK \};/);
  });

  it("the empty states on the wall take the wall's ink, not the card's", () => {
    const source = snideBodySource();
    for (const copy of ["detail.default.tasksEmpty", "detail.default.recentEmpty"]) {
      const at = source.indexOf(copy);
      expect(at, `no \`${copy}\` in ${BODY}`).toBeGreaterThan(-1);
      const line = source.slice(source.lastIndexOf("\n", at) + 1, source.indexOf("\n", at));
      expect(
        line,
        `${copy} stands on the wall, not on a panel. \`--faction-snide-card-muted\` is the SLAB's tier and reads 1.24:1 there; the wall's own ink flips with it.`,
      ).toContain("color: WALL_TEXT");
      expect(line, "MUTED is the card tier — correct on a card, a tier error on the wall.").not.toContain(
        "color: MUTED",
      );
    }
  });

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
 * The S.N.I.D.E. field desk stands on the wall, and its masthead is CUT (#2287).
 *
 * Owner ruling on a report that the skin was "boring". Two halves, and both are
 * CONSUMPTION of drawings the kit already makes: the FIELDDESK masthead takes the
 * per-letter ransom cut the comment slip pastes a player's name up in, and the
 * credential panel takes the flyposted `WALL` the task card, the composer and the
 * praxis card already wear. The faction keeps three ransom sets already (the task
 * card's per-WORD `CUTS`, the seal's per-word chips, this per-LETTER one), so a
 * third transcription of the per-letter one was the live risk — hence the source
 * rows below, which fail on a copy rather than on a colour.
 *
 * THE GROUND MOVED UNDER INKS THAT WERE MEASURED ON THE OLD ONE, which is the
 * part a ratio manifest cannot notice by itself. The panel was
 * `--faction-snide-card-bg`, near-black in BOTH themes; the wall FLIPS. Every
 * `-card-*` ink on it was therefore correct only by night, and by day:
 *
 *   -card-text    1.05:1      the character's name
 *   -card-muted   1.24:1      the level line and the whole track baseline
 *   acid as type  1.03:1      the points figure — #2173's pairing exactly
 *
 * All three move to the `-note-*` family, which flips with the wall and which
 * `SNIDE_WALL_PAIRS` above already measures on all four of the wall's readings
 * (both ramp stops, both washed corners, both themes): `-note-ink` 11.87-15.95
 * light / 13.28-18.04 dark, `-note-muted` 5.02-6.75 / 9.38-12.75. Acid cannot
 * move — there is no rung — so it takes #2173's repair instead and carries the
 * photocopier-black plate, and so does the level track, whose acid END would
 * otherwise have read 1.03:1 against paper as a DRAWN mark.
 *
 * A RANSOM CUT IS GROUND-PORTABLE, and that is what let the mark travel with no
 * re-measurement of its own: every letter sits on its own OPAQUE scrap, so the
 * pairing is letter-on-scrap on any page. The alpha row below is the load-bearing
 * one — a scrap walked to an rgba would silently make the mark's legibility a
 * property of whatever it was pasted to. Two of the five scraps DO composite to
 * within 1.06:1 / 1.05:1 of the wall (the pale patch by day, the over-inked black
 * by night); that costs a texture, never a word.
 *
 * `ponytail:` the ink rows read the panel by slicing `<WallPanel>` out of the
 * source, so an ink that arrives through a module-level style object — the way
 * `actionPillStyle` does, correctly, because its own ground is a black chip — is
 * outside the slice. The upgrade path is the JSX walk the #2107 block below
 * declines for the same reason.
 */
describe("the S.N.I.D.E. field desk stands on the wall (#2287)", () => {
  const DESK = "pages/fieldDesk/mobileArchetypes/SnideFieldDesk.tsx";
  const ATOMS = "components/factionMarks/snideAtoms.tsx";
  const VOICE = "components/comments/voices/SnideComment.tsx";

  /** The aliases the source rows are written against — #2173's guard, verbatim. */
  function deskSource(): string {
    const source = stripComments(sourceOf(DESK));
    for (const [alias, token] of [
      ["NOTE_INK", "--faction-snide-note-ink"],
      ["NOTE_MUTED", "--faction-snide-note-muted"],
      ["ACID_PIGMENT", "--faction-snide-acid"],
      ["PLATE", "--faction-snide-ink"],
    ] as const) {
      expect(
        source,
        `${DESK} no longer binds \`${alias}\` to ${token}; retarget this guard at whatever it is called there now.`,
      ).toMatch(new RegExp(`const ${alias} = ["']var\\(${token}\\)["']`));
    }
    return source;
  }

  /** The credential panel's markup, which is the only part standing on the wall. */
  function wallPanelMarkup(source: string): string {
    const open = source.indexOf("<WallPanel>");
    const close = source.indexOf("</WallPanel>");
    expect(open, `no \`<WallPanel>\` mount in ${DESK}`).toBeGreaterThan(-1);
    expect(close, `no \`</WallPanel>\` close in ${DESK}`).toBeGreaterThan(open);
    return source.slice(open, close);
  }

  /** The scraps as the module actually declares them, so this cannot drift. */
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

  it("the panel's ground is the shared WALL, not a second copy of the recipe", () => {
    const source = deskSource();
    expect(
      source,
      "the wall is drawn once, in `factionMarks/snideAtoms`, because five surfaces wear it.",
    ).toMatch(/import \{ Ransom, WALL \} from ["'][^"']*factionMarks\/snideAtoms["']/);
    expect(wallPanelMarkup(source).length, "the panel mounts something").toBeGreaterThan(0);
    expect(source, "`WallPanel` grounds on the imported recipe").toMatch(/background: WALL,/);
    for (const layer of [
      "--faction-snide-note-grain",
      "--faction-snide-note-scan",
      "--faction-snide-note-wash-acid",
      "--faction-snide-note-wash-pink",
    ]) {
      expect(
        source,
        `${layer} is a layer of the shared wall. Naming it here is the transcription this guard exists to fail on — import \`WALL\`.`,
      ).not.toContain(layer);
    }
  });

  it("the masthead and the comment byline are cut from ONE drawing", () => {
    expect(
      deskSource(),
      "the FIELDDESK masthead is the ransom cut, mounted — not a bold condensed sans, which is what was reported.",
    ).toMatch(/<Ransom text=\{t\('fieldDesk\.home\.title'\)\}/);
    const voice = stripComments(sourceOf(VOICE));
    expect(voice, `${VOICE} mounts the shared cut`).toMatch(
      /import \{ Ransom \} from ["'][^"']*factionMarks\/snideAtoms["']/,
    );
    expect(
      voice,
      "a second `RANSOM` scrap table in the comment voice is the drift this move closed. The faction already keeps two OTHER ransom sets; the per-letter one is drawn once.",
    ).not.toMatch(/const RANSOM\b/);
  });

  it("the panel inks with the family that flips with its ground", () => {
    const panel = wallPanelMarkup(deskSource());
    for (const [alias, why] of [
      ["TEXT", "`-card-text` is pinned #f4f1e8 in both themes and reads 1.05:1 on the light wall"],
      ["MUTED", "`-card-muted` is the SLAB's quiet tier and reads 1.24:1 on the light wall"],
      ["ACID", "acid as TYPE reads 1.03:1 on the light wall — it takes the plate, as `ACID_PIGMENT`"],
    ] as const) {
      expect(panel, `${why} (#2066, #2173).`).not.toMatch(new RegExp(`color: ${alias}[,\\s}]`));
    }
    expect(panel, "the name and the level line read the wall's own flipping inks").toMatch(/color: NOTE_INK/);
    expect(panel, "and so does the quiet tier").toMatch(/color: NOTE_MUTED/);
  });

  it("acid on the panel carries its censor plate, and so does the level track", () => {
    const panel = wallPanelMarkup(deskSource());
    expect(
      panel,
      "the points figure is acid on `--faction-snide-ink` — the plate is the whole repair, and deleting it as ornament restores a 1.03:1 pairing by day.",
    ).toMatch(/color: ACID_PIGMENT, background: PLATE/);
    expect(
      panel,
      "the level track's groove is the same plate: its fill ramps INTO acid, and a drawn mark owes 1.4.11 on the ground it is actually on.",
    ).toMatch(/background: PLATE, marginTop/);
    expect(
      panel,
      "the old groove was a 4% wash of the card's paper ink — legible only because the track lay on a black card.",
    ).not.toContain("--faction-snide-card-text) 4%");
  });

  it("the halftone is gone from the panel rather than layered under the wall", () => {
    const panel = wallPanelMarkup(deskSource());
    expect(panel, "the acid dot screen was the panel's OLD ground; the wall replaces it.").not.toContain("HALFTONE");
  });

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
 * The S.N.I.D.E. FACTION PAGE stands on the wall (#2343).
 *
 * The same move as #2287 one block up, on the surface the owner was actually
 * looking at: the page's ground already flipped — `useFactionBackdrop` paints it
 * with `--faction-snide-wall` — while the hero and all four panels grounded on
 * `--faction-snide-ink`, which is theme-INVARIANT. So in light the whole page was
 * a dark island on a cream sheet. It REVERSES #2227, on the owner's ruling, and
 * it does not bring back what #2227 was right to retire: `--faction-snide-paper`
 * stays an ink. The panels take the wall, which already flips.
 *
 * WHY THE SWEEP IS THE INTERESTING HALF. #2173's own scope note recorded that
 * "exactly one site was inked onto the wall" — true, and true only because every
 * other acid-as-type site on this page sat inside the panel and the panel was
 * black. Flipping the panel lands all of them on paper in the same commit. That
 * is a shape a ratio manifest cannot see: it knows what an ink sits ON only where
 * somebody wrote the pairing down, and here the ground arrives from three
 * spreads away. So seam (a) is a SOURCE sweep, over both files, for the general
 * form of the defect — an acid ink whose own style object declares no plate —
 * rather than a list of today's six sites.
 *
 * SEAM (b) IS MOSTLY INHERITED, WHICH IS THE ARGUMENT FOR THE INKS CHOSEN.
 * `SNIDE_WALL_PAIRS` already measures `-note-ink`, `-note-muted` and
 * `-note-pink-ink` on both ends of the wall's ramp, both washed corners and both
 * themes, because three other surfaces already stand there; two rows were added
 * to that generator for the readings this page is the first to take BARE. Nothing
 * was minted. The rows below are the ones the generator cannot reach: a pairing
 * whose ground is the plate rather than the wall.
 *
 * WHAT MOVED IN DARK, stated because "unchanged" is the acceptance and this is
 * not byte-identical. The panel ground goes #14110b -> #0a0a0b and its primary
 * ink is unchanged at #f4f1e8; against the page's own backdrop the panel was
 * already only 1.045:1 and is now 1.000:1, which is a separation the edge and the
 * offset were always doing. `-card-muted` -> `-note-muted` is #d8d6c8 -> #cfcdbf.
 * Every dark pairing on both surfaces stays above 11:1.
 */
describe("the S.N.I.D.E. faction page stands on the wall (#2343)", () => {
  const BODY = "pages/factionDetail/archetypes/SnideFactionBody.tsx";
  const HERO = "components/factionHero/SnideFactionHero.tsx";

  /**
   * The aliases the source rows are written against — #2173's guard, verbatim.
   * A rename would otherwise pass by matching nothing.
   */
  const ALIASES: Record<string, ReadonlyArray<readonly [string, string]>> = {
    [BODY]: [
      ["ACID", "--faction-snide-acid"],
      ["INK", "--faction-snide-ink"],
      ["WALL", "--faction-snide-wall"],
      ["NOTE_INK", "--faction-snide-note-ink"],
      ["NOTE_MUTED", "--faction-snide-note-muted"],
      ["NOTE_PINK", "--faction-snide-note-pink-ink"],
      ["WALL_GREEN", "--faction-snide-wall-credit"],
      ["WALL_ALARM", "--faction-snide-wall-alarm"],
    ],
    [HERO]: [
      ["WALL", "--faction-snide-wall"],
      ["NOTE_INK", "--faction-snide-note-ink"],
      ["NOTE_MUTED", "--faction-snide-note-muted"],
      ["GRAIN", "--faction-snide-wall-text"],
      ["ACID", "--faction-snide-acid"],
      ["PLATE", "--faction-snide-ink"],
    ],
  };

  function boundSource(file: string): string {
    const source = stripComments(sourceOf(file));
    for (const [alias, token] of ALIASES[file]) {
      expect(
        source,
        `${file} no longer binds \`${alias}\` to ${token}; retarget this guard at whatever it is called there now.`,
      ).toMatch(new RegExp(`const ${alias} = ["']var\\(${token}\\)["']`));
    }
    return source;
  }

  /**
   * The `{ … }` literal a declaration sits inside — the style object, found by
   * brace depth rather than by regex, because a style object contains template
   * literals with their own `${}` and a block match would swallow the file.
   */
  function styleObjectAround(source: string, at: number): string {
    let depth = 0;
    let open = -1;
    for (let i = at; i >= 0; i--) {
      if (source[i] === "}") depth++;
      else if (source[i] === "{") {
        if (depth === 0) {
          open = i;
          break;
        }
        depth--;
      }
    }
    expect(open, `no enclosing style object for the declaration at ${at}`).toBeGreaterThan(-1);
    depth = 0;
    for (let i = open + 1; i < source.length; i++) {
      if (source[i] === "{") depth++;
      else if (source[i] === "}") {
        if (depth === 0) return source.slice(open, i + 1);
        depth--;
      }
    }
    throw new Error(`unclosed style object at ${open}`);
  }

  /**
   * The style object of the element that renders `marker` — its LAST occurrence,
   * because `{spot.display_name}` is also the `Mugshot`'s `name=` prop three
   * elements above the name plate, and the mugshot brings its own ground.
   */
  function styleRendering(source: string, file: string, marker: string): string {
    const at = source.lastIndexOf(marker);
    expect(at, `no \`${marker}\` in ${file}`).toBeGreaterThan(-1);
    const style = source.lastIndexOf("style={{", at);
    expect(style, `\`${marker}\` in ${file} is rendered by no styled element`).toBeGreaterThan(-1);
    return styleObjectAround(source, style + "style={{".length);
  }

  it("the hero grounds on the wall that flips, not the press that does not", () => {
    const source = boundSource(HERO);
    // The hero's own `<header>` is the file's first styled element.
    const header = styleObjectAround(source, source.indexOf("style={{") + "style={{".length);
    expect(header, "the hero's own ground is the wall").toContain("background: WALL");
    expect(
      header,
      "`-card-text` is pinned #f4f1e8 in both themes and reads 1.05:1 on the light wall; the wall's ink flips with it.",
    ).not.toContain("card-text");
    expect(
      source,
      "the eyebrow typed in the INVARIANT `-paper` — xerox white on xerox stock.",
    ).not.toMatch(/color: PAPER|color: "var\(--faction-snide-paper\)"/);
  });

  it("the hero's raster and its five ghosts flip with the ground", () => {
    const source = boundSource(HERO);
    for (const [alpha, why] of [
      ["rgba(182,255,46", "acid at 2.5-7% over xerox stock is a luminance step of 0.0006 — the hero would render as the one flat rectangle on a textured page"],
      ["rgba(255,45,139", "the pink ghosts were drawn against black too"],
      ["rgba(0,0,0,0.34", "the stat chits' wash is #2303, and the plate acid owes the wall resolves it — there is no wash left to name a rung for"],
    ] as const) {
      expect(source, `${why} (#2343).`).not.toContain(alpha);
    }
    expect(
      source,
      "the DENSITY is still the drawing and every percentage is unchanged; only the hue moved onto the ink that flips with the ground.",
    ).toMatch(/color-mix\(in srgb, \$\{GRAIN\} 5\.5%, transparent\)/);
  });

  it("the panels take the wall, and the edge that separates them from it", () => {
    const source = boundSource(BODY);
    const at = source.indexOf("const WALL_PANEL");
    expect(at, `no \`WALL_PANEL\` in ${BODY}`).toBeGreaterThan(-1);
    const panel = source.slice(at, source.indexOf("};", at));
    expect(panel, "the panel's ground FLIPS with the page it is pasted to").toContain("background: WALL");
    expect(panel, "and so does the ink read on it").toContain("color: NOTE_INK");
    expect(
      panel,
      "the page's own ground is this same wall, so the edge is the only thing that separates a panel from it — and an 18% acid hairline over xerox stock is a 0.004 luminance step. `-note-wall-edge` flips, and is the edge the task card on this very page already draws.",
    ).toContain("--faction-snide-note-wall-edge");
    expect(
      source,
      "`INK_PANEL` grounded on the INVARIANT press ink while the page under it flipped. That name is the whole bug — the wall is `-wall`, `-ink` is the press.",
    ).not.toContain("INK_PANEL:");
  });

  it("nothing on either surface reads the CARD's tiers on the wall", () => {
    for (const [file, allowed] of [
      // The hero's stat chits ARE a slab — they ground on the plate — so the
      // card's quiet tier is the correct one inside them and only inside them.
      [HERO, 1],
      [BODY, 0],
    ] as const) {
      const source = boundSource(file);
      const hits = source.match(/--faction-snide-card-(?:text|muted)\b/g) ?? [];
      expect(
        hits.length,
        `${file} reads the CARD's tier ${hits.length} times and ${allowed} site(s) stand on a slab. Every other one is on the wall, where -card-text is 1.05:1 and -card-muted 1.24:1 by day (#2066, #2173).`,
      ).toBe(allowed);
    }
  });

  it("no acid ink on either surface has a non-ink immediate ground", () => {
    // The general form of #2173, swept rather than listed: wherever `ACID` is
    // set as a `color`, the SAME style object must set a ground that is the
    // photocopier plate. A site that reaches its ground from a parent passes a
    // per-element sweep and fails a viewer, so the plate is co-located by rule —
    // which is why the hero's chit numeral inherits its acid from the chit.
    const ACID_AS_INK = /\bcolor:\s*[^,;\n}]*\bACID\b/g;
    const PLATED = /background:[^,;\n}]*\b(?:INK|PLATE)\b/;
    for (const file of [BODY, HERO]) {
      const source = boundSource(file);
      const matches = [...source.matchAll(ACID_AS_INK)];
      expect(matches.length, `no acid ink at all in ${file} — this sweep has stopped reading the surface`).toBeGreaterThan(0);
      for (const match of matches) {
        expect(
          styleObjectAround(source, match.index!),
          `${file}: acid is set as an ink here with no photocopier plate under it. On the light wall that is 1.03:1, and there is no darker acid to reach for — the ground moves, not the ink (#2173).`,
        ).toMatch(PLATED);
      }
    }
  });

  it("every acid heading the panel flip landed on paper kept its plate", () => {
    const source = boundSource(BODY);
    for (const [marker, role] of [
      ['t("snide.dispatch.letterhead")', "the dispatch letterhead"],
      ['t("snide.dispatch.memberTitle")', "the member standing headline"],
      ['t("snide.dispatch.eligibleTitle")', "the join headline"],
      ['t("snide.dispatch.gateTitle")', "the gate / burned headline"],
      ['t("snide.spotlight.label")', "the WANTED spotlight label"],
      ["{spot.display_name}", "the spotlight's stencilled name plate"],
    ] as const) {
      expect(
        styleRendering(source, BODY, marker),
        `${role} was acid on a BLACK panel until #2343 flipped the panel onto the wall. It owes the plate now.`,
      ).toContain("...ACID_PLATE");
    }
  });

  it("the pinks and greens that carry WORDS stepped onto the wall's rungs", () => {
    const source = boundSource(BODY);
    expect(
      source,
      "`PINK` is the PIGMENT: correct as a FILL (the join button, which inks through `-on-accent` at 5.38:1) and 2.98:1 as TYPE on the light wall.",
    ).not.toMatch(/color: PINK[,\s}]/);
    expect(
      source,
      "`GREEN` is `-acid-deep`, picked because it read on the always-dark panel; on the light wall it is 2.30:1. It keeps the barcode and the mugshot's rim, whose ground really is the press.",
    ).not.toMatch(/color: GREEN[,\s}]/);
    expect(source, "the marker scrawl takes the wall's own green").toContain("color: WALL_GREEN");
    expect(
      source,
      "the join error printed the GLOBAL `--color-danger`, measured on `--color-bg-page` and 4.08:1 here.",
    ).not.toContain("var(--color-danger)");
  });

  for (const theme of BOTH_THEMES) {
    it(`the pairings whose ground is the PLATE rather than the wall clear AA (${theme})`, () => {
      for (const [ink, ground, floor, role] of [
        // The hero's stat chits: an opaque plate now, so the numeral is read
        // against the plate and not against a 34% black over whatever the wall is.
        ["--faction-snide-acid", "--faction-snide-ink", AA_LARGE, "the stat chit's numeral"],
        ["--faction-snide-card-muted", "--faction-snide-ink", AA_NORMAL, "the stat chit's label"],
        // The motto sticker and the plated headings, restated at this surface:
        // both are the same 15.55:1 / 16.33:1 pairing #2173 rests on.
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
 * The inverted pill's ink is the PAGE, never `--color-text-on-accent` (#2107).
 *
 * WHY THIS IS A SOURCE GUARD AND NOT A ROW. `--color-text-primary` is a
 * statement about the page ground and nothing else; the moment a control FILLS
 * with it, the ink it needs is the ground that neutral was measured against —
 * `--color-bg-page`, which flips with the cascade exactly as the fill does
 * (16.86:1 light, 15.00:1 dark). `--color-text-on-accent` is `#ffffff` in
 * `:root` alone and never flips, so the same two lines read "near-black pill,
 * white label" in light and WHITE ON CREAM in dark, at **1.24:1**.
 *
 * Part A can only ask "does this token clear on the surface its documentation
 * names", and no documentation pairs those two — the pairing exists only at a
 * call site. Part B (`e2e/contrast.spec.ts`) would see it rendered, but it is
 * nightly-only and outside PR CI, and a player profile is not on its route
 * walk. So the defect shipped twice: #1819 fixed the faction page's join
 * button, and the profile's segmented Praxis/Tasks toggle — the same two lines,
 * copied — survived to be reported by eye as #2107.
 *
 * A FILE-LEVEL INTERSECTION, deliberately. `ponytail:` the guard asks whether
 * one file both fills with the primary neutral and inks with `-on-accent`,
 * which is coarser than "in the same style object" and could false-positive on
 * a file that legitimately does both to different elements. There is no such
 * file today, and the coarse question needs no parser; if one appears, read the
 * pairing and add it here with the reason. The precise version is a JSX/AST
 * walk, which is a dependency this suite does not carry.
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
 * The cream slabs go dark (#2227) — a REVERSAL, guarded at both halves.
 *
 * WHAT SHIPPED AND WHY NOTHING SAW IT. Two kits grounded whole panels on a
 * theme-invariant light token: Everymen's `PAPER_FRAME` on `--everymen-cream`
 * (#f4ecd6 / #f3e7ce — it barely moves) and S.N.I.D.E.'s `PAPER_PANEL` on
 * `--faction-snide-paper` (#f4f1e8, declared exactly once). Every value in play
 * is a real token, so the value manifest above stays green; every ink on them
 * is correct measured against them, so the pairing rows stay green too. The
 * defect exists only as a RELATION between a surface that does not flip and a
 * page that does, which no row of either kind can express.
 *
 * THE OWNER RULED IT A MISTAKE. A cream panel on a dark page reads as a
 * headlight. So the guard below is a SOURCE guard on the grounds — the shape
 * #1413 and #1307 use at the bottom of this file, because the bug is
 * structural: a ground that must not be that token.
 *
 * S.N.I.D.E. GETS NO DARK HALF, deliberately. Six components spend
 * `--faction-snide-paper` as a `color:` on the ink panel, which is correct and
 * is the whole reason the token may not flip. The fix is per-site — the two
 * page panels and the profile's badge board take the ink ground the "RE: YOU"
 * dispatch already wears — so this block also asserts the token keeps exactly
 * one declaration.
 *
 * The ratios are here too, in both themes, because "passes in one theme and
 * fails in the other" is precisely the class of defect being reversed.
 */
describe("no kit grounds a panel on a light token that cannot flip (#2227)", () => {
  /** (file, the ground it must NOT paint, why that token is an ink). */
  const FORBIDDEN_GROUNDS: [string, RegExp, string][] = [
    [
      "pages/characterProfile/archetypes/EverymenProfileBody.tsx",
      /background:\s*CREAM\b/,
      "`--everymen-cream` is an ornament ink (a badge ring, a halftone dot). The praxis empty state and the badge board stand on the paper page, so they take `--everymen-paper` and `--everymen-paper-text`.",
    ],
    [
      "pages/factionDetail/archetypes/SnideFactionBody.tsx",
      /background:\s*PAPER\b/,
      "`--faction-snide-paper` is the ink S.N.I.D.E. prints WITH, not on. The About flyer and the rap sheet take `INK_PANEL`, which this same page already wears for the dispatch.",
    ],
    [
      "pages/characterProfile/archetypes/SnideProfileBody.tsx",
      /background:\s*PAPER\b/,
      "same call as the faction page: the badge board stands on the ink page, so it grounds on the ink — the shape `emptyStateStyle` in this very dress already had.",
    ],
  ];

  for (const [relative, forbidden, why] of FORBIDDEN_GROUNDS) {
    it(`${relative.split("/").pop()} paints no slab in the ornament ink`, () => {
      expect(stripComments(sourceOf(relative)), why).not.toMatch(forbidden);
    });
  }

  /**
   * The faction body's own frame, said positively. The negative above can be
   * satisfied by deleting the ground; this says which stock it is.
   */
  it("EverymenFactionBody's PAPER_FRAME grounds on the stock that flips", () => {
    const source = stripComments(
      sourceOf("pages/factionDetail/archetypes/EverymenFactionBody.tsx"),
    );
    const at = source.indexOf("const PAPER_FRAME");
    expect(at, "no `PAPER_FRAME` in EverymenFactionBody").toBeGreaterThan(-1);
    const style = source.slice(at, source.indexOf("};", at));
    expect(
      style,
      "the frame is a panel on `.em-backdrop`, which ramps `--everymen-paper` to `--everymen-paper-deep`. Both flip; the cream does not.",
    ).toContain("background: PAPER");
    expect(
      style,
      "panel and page are 1.06:1 apart even in light, so the double rule IS the panel and it has to flip with the stock. `--everymen-ink` reads 1.16:1 on the dark paper and `--everymen-frame` only 1.38:1 — a dim rule is still no rule.",
    ).toContain("solid ${PAPER_TEXT}");
  });

  it("--faction-snide-paper keeps exactly one declaration", () => {
    const declarations = stripComments(CSS_TEXT).match(/--faction-snide-paper\s*:/g) ?? [];
    expect(
      declarations.length,
      "minting a dark half would turn six correct `color:` readers dark-on-dark (SnideDuelSealConfirm, SnideFactionHero, SnideFeedFrame, SnideProfileBody, SnideEditPraxis, SnideFactionBody). The reversal is per-site, not per-token.",
    ).toBe(1);
  });

  /**
   * Every (ground, ink) pairing the reversal creates, in BOTH themes. The
   * Everymen half is where the numbers actually move — S.N.I.D.E.'s tokens are
   * theme-invariant by design, so both readings are the same figure, and the
   * point of measuring twice is to prove that stays true.
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
 * #2269 / #2267 — THE COLLAB BLOCK'S DRESS ARRIVES THROUGH ONE SEAM.
 *
 * The ratios in COLLAB_PAIRS measure a manifest, and a manifest is only worth
 * its ratios while it still describes what ships. These are what tie it to the
 * source, and each one is a bug that got past every other guard:
 *
 *   1. Every archetype hands `InviteSearch` a `collab` skin, and the quiet tier
 *      it names really is the token COLLAB_SKINS measured. Before #2269 the
 *      roster took no skin at all, so it wore the site's generic face on eight
 *      faction sheets and there was no seam for any of this to arrive through.
 *   2. `controls.tsx` paints nothing from `praxis.task_faction_slug`. The
 *      `+ invite` chip used to take the ink of whichever faction owns the TASK
 *      and lay it on whichever ground the VIEWER's composer paints — two
 *      unmeasured answers at once, and a pairing no per-faction table can model
 *      because it is a cross-product. `collabCopy(task_faction_slug, …)` is a
 *      different question and stays: a praxis speaks in its task's voice.
 *   3. The roster hardcodes no corner. "The corners shouldn't be rounded for
 *      Ephemerists" is an owner ruling, and a `borderRadius: 4` sitting in a
 *      shared component is how three square-field skins came to draw rounded
 *      chips anyway.
 *   4. The three square skins ask for 0, and they are the three whose own
 *      `fieldBox` is 0 — so the ruling cannot be satisfied by a coincidence a
 *      later dress change would quietly undo.
 */
describe("the collab block takes its dress from the skin (#2269, #2267)", () => {
  /**
   * `quiet: MUTED` names a const, not a token, so this resolves one hop. The
   * plate's tiers are exported from the mark module both the composer and the
   * waiting surface import them from, which is why the search is a list.
   */
  function tokenOfConst(name: string, sources: string[]): string | null {
    for (const source of sources) {
      const found = new RegExp(`\\b${name} = "var\\((--[a-z-]+)\\)"`).exec(source);
      if (found) return found[1];
    }
    return null;
  }

  for (const skin of COLLAB_SKINS) {
    it(`the ${skin.key} composer hands in ${skin.quiet} as its quiet tier`, () => {
      const source = sourceOf(skin.source);
      const slice = /collab: \{[^}]*\}/.exec(source);
      expect(slice, `${skin.source} passes no \`collab\` skin to InviteSearch`).not.toBeNull();

      const named = /quiet: (\w+)/.exec(slice![0]);
      expect(named, `${skin.source}'s \`collab\` skin names no quiet tier`).not.toBeNull();

      const token = tokenOfConst(named![1], [
        source,
        sourceOf("components/factionMarks/ephemeristsPlate.tsx"),
      ]);
      expect(
        token,
        `${skin.source} passes \`quiet: ${named![1]}\`, which COLLAB_SKINS records as ${skin.quiet}. The measured pairing and the shipped one have to be the same one.`,
      ).toBe(skin.quiet);
    });
  }

  it("controls.tsx paints nothing from the TASK's faction", () => {
    // Comments are stripped first, because the comment recording the defect
    // quotes the call it removed — and a guard that a comment can trip is a
    // guard the next person deletes rather than satisfies.
    const source = sourceOf("pages/editPraxis/archetypes/controls.tsx")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    expect(
      source.includes("factionCssVar(praxis.task_faction_slug"),
      "the composer's controls are dressed by the skin — the task's faction is the COPY's voice, not the sheet's palette (#2267)",
    ).toBe(false);
  });

  it("the roster hardcodes no corner", () => {
    const source = sourceOf("components/collab/CollabRoster.tsx");
    const corners = new Set(
      [...source.matchAll(/borderRadius: (.+?),/g)].map((match) => match[1]),
    );
    // `2` is the progress bar's cap. Nobody reads a 4px hairline's end as a
    // corner, and handing it the chip radius would make it a lozenge on seven
    // skins; `'50%'` is the avatar disc and the two dots, which the ruling
    // explicitly does NOT touch ("do not square the avatars").
    expect(
      [...corners].sort(),
      "every corner in the roster is the skin's `radius`, a disc, or the progress bar's own cap",
    ).toEqual(["'50%'", "2", "radius"]);
  });

  const SQUARE_SKINS = ["snide", "ephemerists", "everymen"] as const;

  for (const key of SQUARE_SKINS) {
    it(`the ${key} composer asks for square collab chips, like its own fields`, () => {
      const skin = COLLAB_SKINS.find((candidate) => candidate.key === key)!;
      const source = sourceOf(skin.source);
      expect(
        /collab: \{[^}]*radius: 0/.test(source),
        `${skin.source} draws square fields; its collab chips have to agree`,
      ).toBe(true);
      expect(
        /const fieldBox = \{[\s\S]*?borderRadius: 0/.test(source),
        `${skin.source}'s fieldBox is no longer square — the collab radius above was matched to it`,
      ).toBe(true);
    });
  }
});
