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

import { AA_LARGE, AA_NORMAL, compositeOver, contrastRatio, formatRatio, parseColor } from "../contrast";
import { readThemes, resolveVar, type Theme } from "./cssVars";

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
   */
  veil?: Veil;
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
 *   ephemerists  `--faction-ephemerists-plate-bg` the Valley plate (a WHOLE shade off
 *                                                `-card-bg` in dark: #171a26 vs #211a10)
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
  snide: "--faction-snide-card-bg",
  wow: "--faction-wow-chronicle-bg",
  ephemerists: "--faction-ephemerists-plate-bg",
  singularity: "--faction-singularity-card-bg",
};

/** The four whose sheet is a different TOKEN from `--faction-{key}-card-bg`. */
const OWN_SHEET_KEYS = ["ua", "coven", "wow", "ephemerists"] as const;

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
    const notice = `--faction-${key}-card-notice`;
    const alarm = `--faction-${key}-card-alarm`;
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
        veil: { token: `--faction-${key}-card-credit`, alpha: CHIP_WASH },
        text: `--faction-${key}-card-credit`,
      },
    ];
  }),
  // The BARE-sheet muted reading, for the four sheets `-card-bg` does not stand
  // in for: the `hidden` badge sets the muted ink there (its 5% wash is gone —
  // see the component). For the other four keys that is `{key} card muted
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
      text: `--faction-${key}-card-muted`,
    },
  ]),
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
  // #2a1d02 has no token and does not need one: --faction-wow-on-fill is the
  // WOW ink, is theme-invariant like the gold it sits on, and measures 7.64:1
  // where the kit's own value manages 6.68:1 — not the 8.1:1 the kit claims.
  { what: "wow chronicle gold element, ink", surface: "--faction-wow-chronicle-gold", text: "--faction-wow-on-fill" },
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
    // The winning stakes tile: WOW's ink on the champion gold. Both are
    // per-theme, so this measures the pairing twice.
    what: "wow duel champion tile, ink",
    surface: "--faction-wow-duel-champion",
    text: "--faction-wow-on-fill",
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
  // The "Grade" label. Olive on the paper was never measured before this card
  // set a label in it.
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

  // Ephemerists — THE VALLEY PLATE (task card v2, #1023). Four surfaces, not
  // one: the papyrus plate, the cornice's night band, the medallion's disc and
  // the CTA bar, each carrying its own ink. `-brass` is absent from this list on
  // purpose and for the same reason as WOW's chronicle gold — it rules and
  // frames, it is never painted as text. The caption ink that REPLACED it in the
  // one text slot the design gave it is measured here instead.
  { what: "ephemerists plate, ink", surface: "--faction-ephemerists-plate-bg", text: "--faction-ephemerists-plate-ink" },
  { what: "ephemerists plate, brief", surface: "--faction-ephemerists-plate-bg", text: "--faction-ephemerists-plate-muted" },
  { what: "ephemerists plate, caption", surface: "--faction-ephemerists-plate-bg", text: "--faction-ephemerists-plate-caption" },
  { what: "ephemerists cornice band, masthead", surface: "--faction-ephemerists-plate-band", text: "--faction-ephemerists-plate-band-ink" },
  { what: "ephemerists medallion disc, points", surface: "--faction-ephemerists-plate-disc", text: "--faction-ephemerists-plate-ink" },
  { what: "ephemerists medallion disc, unit", surface: "--faction-ephemerists-plate-disc", text: "--faction-ephemerists-plate-muted" },
  { what: "ephemerists plate CTA band", surface: "--faction-ephemerists-plate-cta-bg", text: "--faction-ephemerists-plate-cta-ink" },

  // …and the three surfaces task detail (#1032) added, where the plate stops
  // being one card on the app's ground and becomes the page. `-quiet` exists
  // precisely because of the first row here: the DARKER page ground drops
  // `-muted` to 4.31 and `-caption` to 4.45, both of which measure fine on the
  // plate above. `-nile` was walked for the same reason (4.24 on the page as the
  // design drew it) and carries every link plus the "level met" yes, so it is
  // measured on all three grounds it lands on.
  { what: "ephemerists page ground, quiet ink", surface: "--faction-ephemerists-plate-page", text: "--faction-ephemerists-plate-quiet" },
  { what: "ephemerists page ground, links", surface: "--faction-ephemerists-plate-page", text: "--faction-ephemerists-plate-nile" },
  { what: "ephemerists page ground, title", surface: "--faction-ephemerists-plate-page", text: "--faction-ephemerists-plate-ink" },
  { what: "ephemerists plate, quiet ink", surface: "--faction-ephemerists-plate-bg", text: "--faction-ephemerists-plate-quiet" },
  { what: "ephemerists panel cell, ink", surface: "--faction-ephemerists-plate-inner", text: "--faction-ephemerists-plate-ink" },
  { what: "ephemerists panel cell, caption", surface: "--faction-ephemerists-plate-inner", text: "--faction-ephemerists-plate-caption" },
  { what: "ephemerists panel cell, quiet ink", surface: "--faction-ephemerists-plate-inner", text: "--faction-ephemerists-plate-quiet" },
  { what: "ephemerists panel cell, links", surface: "--faction-ephemerists-plate-inner", text: "--faction-ephemerists-plate-nile" },
  { what: "ephemerists medallion disc, caption", surface: "--faction-ephemerists-plate-disc", text: "--faction-ephemerists-plate-caption" },

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
  { what: "ephemerists seal ledger band, credit ink", surface: "--faction-ephemerists-plate-inner", text: "--color-success" },
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
  // quiet ink` above already measures at 6.21 / 5.52 — the same pairing, so a
  // second row here would be a second name for one measurement.
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
  { what: "ephemerists plate, links", surface: "--faction-ephemerists-plate-bg", text: "--faction-ephemerists-plate-nile" },

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
  ...(
    [
      ["na", "--faction-default-card-bg"],
      ["coven", "--faction-coven-ward-page"],
      ["ephemerists", "--faction-ephemerists-plate-page"],
      ["everymen", "--faction-everymen-sheet-panel"],
      ["singularity", "--faction-singularity-term-bg"],
      ["snide", "--faction-snide-wall"],
      ["snide deep", "--faction-snide-wall-deep"],
      ["ua", "--faction-ua-page"],
      ["wow", "--faction-wow-detail-field"],
    ] as const
  ).flatMap(([key, surface]) =>
    // The five global inks `PraxisAdminBar` / `PraxisFlagBlock` paint on the
    // card's own stock. `--color-text-primary` is left out on purpose: it only
    // reaches this surface through `.btn-outline`, which lays a SECOND
    // `--color-bg-surface` frost of its own before it prints.
    [
      ["danger", "--color-danger"],
      ["warning", "--color-warning"],
      ["success", "--color-success"],
      ["tertiary", "--color-text-tertiary"],
      ["secondary", "--color-text-secondary"],
    ].map(([role, text]) => ({
      what: `${key} praxis detail neutral card, ${role} ink over the frost`,
      surface,
      veil: "--color-bg-surface" as Veil,
      text,
    })),
  ),

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
  //   ephemerists -plate-nile    on -plate-bg     = `ephemerists plate, links`
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
];

const PAIRS: Pair[] = [
  ...CARD_PAIRS,
  ...FILL_PAIRS,
  ...ACCENT_PAIRS,
  ...ROSTER_PAIRS,
  ...PRAXIS_CARD_PAIRS,
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
  "dark | ephemerists card accent": { ratio: 3.72, issue: 651 },
  // The same rubric vermilion, reached through its archetype-private primitive.
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
          if (pair.veil) {
            // A token-at-an-alpha wash resolves the token, then scales its alpha
            // — which is what `color-mix(in srgb, <token> N%, transparent)`
            // computes. A literal parses as-is. See `Veil`.
            const name = typeof pair.veil === "string" ? pair.veil : pair.veil.token;
            const alpha = typeof pair.veil === "string" ? 1 : pair.veil.alpha;
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
  const CSS = readFileSync(CSS_PATH, "utf8");

  function ruleBody(selector: string): string {
    const at = CSS.indexOf(`${selector} {`);
    expect(at, `index.css declares no \`${selector}\` rule`).toBeGreaterThan(-1);
    return CSS.slice(at, CSS.indexOf("}", at));
  }

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
});
