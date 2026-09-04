import type { CSSProperties } from "react";
import CardMasthead from "./CardMasthead";
import SingularityLamps from "../factionMarks/SingularityLamps";
import { UA_DISPLAY } from "../factionMarks/uaAtoms";
import { useFormFactor } from "../../hooks/useFormFactor";
import { factionName } from "../../utils/factions";

/**
 * THE SEVEN PAINTED BANDS — one per faction, mounted by BOTH card kits (#2185).
 *
 * `CardMasthead` beside this file owns the ANATOMY and carries no paint. This
 * file owns the paint: each faction's ground, rule, wordmark face and size, the
 * mark's ink where the sigil's own default cannot be seen, and the backdrop a
 * band is drawn over where it has one.
 *
 * WHY THE PAINT IS HERE AND NOT IN THE SKINS. The owner's ruling on #2185 is
 * that a praxis card wears **the same band its task card wears** — same ground,
 * same rule, same wordmark face and size. Written as two inline copies that is
 * a promise; written once and mounted twice it is an identity, and the identity
 * is what the ruling actually asked for. The failure mode is not hypothetical:
 * before this file, `EverymenPraxisCard` drew its own red bar in
 * `--everymen-red` at 15px with two flanking cogs while `EverymenTaskCard` drew
 * `--faction-everymen-bill-mast` in Bebas at `--text-title` with a double rule —
 * two mastheads for one faction, exactly what #2029 created `CardMasthead` to
 * prevent, arrived anyway through the seam the component did not cover.
 *
 * SEVEN NAMED EXPORTS, AND NO SLUG→COMPONENT MAP. #782 removed surface-owned
 * registries and `factions/__tests__/addAFaction.test.tsx` enforces it, but the
 * rule is not the only reason there is no dispatch here: there is nothing to
 * dispatch ON. Both callers of a band are per-faction files that already know
 * their own faction — `WowTaskCard` and `WowPraxisCard` both want the WOW band
 * and neither has a slug to look one up with. A record keyed by slug would have
 * been a lookup table with seven constant keys.
 *
 * ONLY SEVEN BANDS EXIST, and the eighth and ninth are absent by RULE (ADR-0048,
 * NOT superseded by #2185): the Albescent card IS the unaffiliated sheet plus a
 * drift, and a band naming the society would un-hide it. On a praxis card — a
 * public card, on other people's feeds — that is a disclosure, not a style
 * choice. There is no `DefaultBand` and no `AlbescentBand` to import, which is
 * the strongest form the rule can take in a module.
 *
 * The ORNAMENT that rides BELOW a band is not here — WOW's bunting, the
 * Ephemerists' cornice. Those are strung under the band by the surface that
 * wants them, and the two kits do not agree about them; what the ruling binds is
 * the band itself.
 */

/* ── Coven ─────────────────────────────────────────────────────────────── */

const HAND = "var(--font-faction-script)"; /* Caveat */

/**
 * The band the twinkle field is confined to, so no star lands in copy.
 *
 * It was 72px while the wordmark floated over the slip with a braid tied under
 * it. #2029 pinned the wordmark into a band of its own and dropped the braid, so
 * the field shrank to the band it dresses. Geometry (§4a).
 */
const COVEN_BAND_HEIGHT = 44;

/** A four-point star, centred on (x, y) with arm length r. */
function starPath(x: number, y: number, r: number): string {
  const long = r * 2.6;
  return `M${x} ${y - long} l${r} ${long} ${long} ${r} -${long} ${r} -${r} ${long} -${r} -${long} -${long} -${r} ${long} -${r} z`;
}

