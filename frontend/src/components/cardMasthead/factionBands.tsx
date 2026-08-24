import type { CSSProperties, ReactNode } from "react";
/**
 * THE BANDS BRING THEIR OWN FACES (#2079, #2562).
 *
 * Every band below letters a wordmark in a faction face — Caveat, MedievalSharp,
 * Anton, Share Tech Mono, Poiret One, Cinzel — and those 62 `@font-face` rules
 * live in `fonts.faction.css`, off the critical path behind this module. Until
 * #2562 that was somebody else's problem: the only mounts were per-faction card
 * archetypes, which `factions/lazyArchetype.tsx` already fetches the sheet for.
 * The metatask seal's `DefaultSeal` is STATIC — it is the fallback every mount of
 * `MetataskSeal` loads — so a band now reaches load roots that no archetype does
 * (`pages/Tasks.tsx` is the one that caught it).
 *
 * Declared HERE rather than at that page, because the faces are this module's:
 * fix it where they all route through, and the next caller is correct by
 * construction. Failing to is silent — `font-display: swap` paints the fallback
 * and nothing throws. `utils/__tests__/factionFaceSplit.test.ts` is the guard.
 */
import "../../factionFaces";
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
 * SEVEN BANDS ARE THE CARD KITS' WHOLE LIST, and the eighth and ninth are absent
 * from it by RULE (ADR-0048, NOT superseded by #2185): the Albescent card IS the
 * unaffiliated sheet plus a drift, and a band naming the society would un-hide
 * it. On a praxis card — a public card, on other people's feeds — that is a
 * disclosure, not a style choice.
 *
 * THE EIGHTH BAND IS THE METATASK SEAL'S, AND ONLY THE SEAL'S (#2562). The owner
 * ruled that all nine seals wear one, because the seal's own label already
 * prints "ALBESCENT METATASK" in plain sight and two bandless seals out of nine
 * defeat the change. {@link SpectrumBand} below is that band; `na` and
 * `albescent` both mount it, which is how Albescent mounts every other na
 * drawing. There is still no `AlbescentBand`, and there is no band a CARD may
 * give either slug — that is the form the surviving half of the rule takes here.
 *
 * The ORNAMENT that rides BELOW a band is not here — WOW's bunting, the
 * Ephemerists' cornice. Those are strung under the band by the surface that
 * wants them, and the two kits do not agree about them; what the ruling binds is
 * the band itself.
 */

/**
 * WHAT A BAND MAY BE TOLD — one optional override, and nothing else (#2562).
 *
 * A band takes no props on a card, and that is the file's whole posture: the
 * paint is the faction's, the wordmark is the faction's name from the one place
 * that owns it (ADR-0038), and a caller has nothing to say about either. The
 * metatask seal is the one surface where the band heads a FOREIGN OBJECT rather
 * than the faction's own card, so its band reads "<FACTION> METATASK" — the
 * shared `praxis:detail.seal.label`, in the faction's own hand and at the band's
 * own size, because a sticker that only said the faction's name would not say
 * what it is.
 *
 * IT IS AN OVERRIDE, NOT A SLOT. Every band still defaults to its own name, so
 * the two card kits are unchanged and a band cannot be turned into a generic
 * header by a caller that forgets to pass anything.
 */
export interface FactionBandProps {
  /** The words on the band. Defaults to the faction's name. */
  title?: ReactNode;
}

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
 */
function CovenBand({ title }: FactionBandProps) {
  return (
    <div
      style={{
        position: "relative",
        zIndex: 2,
        height: COVEN_BAND_HEIGHT,
        background: "var(--faction-coven-slip-sigil-ground)",
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
      <CardMasthead slug="coven" style={{ height: "100%" }}>
        {/* The slip's own `feed:taskCard.coven.masthead` held a second copy of
            the faction's name ("the cozy coven") and is gone with #1910. The
            lower case belonged to the hand-lettering rather than to the word, so
            it lives in `textTransform`, where casing belongs — the name itself
            comes from the one place that owns it (ADR-0038). */}
        <div style={{ fontFamily: HAND, fontSize: "var(--text-title)", lineHeight: 1, textTransform: "lowercase" }}>
          {title ?? factionName("coven")}
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
function EphemeristsBand({ title }: FactionBandProps) {
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
        {title ?? factionName("ephemerists")}
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
function EverymenBand({ title }: FactionBandProps) {
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
        {title ?? factionName("everymen")}
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
function SingularityBand({ title }: FactionBandProps) {
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
        {title ?? factionName("singularity")}
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
function SnideBand({ title }: FactionBandProps) {
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
        {title ?? factionName("snide")}
      </span>
    </CardMasthead>
  );
}

/* ── UA ────────────────────────────────────────────────────────────────── */

/**
 * The leaf's hairline band.
 *
 * THE WORDMARK TAKES THE BODY INK, NOT THE ACCENT. The design sets it in
 * `--faction-ua-card-accent` on `--faction-ua-hair`, which measures 4.46:1 in
 * light — under AA for a 24px non-bold face, and the band's whole job is to be
 * read. `-card-text` is 10.35:1 on the same ground (11.45:1 in dark) and is the
 * leaf's own ink; the accent keeps the band's bottom rule, where a hairline owes
 * nothing.
 */
function UaBand({ title }: FactionBandProps) {
  return (
    <CardMasthead
      slug="ua"
      style={{
        background: "var(--faction-ua-hair)",
        borderBottom: "1px solid var(--faction-ua-card-accent)",
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
        {title ?? factionName("ua")}
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
function WowBand({ title }: FactionBandProps) {
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
        {title ?? factionName("wow")}
      </span>
    </CardMasthead>
  );
}

/* ── Unaffiliated / Albescent — THE METATASK SEAL'S BAND ONLY ──────────────── */

/**
 * The spectrum band (#2562) — a small-caps name over the whole rainbow, ruled
 * off with the hairline the two seals already draw.
 *
 * IT IS NOT A CARD BAND, and the module docstring above says why: the two cards
 * stay bandless under ADR-0048 and the owner's ruling that added this one is
 * scoped to the metatask seal. Two mounts, both seals: `DefaultSeal` (`na`, and
 * the fallthrough for any unregistered issuer) and `AlbescentSeal`.
 *
 * TWO PROPS, NOT TWO COMPONENTS. Every other band in this file is a per-faction
 * file's own drawing, so it takes nothing; this one is a single na drawing that
 * Albescent mounts — the way Albescent mounts every na drawing — and the two
 * differ in exactly two facts. The `slug` picks the name, the sigil and the
 * band's destination; the `ink` is the label's, and it MUST be passed because
 * the two grounds are different tokens (`--faction-default-card-bg` and
 * `--albescent-reveal-surface`, which is pure white by day). A default here
 * would be an Albescent seal quietly wearing the na family's ink, which is the
 * one thing that skin's docblock forbids.
 *
 * THE GROUND IS THE STICKER'S OWN, so the band is the rule and the lettering and
 * nothing else — a painted ground under a seal this small would read as a second
 * sticker. The hairline is `.spectrum-rule`, the class #2497 minted for these
 * inline ramps, so Albescent's `alb-moves` turns it from the cascade without
 * this file knowing (#2500).
 */
function SpectrumBand({
  slug,
  ink,
  title,
}: FactionBandProps & { slug: "na" | "albescent"; ink: string }) {
  return (
    <div style={{ position: "relative", zIndex: 2, flexGrow: 0 }}>
      <CardMasthead slug={slug} style={{ padding: "var(--space-sm) var(--space-lg)" }}>
        <span
          className="font-body"
          style={{
            fontSize: "var(--text-xl)",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            lineHeight: 1,
            color: ink,
            whiteSpace: "nowrap",
          }}
        >
          {title ?? factionName(slug)}
        </span>
      </CardMasthead>
      {/* The hairline the band is ruled off with. Geometry stays at the call
          site (§4a); the ramp is the class's. */}
      <span aria-hidden="true" className="block spectrum-rule" style={{ height: 2 }} />
    </div>
  );
}

export {
  CovenBand,
  EphemeristsBand,
  EverymenBand,
  SingularityBand,
  SnideBand,
  SpectrumBand,
  UaBand,
  WowBand,
};
