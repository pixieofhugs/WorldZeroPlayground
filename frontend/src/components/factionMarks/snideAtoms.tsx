/**
 * Shared S.N.I.D.E. craft atoms: the flyposted wall, the per-letter ransom cut and
 * the pink pen loop. NOT the sigil — one mark, from `components/sigil/` (#2119).
 * Colours are `--faction-snide-*` tokens; filter-free (no feTurbulence).
 */
import type { CSSProperties } from "react";

/**
 * The bare wall (#2395): the ramp with none of {@link WALL}'s printed layers. The
 * law (#2195): a card on an ornamented ground goes plain, on a plain ground wears its
 * ornament. "Plain" still needs a ground colour, so it is the ramp, not transparent.
 * Its stops are already measured in `factionContrast.test.ts` (SNIDE_WALL_PAIRS).
 */
export const WALL_PLAIN =
  "linear-gradient(180deg, var(--faction-snide-wall) 0%, var(--faction-snide-wall-deep) 100%)";

/**
 * The flyposted wall — S.N.I.D.E.'s one ground (#2177): xerox raster, scanline and
 * two washed corners over the `-wall` ramp. It flips, so every pigment is a token.
 * Drawn once for its mounts; JS rather than a class to keep five gradients out of
 * the blocking stylesheet.
 *
 * Inks on it are the `-note-*` family, which flips with it — never `-card-*`
 * (pinned near-black for slabs pasted ON the wall, #2066; collapsing onto it
 * measures 1.56:1, #2333). Measured in `factionContrast.test.ts`.
 */
export const WALL = [
  "repeating-linear-gradient(115deg, var(--faction-snide-note-grain) 0 2px, transparent 2px 7px)",
  "repeating-linear-gradient(0deg, var(--faction-snide-note-scan) 0 1px, transparent 1px 4px)",
  "radial-gradient(120% 80% at 8% -10%, var(--faction-snide-note-wash-acid), transparent 60%)",
  "radial-gradient(90% 70% at 100% 110%, var(--faction-snide-note-wash-pink), transparent 62%)",
  WALL_PLAIN,
].join(", ");

/**
 * The five scraps a name is cut from (#1198, shared by #2287). Only the first
 * flips (a paler patch of the sheet's stock); the rest are the press's invariant
 * pigments.
 *
 * Ground-portable: every letter carries its own opaque scrap, so the pairing is
 * letter-on-scrap (worst 5.38:1). On the wall the pale scrap blends (~1.1:1) but
 * its letter still clears the bare wall (15.95 / 17.52:1).
 */
const RANSOM = [
  {
    bg: "var(--faction-snide-slip-field)",
    col: "var(--faction-snide-slip-ink)",
    font: "var(--faction-snide-font-black)",
    rot: -5,
  },
  {
    bg: "var(--faction-snide-ink)",
    col: "var(--faction-snide-acid)",
    font: "var(--faction-snide-font-marker)",
    rot: 4,
  },
  {
    bg: "var(--faction-snide-pink)",
    col: "var(--faction-snide-on-accent)",
    font: "var(--faction-snide-font-black)",
    rot: -3,
  },
  {
    bg: "var(--faction-snide-acid)",
    col: "var(--faction-snide-ink)",
    font: "var(--faction-snide-font-black)",
    rot: 6,
  },
  {
    bg: "var(--faction-snide-ink)",
    col: "var(--faction-snide-paper)",
    font: "var(--faction-snide-font-marker)",
    rot: -6,
  },
];

export function Ransom({ text, size = 16 }: { text: string; size?: string | number }) {
  return (
    // ONE READABLE STRING: this is the link's accessible name. A flex row with
    // `gap` dropped the spaces ("VexLineCrane", #1043), so it is inline flow
    // with real spaces between words.
    <span style={{ display: "inline-block", fontSize: size, lineHeight: 1.25 }}>
      {[...text].map((char, index) => {
        if (char === " ") return <span key={index}>{" "}</span>;
        const s = RANSOM[(char.charCodeAt(0) + index * 3) % RANSOM.length];
        return (
          <span
            key={index}
            style={{
              display: "inline-block",
              verticalAlign: "middle",
              background: s.bg,
              color: s.col,
              fontFamily: s.font,
              fontSize: size,
              lineHeight: 0.92,
              // eslint-disable-next-line local/no-raw-style-values -- ornament: inset of a single cut-out letter tile inside its scrap of paper
              padding: "2px 5px 0",
              // eslint-disable-next-line local/no-raw-style-values -- ornament: kerning between the cut-out ransom letters; a rung breaks the pasted-up letterform run
              marginRight: 2,
              transform: `rotate(${s.rot}deg)`,
              boxShadow: "1.5px 2.5px 0 var(--faction-snide-slip-scrap-shadow)",
              textTransform: "uppercase",
            }}
          >
            {char}
          </span>
        );
      })}
    </span>
  );
}

/**
 * The four headline cuts (#3294). A word takes its cut by index, so a title always
 * cuts the same way and neighbours never share a face. Cut 2 names its own knockout
 * pair: paper/ink swap in dark, and a knockout that swaps with its ground vanishes.
 * No cut sets a weight (#2487): these faces ship at 400 only.
 */
