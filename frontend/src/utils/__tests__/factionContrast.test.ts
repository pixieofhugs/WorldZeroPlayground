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

import { AA_LARGE, AA_NORMAL, contrastRatio, formatRatio, parseColor } from "../contrast";
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
  /** AA floor. Defaults to 4.5; set AA_LARGE only where the role is large display type. */
  floor?: number;
};

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
 */
const ACCENT_PAIRS: Pair[] = [
  { key: "ua", accent: "--faction-ua-card-accent" },
  { key: "everymen", accent: "--faction-everymen-card-accent" },
  { key: "coven", accent: "--faction-coven-card-accent" },
  { key: "snide", accent: "--faction-snide-pink" },
  { key: "wow", accent: "--faction-wow-card-accent" },
  { key: "ephemerists", accent: "--faction-ephemerists-card-accent" },
  { key: "singularity", accent: "--faction-singularity-card-text" },
  { key: "default", accent: "--faction-default-card-accent" },
].map(({ key, accent }) => ({
  what: `${key} composer accent, on-accent`,
  surface: accent,
  text: `--faction-${key}-on-accent`,
}));

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

const PAIRS: Pair[] = [...CARD_PAIRS, ...FILL_PAIRS, ...ACCENT_PAIRS, ...ARCHETYPE_PAIRS];

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

          const floor = pair.floor ?? AA_NORMAL;
          const ratio = contrastRatio(text.color!, surface.color!);
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
