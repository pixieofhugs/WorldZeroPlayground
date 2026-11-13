import type { CSSProperties } from "react";
import CardMasthead from "./CardMasthead";
import SingularityLamps from "../factionMarks/SingularityLamps";
import { UA_DISPLAY } from "../factionMarks/uaAtoms";
import { useFormFactor } from "../../hooks/useFormFactor";
import { factionName } from "../../utils/factions";

/**
 * The seven painted bands, one per faction, mounted by BOTH card kits (#2185).
 * `CardMasthead` owns the anatomy; this file owns the paint. Owner ruling: a
 * praxis card wears the same band its task card wears — written once, mounted
 * twice, so the two cannot drift.
 *
 * Named exports, no slug→component map: #782 bans surface registries
 * (`addAFaction.test.tsx`) and every caller already knows its faction.
 * No `DefaultBand`/`AlbescentBand` by rule (ADR-0048): a band naming the
 * society would un-hide it on a public card. Ornament below a band (WOW
 * bunting, Ephemerists cornice) belongs to the surface.
 */

const HAND = "var(--font-faction-script)"; /* Caveat */

/** The band the twinkle field is confined to, so no star lands in copy (§4a). */
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
 * The twinkle field rides inside the band, over its ground.
 *
 * `--faction-coven-mast` is the band's own ground (pink by day, unchanged by
 * night, #2635). Transcribed from `-slip-cta-*` rather than aliased, so the
 * CTA's dark half can't leak in; index.css gives the reasons. The wordmark ink
 * is declared, not inherited from the card root, and `markColor` repaints the
 * hat (`--faction-coven` fails contrast on the pink).
 */
function CovenBand({ inert = false }: { inert?: boolean } = {}) {
  return (
    <div
      style={{
        position: "relative",
        zIndex: 2,
        height: COVEN_BAND_HEIGHT,
        background: "var(--faction-coven-mast)",
        borderBottom: "1px solid var(--faction-coven-slip-pk)",
        /* A band's height is its content; pinned against the equal-height row's
           slack chain (index.css, #2380). */
        flexGrow: 0,
      }}
    >
      <TwinkleField />
      <CardMasthead
        slug="coven"
        markColor="var(--faction-coven-mast-ink)"
        inert={inert}
        style={{ height: "100%", color: "var(--faction-coven-mast-ink)" }}
      >
        {/* Name from the one owner (ADR-0038); lower case is the hand-lettering's,
            so it lives in `textTransform`. */}
        <div style={{ fontFamily: HAND, fontSize: "var(--text-title)", lineHeight: 1, textTransform: "lowercase" }}>
          {factionName("coven")}
        </div>
      </CardMasthead>
    </div>
  );
}

const DECO = "var(--font-faction-engraved)";

/**
 * The restrained masthead (#2067). Ground is the medallion's disc, not the
 * cornice band; the ink stays `-plate-band-ink` (13.07:1 on the disc,
 * recorded in `factionContrast.test.ts`). `boxSizing` is load-bearing: a
 * content-box border would overflow the card's `overflow: hidden` by 2px.
 */
function EphemeristsBand({ inert }: { inert?: boolean } = {}) {
  return (
    <CardMasthead
      slug="ephemerists"
      inert={inert}
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
        {/* #1910: the one per-faction name key. */}
        {factionName("ephemerists")}
      </span>
    </CardMasthead>
  );
}

const POSTER = "var(--faction-everymen-card-font)"; /* Bebas Neue */

/** Poster label voice — condensed caps. */
const EVERYMEN_LABEL: CSSProperties = {
  fontFamily: POSTER,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
};

/**
 * The union's red bar, naming the faction. Its padding is the file's one
 * form-factor branch: the mast is deeper on the desktop sheet.
 */
function EverymenBand({ inert }: { inert?: boolean } = {}) {
  const formFactor = useFormFactor();
  return (
    <CardMasthead
      slug="everymen"
      inert={inert}
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

const MONO = "var(--faction-singularity-card-font)"; /* Share Tech Mono */

/**
 * The window chrome, titled with the faction's name (ADR-0038). The lamps are
 * the window, not a mark; the grid centres the title on the BAND, so they
 * don't push it off true.
 */
function SingularityBand({ inert }: { inert?: boolean } = {}) {
  return (
    <CardMasthead
      slug="singularity"
      inert={inert}
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

const IMPACT = "var(--faction-snide-font-black)"; /* Archivo Black */

/** The note bar. */
function SnideBand({ inert }: { inert?: boolean } = {}) {
  return (
    <CardMasthead
      slug="snide"
      inert={inert}
      /* Drawn 24 where the kit draws 20 (#2035); the 2px bleed into the inset
         is intended — `SnideSigil` breaks its own circle. */
      markSize={24}
      style={{
        background: "var(--faction-snide-note-bar)",
        color: "var(--faction-snide-note-bar-ink)",
      }}
    >
      {/* eslint-disable-next-line local/no-raw-style-values -- ornament: cut-out wordmark; Archivo Black at a label-ramp size stops reading as a masthead. */}
      <span style={{ fontFamily: IMPACT, fontSize: 22, letterSpacing: "0.06em", lineHeight: 1, color: "var(--faction-snide-acid)" }}>
        {factionName("snide")}
      </span>
    </CardMasthead>
  );
}

/**
 * UA's orange band (#2635), frozen across both cascades: `--faction-ua` flips,
 * so the band uses the frozen `--faction-ua-mast`.
 *
 * Ink is `--faction-ua-mast-ink` (frozen warm white, 4.59:1, clears AA at
 * `--text-title`), NOT `--faction-ua-on-fill`: that flips with the fill and
 * prints near-black at 3.52:1 on a frozen orange. A frozen ground needs a
 * frozen ink. The mark takes it too (the ensō glow is 1.30:1 here), and there
 * is no bottom rule (it was orange on orange).
 *
 * The one band with an `inert` arm (#2995): composer sheets mount it inside a
 * `<form>`, where an anchor can lose a draft. See `CardMasthead`'s `inert`.
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

const MED = "var(--faction-wow-card-font)"; /* MedievalSharp */
/**
 * Lettering AND mark ink (#2032): theme-invariant like the plum, so one
 * measurement (3.47:1) covers both themes. NOT `-stamp-total`, which flips.
 */
const GILT_MID = "var(--faction-wow-gilt-mid)";

/**
 * The plum banner (#2029, #2032).
 *
 * Horizontal inset is `--space-sm` on BOTH sides (#2070): the wordmark centres
 * on the content box, so left-only clearance walks it off centre; zero read as
 * touching the frame. The bottom rule is gilt because `--faction-wow-card-accent`
 * equals the plum ground in light; the bunting hangs from it.
 */
function WowBand({ inert }: { inert?: boolean } = {}) {
  return (
    <CardMasthead
      slug="wow"
      inert={inert}
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