export const RANSOM_CUTS: CSSProperties[] = [
  { fontFamily: "var(--faction-snide-font-black)", color: "var(--faction-snide-note-ink)", textTransform: "uppercase", transform: "rotate(-1deg)" },
  {
    fontFamily: "var(--faction-snide-font-black)",
    color: "var(--faction-snide-note-cta-ink)",
    background: "var(--faction-snide-acid)",
    padding: "0 var(--space-xs)",
    textTransform: "uppercase",
    transform: "rotate(0.8deg)",
  },
  {
    fontFamily: "var(--faction-snide-font-black)",
    color: "var(--faction-snide-note-knockout-ink)",
    background: "var(--faction-snide-note-knockout-bg)",
    // eslint-disable-next-line local/no-raw-style-values -- ornament: the knockout's 1px bleed IS the drawn cut; a 4px rung fattens it into a label chip.
    padding: "1px var(--space-xs)",
    // eslint-disable-next-line local/no-raw-style-values -- ornament: a cut's size is RELATIVE to the headline it was pasted into, not a tier of the type scale.
    fontSize: "0.82em",
    textTransform: "uppercase",
    transform: "rotate(-1.6deg)",
  },
  {
    fontFamily: "var(--faction-snide-font-type)",
    color: "var(--faction-snide-note-ink)",
    // eslint-disable-next-line local/no-raw-style-values -- ornament: as above; the smallest cut, clipped from body copy rather than a headline.
    fontSize: "0.72em",
    textTransform: "uppercase",
    borderBottom: "2px solid var(--faction-snide-pink)",
    transform: "rotate(1.2deg)",
  },
];


/**
 * The pink biro loop alone (#3294). `stretch` fills a box that isn't 100:78.
 */
export function PenLoop({ stretch = false }: { stretch?: boolean }) {
  return (
    <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 78"
        {...(stretch ? { preserveAspectRatio: "none" } : {})}
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, overflow: "visible", transform: "scale(1.18)" }}
      >
        <g fill="none" stroke="var(--faction-snide-pink)" strokeLinecap="round">
          <path
            d="M14 40 C13 19 38 7 56 9 C79 11 91 24 89 40 C87 59 61 71 43 68 C23 65 12 55 13 37 C13 28 18 19 27 13"
            strokeWidth="2.6"
          />
          <path d="M27 12 C16 18 11 28 11 39" strokeWidth="1.8" opacity="0.75" />
        </g>
      </svg>
  );
}

/**
 * The pen circle — S.N.I.D.E.'s points mark (ADR-0049, #2035), a figure ringed in
 * pink biro five degrees off true. Shared by owner ruling (#2042) across task card,
 * score stamp and task detail; no pink offset shadow (it muds under a pink line).
 *
 * The inks are props, and that is NOT optional: the default `-note-ink` flips, but
 * the other grounds are black in both themes (1.05:1 / 1.00:1 light). Each mount
 * passes inks measured on its own ground:
 *
 *   score stamp (`-stamp-bg` over `-card-bg`)
 *     figure  `--faction-snide-acid`        16.31:1 light · 16.81:1 dark
 *     caption `--faction-snide-card-muted`  13.52:1 light · 12.74:1 dark
 *   task detail (`-card-bg`, the slab punched into the acid plate — #2066)
 *     figure  `--faction-snide-card-text`   16.68:1 light · 17.51:1 dark
 *     caption `--faction-snide-card-accent` 15.55:1 light · 16.32:1 dark
 *
 * The loop is invariant pink and clears 3:1 everywhere, so needs no prop.
 *
 * ponytail: no numeral ceiling — the widest total today fits (~47px of ~77px).
 * Upgrade for five-figure totals: `UaEnsoScore.ringCeilingPx`.
 */
export function PenCircle({
  size,
  value,
  unit,
  valueColor = "var(--faction-snide-note-ink)",
  unitColor = "var(--faction-snide-note-pink-ink)",
  valueSize = "var(--text-heading)",
  unitCaps = false,
  style,
}: {
  /** Drawn width in px (§4a). */
  size: number;
  /** Already formatted by the caller. */
  value: string | number;
  unit: string;
  /** See the docblock. */
  valueColor?: string;
  unitColor?: string;
  valueSize?: string;
  /**
   * Caps on the caption — a per-site fact: the score stamp's lowercase "pts" is a
   * protected exception (#2598).
   */
  unitCaps?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        position: "relative",
        flex: "0 0 auto",
        width: size,
        height: size * 0.78,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transform: "rotate(-5deg)",
        ...style,
      }}
    >
      {/* The growth (1.18×) is on the SVG alone, so the type stays put (#2035). */}
      <PenLoop />
      <span
        style={{
          position: "relative",
          fontFamily: "var(--faction-snide-font-black)",
          fontSize: valueSize,
          lineHeight: 0.9,
          color: valueColor,
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </span>
      <span
        style={{
          position: "relative",
          fontFamily: "var(--faction-snide-font-black)",
          // eslint-disable-next-line local/no-raw-style-values -- ornament: pen-circle caption, sized to the drawn loop rather than the label ramp (§4a).
          fontSize: 10,
          letterSpacing: "0.22em",
          // eslint-disable-next-line local/no-raw-style-values -- ornament: the caption's lead inside the drawn loop; a 4px rung pushes it off the numeral.
          marginTop: 2,
          color: unitColor,
          ...(unitCaps ? { textTransform: "uppercase" as const } : {}),
        }}
      >
        {unit}
      </span>
    </div>
  );
}