/** The gold twinkle field, clipped to the masthead band. */
function TwinkleField() {
  const stars: [number, number, number][] = [
    [38, 16, 2.6],
    [296, 21, 2],
    [120, 11, 1.4],
    [212, 27, 1.6],
    [264, 10, 1.2],
    [74, 29, 1.6],
  ];
  return (
    <svg
      width="100%"
      height={COVEN_BAND_HEIGHT}
      viewBox={`0 0 340 ${COVEN_BAND_HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ position: "absolute", left: 0, top: 0, right: 0, zIndex: 1, pointerEvents: "none" }}
    >
      {stars.map(([x, y, r]) => (
        <path key={`${x}-${y}`} d={starPath(x, y, r)} fill="var(--faction-coven-slip-gold)" opacity={0.8} />
      ))}
    </svg>
  );
}

/**
 * The twinkle field moves INTO the band, over its ground: with a painted band
 * the stars would otherwise be hidden behind it. This is the wrapper the #2185
 * ruling means by "where a task card wraps the component to paint a backdrop,
 * the praxis card does the same" — it comes with the band rather than being
 * rebuilt beside it.
 *
 * THE DAY BAND IS PINK NOW (#2635), AND THE NIGHT BAND HAS NOT MOVED.
 *
 * It stood on `--faction-coven-slip-sigil-ground`, which is the white disc that
 * backs the SIGIL on the slip — borrowed paint, and by day it read as a bare
 * white strip across the top of a pink card. `--faction-coven-mast` is the
 * band's own ground: the CTA's `#d13a80` under `#ffffff` by day, Coven's
 * existing white-on-pink pairing, and the ground plus the ink the band already
 * had by night. Unlike UA's it FLIPS, because only one of its halves was wrong.
 *
 * The values are transcribed from `-slip-cta-*` rather than aliased to it, and
 * the band is flat where the CTA is a ramp; index.css gives both reasons at the
 * token. What matters here is the consequence: pointing this band at the CTA
 * would have dragged that token's bright-magenta dark half into the one cascade
 * the ruling calls correct.
 *
 * THE WORDMARK'S INK IS NOW DECLARED RATHER THAN INHERITED. It used to fall
 * through from the card root — `--faction-coven-slip-ink` on both kits — which
 * works only for as long as both roots agree and is invisible when they stop.
 * `-mast-ink` is the same colour by night and white by day.
 *
 * THE MARK TAKES IT TOO. `CovenSigil` draws the hat in `--faction-coven`, which
 * is 3.15:1 on the old white and far less on the new pink; `markColor` is the
 * prop for that. This is the one thing that changes at night — the hat was the
 * spine hue and is now the wordmark's own ink, so band and mark read as one
 * lettering rather than two pinks.
 */
function CovenBand() {
  return (
    <div
      style={{
        position: "relative",
        zIndex: 2,
        height: COVEN_BAND_HEIGHT,
        background: "var(--faction-coven-mast)",
        borderBottom: "1px solid var(--faction-coven-slip-pk)",
        /* The twinkle box is the one wrapper standing between a card's root and
           its band, so while the equal-height row's slack chain ended at
           `:has(a[href])` (index.css), #2167's linked band made this box match
           and stretch past its 44px. #2380 re-keyed that chain onto the
           `data-card-link` hook, which this box does not contain, so the pin is
           belt rather than braces now — kept, like the band's own, because a
           band's height is its content. */
        flexGrow: 0,
      }}
    >
      <TwinkleField />
      <CardMasthead
        slug="coven"
        markColor="var(--faction-coven-mast-ink)"
        style={{ height: "100%", color: "var(--faction-coven-mast-ink)" }}
      >
        {/* The slip's own `feed:taskCard.coven.masthead` held a second copy of
            the faction's name ("the cozy coven") and is gone with #1910. The
            lower case belonged to the hand-lettering rather than to the word, so
            it lives in `textTransform`, where casing belongs — the name itself
            comes from the one place that owns it (ADR-0038). */}
        <div style={{ fontFamily: HAND, fontSize: "var(--text-title)", lineHeight: 1, textTransform: "lowercase" }}>
          {factionName("coven")}
        </div>
      </CardMasthead>
    </div>
  );
}

/* ── The Ephemerists ───────────────────────────────────────────────────── */

const DECO = "var(--font-faction-deco)";

/**
 * THE RESTRAINED MASTHEAD (#2067) — the kit's shared anatomy and nothing else.
 *
 * THE GROUND IS THE MEDALLION'S DISC, not the cornice band. `-plate-disc` is two
 * values lighter than `-plate-band`, so the header reads as a brass-edged plate
 * rather than as a night strip. THE INK IS UNCHANGED: `-plate-band-ink` is the
 * gold measured on the band, and moving the ground under it spends 0.93 of a
 * very large margin — 14.00:1 on the band, 13.07:1 on the disc.
 * `factionContrast.test.ts` records the pairing. The sigil takes `currentColor`.
 *
 * `boxSizing` is load-bearing next to the border: the band is a block child of a
 * card with `overflow: hidden`, so a content-box border would push it 2px wider
 * than the card and be clipped on the right.
 */
function EphemeristsBand() {
  return (
    <CardMasthead
      slug="ephemerists"
      style={{
        boxSizing: "border-box",
        background: "var(--faction-ephemerists-plate-disc)",
        color: "var(--faction-ephemerists-plate-band-ink)",
        border: "1px solid var(--faction-ephemerists-plate-brass)",
      }}
    >
      <span
        style={{
          fontFamily: DECO,
          fontSize: "var(--text-xl)",
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        {/* #1910: the band spells the faction's name, so it reads the one key
            that stays per-faction rather than a second copy. The
            `textTransform` above already carried the plate's upper case. */}
        {factionName("ephemerists")}
      </span>
    </CardMasthead>
  );
}

/* ── The Everymen ──────────────────────────────────────────────────────── */

const POSTER = "var(--faction-everymen-card-font)"; /* Bebas Neue */

/** Poster label voice — condensed caps, the bill's whole chrome. */
const EVERYMEN_LABEL: CSSProperties = {
  fontFamily: POSTER,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
};

/**
 * The union's red bar. The band read "Help Wanted!" between two cogs until
 * #1909 cut the slot as generic, which left the cogs alone on the bar; v3
 * answers the same objection the other way round — the band names THE FACTION —
 * and the pair of cogs stands down, because they flanked the centre the wordmark
 * now holds. The cog stays the bill's motif elsewhere.
 *
 * THE PADDING IS THE ONE FORM-FACTOR BRANCH IN THIS FILE, and it is the bill's
 * own: the mast is deeper on the desktop sheet. Everything else here is one
 * value at both sizes.
 */
function EverymenBand() {
  const formFactor = useFormFactor();
  return (
    <CardMasthead
      slug="everymen"
      /* On the red mast the sigil's own `--everymen-red` is invisible. */
      markColor="var(--faction-everymen-bill-mast-ink)"
      style={{
        padding:
          formFactor === "desktop"
            ? "var(--space-md) var(--space-lg)"
            : "var(--space-sm) var(--space-lg)",
        background: "var(--faction-everymen-bill-mast)",
        color: "var(--faction-everymen-bill-mast-ink)",
        borderBottom: "3px double var(--faction-everymen-bill-cta-bg)",
        boxShadow: "inset 0 -6px 0 -4px var(--everymen-paper-deep)",
      }}
    >
      <span style={{ ...EVERYMEN_LABEL, fontSize: "var(--text-title)", lineHeight: 1 }}>
        {factionName("everymen")}
      </span>
    </CardMasthead>
  );
}

/* ── Singularity ───────────────────────────────────────────────────────── */

const MONO = "var(--faction-singularity-card-font)"; /* Share Tech Mono */

/**
 * The window chrome. The bar read "task.proc — singularity" until #1909 cut it
 * as generic, leaving the lamps alone; v3 gives it back the one title that is
 * not generic and is not a second copy of anything — the faction's own name,
 * from the one place that owns it (ADR-0038).
 *
 * THE LAMPS RIDE WITH THE MARK rather than standing down: they are the window,
 * not a faction mark, and the grid centres the title on the BAND, so a wider
 * left cluster does not push it off true.
 */
function SingularityBand() {
  return (
    <CardMasthead
      slug="singularity"
      leading={<SingularityLamps />}
      style={{
        padding: "var(--space-sm) var(--space-md)",
        background: "var(--faction-singularity-term-chrome)",
        borderBottom: "1px solid var(--faction-singularity-term-hair)",
      }}
    >
      <span
        style={{
          fontFamily: MONO,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--faction-singularity-term-dim)",
          fontSize: "var(--text-xl)",
          lineHeight: 1,
        }}
      >
        {factionName("singularity")}
      </span>
    </CardMasthead>
  );
}

/* ── S.N.I.D.E. ────────────────────────────────────────────────────────── */

const IMPACT = "var(--faction-snide-font-impact)"; /* Anton */

/**
 * The note bar. The broken acid rule that used to fill its right end is gone
 * with the centring: it was a flex filler taking the width #1124's retired
 * ordinal left behind, and that width is exactly where the centred wordmark now
 * sits. The clipping keeps its acid elsewhere.
 */
function SnideBand() {
  return (
    <CardMasthead
      slug="snide"
      /* The brushed A is drawn 24 where the kit draws 20 (#2035), and it bleeds
         2px into the band's inset on each side — which is the mark doing what it
         was drawn to do: `SnideSigil`'s four shapes break out of their own circle
         at four points. This used to be a stylesheet hook reaching into the
         sigil's markup; #2056 made it the prop. */
      markSize={24}
      style={{
        background: "var(--faction-snide-note-bar)",
        color: "var(--faction-snide-note-bar-ink)",
      }}
    >
      {/* eslint-disable-next-line local/no-raw-style-values -- ornament: cut-out wordmark; Anton at a label-ramp size stops reading as a masthead. */}
      <span style={{ fontFamily: IMPACT, fontSize: 22, letterSpacing: "0.06em", lineHeight: 1, color: "var(--faction-snide-acid)" }}>
        {factionName("snide")}
      </span>
    </CardMasthead>
  );
}

/* ── UA ────────────────────────────────────────────────────────────────── */

/**
 * The leaf's ORANGE band (#2635) — UA's own hue, frozen across both cascades.
 *
 * IT USED TO STAND ON `--faction-ua-hair`, and that is the defect the owner
 * ruled on: a hairline is, by its own declaration's comment, "the faintest
 * divider, below -rule". It was never a colour anyone chose for a band; it was
 * the nearest token to hand. Both bands the ruling moved were perfectly legible,
 * which is why no contrast sweep ever saw them.
 *
 * `--faction-ua-mast` is the day hue declared once and never re-declared in
 * dark, exactly as `--faction-everymen-bill-mast` and `--faction-wow-plum-surface`
 * are. It has to be a frozen literal rather than `var(--faction-ua)`: the spine
 * hue flips (#c24a18 -> #e8703a), so the bare name is not "orange in both
 * modes", it is two oranges and a band that changes colour at night.
 *
 * THE WORDMARK TAKES A FROZEN WARM WHITE, AND THAT IS A DELIBERATE DROP. This
 * docstring used to argue the other way, and it argued it about a different
 * ground: on the hairline, `-card-accent` was 4.46:1 (under AA for a 24px
 * non-bold face) and `-card-text` was 10.35:1, so the band took the body ink.
 * The orange is a fill, and the ink a fill owes is a warm white — 4.59:1, which
 * clears AA at `--text-title`. Trading 10.35 for the faction's colour is the
 * ruling.
 *
 * IT IS `--faction-ua-mast-ink` AND NOT `--faction-ua-on-fill`. #2635 named the
 * latter on the reading that its 4.59:1 was already measured and a frozen ground
 * needed no dark half; the measurement is right and the inference is not.
 * `-on-fill` is the ink for the FILL, the fill flips, and so does it — #fcf7ef
 * by day, #201a14 by night, which on a frozen orange prints near-black at
 * 3.52:1. A frozen ground needs a frozen ink, which is what
 * `--faction-everymen-bill-mast-ink` is beside its own frozen red and why WOW
 * letters its banner in the theme-invariant `-gilt-mid` rather than in an ink
 * that flips. One value, one measurement, both cascades.
 *
 * THE MARK TAKES THE SAME INK. `FactionSigil` draws UA's ensō in
 * `--faction-ua-glow`, which is 1.30:1 on this ground — orange on orange. That
 * is what `markColor` is for, and Everymen and WOW have passed it since their
 * bands were built.
 *
 * AND THE BOTTOM RULE COMES OFF. It was `1px solid var(--faction-ua-card-accent)`
 * — an orange hairline on an orange band, drawing nothing. Everymen's and WOW's
 * bands let their own edge do the work; this one does too now.
 *
 * IT IS THE ONE BAND WITH AN `inert` ARM (#2995), and only because it is the one
 * band a COMPOSER mounts. The three card-tier mounts pass nothing and stay the
 * link they have been since #2167; the two propose/create sheets pass `inert`,
 * because an anchor inside a `<form>` is a way to lose a draft. The paint is one
 * object either way — see `CardMasthead`'s `inert` prop for the whole argument.
 */
function UaBand({ inert }: { inert?: boolean } = {}) {
  return (
    <CardMasthead
      slug="ua"
      inert={inert}
      markColor="var(--faction-ua-mast-ink)"
      style={{
        background: "var(--faction-ua-mast)",
        color: "var(--faction-ua-mast-ink)",
      }}
    >
      <span
        style={{
          fontFamily: UA_DISPLAY,
          fontWeight: 600,
          fontSize: "var(--text-title)",
          letterSpacing: "0.08em",
          lineHeight: 1,
        }}
      >
        {factionName("ua")}
      </span>
    </CardMasthead>
  );
}

/* ── Warriors of Whimsy ────────────────────────────────────────────────── */

const MED = "var(--faction-wow-card-font)"; /* MedievalSharp */
/**
 * The banner's ink — lettering AND mark (#2032). The page kit's gilt button
 * stop, theme-invariant like the plum it stands on, so one measurement (3.47:1)
 * covers both themes. NOT `-stamp-total`, which is an ink that flips.
 */
const GILT_MID = "var(--faction-wow-gilt-mid)";

/**
 * The plum banner (#2029), dressed (#2032) — the kit's shared anatomy on the
 * theme-invariant plum the CTA already stands on, lettered in the gilt the mark
 * takes with it.
 *
 * THE HORIZONTAL INSET IS SYMMETRIC, AND IT IS NO LONGER ZERO (#2070). #2032
 * zeroed it so the mark would break the banner's left line and stand on the
 * card's own gold frame; in production that read as touching the border, and the
 * owner's ruling is that it overshot. The mark sits inboard with clearance now —
 * `--space-sm`, which is the band's own vertical inset, so the mark keeps a
 * uniform 8px surround instead of 2px of frame. Still half the kit's
 * `--space-lg` default, so the sigil stays nearer the edge than the type block,
 * which is the half of #2032 that was right.
 *
 * BOTH INSETS MOVE TOGETHER. #2029's title is centred on the band's CONTENT box,
 * so left-only clearance walks the centred wordmark off the card's centreline by
 * half the inset — symmetry is what keeps the title true, and it was #2032's
 * reason for zeroing both rather than just the left. `--space-xs` was the
 * smaller candidate and is only 2px past the frame's own 2px weight, i.e. the
 * reported symptom again at half strength.
 *
 * THE BOTTOM RULE IS GOLD. In light `--faction-wow-card-accent` IS the band's
 * own ground to the hex; `-gilt-mid` on the same plum is 3.47:1, so drawn in the
 * gilt it is a line you can see — and on the task card it is the string the
 * bunting below hangs from.
 */
function WowBand() {
  return (
    <CardMasthead
      slug="wow"
      markColor={GILT_MID}
      style={{
        background: "var(--faction-wow-plum-surface)",
        color: "var(--faction-wow-on-plum)",
        padding: "var(--space-sm) var(--space-sm)",
        borderBottom: `2px solid ${GILT_MID}`,
      }}
    >
      <span style={{ fontFamily: MED, fontSize: "var(--text-title)", letterSpacing: "0.04em", lineHeight: 1, color: GILT_MID }}>
        {factionName("wow")}
      </span>
    </CardMasthead>
  );
}

export {
  CovenBand,
  EphemeristsBand,
  EverymenBand,
  SingularityBand,
  SnideBand,
  UaBand,
  WowBand,
};
