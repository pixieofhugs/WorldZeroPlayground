/**
 * Shared S.N.I.D.E. craft atoms — the struck-through circle-S sigil reused
 * across SNIDE surfaces (task detail, faction hero), and the pink pen loop the
 * faction circles a figure in. Mirrors
 * components/factionMarks/ephemeristsPlate.tsx. Colors come from the namespaced
 * --faction-snide-* tokens in index.css. Filter-free (matches the faction's
 * CSS-only craft layers — no SVG feTurbulence).
 */
import type { CSSProperties } from "react";

interface SnideSigilProps {
  size?: number;
  color?: string;
}

/** A sprayed, struck-through circle-S — the defiant SNIDE mark. */
export function SnideSigil({
  size = 48,
  color = "var(--faction-snide-acid)",
}: SnideSigilProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      style={{ display: "block" }}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="19" fill="none" stroke={color} strokeWidth="3" />
      <text
        x="24"
        y="34"
        textAnchor="middle"
        style={{
          fontFamily: "var(--faction-snide-font-impact)",
          // eslint-disable-next-line local/no-raw-style-values -- ornament: sigil letterform drawn into the 48px SVG
          fontSize: 30,
        }}
        fill={color}
      >
        S
      </text>
      <line
        x1="9"
        y1="40"
        x2="39"
        y2="8"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * The pen circle — S.N.I.D.E.'s points mark (#2035, shared by #2042).
 *
 * A figure ringed twice in hot pink biro, struck five degrees off true, with its
 * unit lettered under it inside the loop. Under ADR-0049 a faction's total mark
 * is the device the figure sits INSIDE, and this is S.N.I.D.E.'s: the only DRAWN
 * one it has.
 *
 * IT IS A SHARED MARK, BY OWNER RULING (#2042). The task card drew the loop and
 * the praxis-card score stamp drew a bare Anton numeral with a misregistered pink
 * offset shadow — one faction, two devices — and the ruling is that the point card
 * reflects the card's total look. So the loop is drawn once, here, and both
 * surfaces mount it. The pink SHADOW does not come along: the pink is the loop
 * now, and a second pink pass under a pink line reads as mud rather than as
 * misregistration.
 *
 * THE INKS ARE PROPS AND THAT IS NOT OPTIONAL. This is the pairing trap #2042
 * warns about, and S.N.I.D.E. is where it bites hardest. The card's numeral ink is
 * `--faction-snide-note-ink`, which FLIPS (#14110b by day, #f4f1e8 by night); the
 * score stamp's plate is `--faction-snide-stamp-bg`, a translucent black over the
 * near-black `-card-bg` in BOTH themes. The card's ink on the stamp's plate
 * measures **1.05:1 in light** — an invisible figure that passes every guard,
 * exactly the shape that shipped at 1.08:1 earlier in this epic. The caption ink
 * is no better: `-note-pink-ink` reads 3.27:1 there, under AA.
 *
 * So the stamp passes its own inks and they are measured on its own plate:
 *   figure  `--faction-snide-acid`        16.31:1 light · 16.81:1 dark
 *   caption `--faction-snide-card-muted`  13.52:1 light · 12.74:1 dark
 *   loop    `--faction-snide-pink`         5.65:1 light ·  5.82:1 dark
 * The loop is theme-invariant, which is why it needs no prop.
 *
 * NO NUMERAL CEILING, unlike UA's ensō. Anton is condensed enough that the widest
 * total the era can bank still clears the loop: at `--text-heading` a four-glyph
 * `13.6` is ~47px against the loop's ~77px of inner span at the 96 both surfaces
 * draw. If a future era ever banks a five-figure total, `UaEnsoScore.ringCeilingPx`
 * is the upgrade path — ponytail: measured, not machined.
 */
export function PenCircle({
  size,
  value,
  unit,
  valueColor = "var(--faction-snide-note-ink)",
  unitColor = "var(--faction-snide-note-pink-ink)",
  style,
}: {
  /** The loop's drawn width in px. Ornament geometry (§4a). */
  size: number;
  /** The figure inside the loop, already formatted by the caller. */
  value: string | number;
  /** The unit lettered under it. */
  unit: string;
  /** The figure's ink. Defaults to the clipping's own; see the docblock. */
  valueColor?: string;
  /** The caption's ink. Defaults to the clipping's walked pink. */
  unitColor?: string;
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
      {/* THE GROWTH IS ON THE SVG ALONE (#2035), so the numeral and its caption
          stay where they are and the loop opens away from them. A scale on the
          whole mark would grow the type with the line and clear nothing — the
          same move UA's ensō makes. The loop spans 80 of the 100 viewBox units,
          so at 1.18x it reaches 94.4, still inside its own box, which is why
          nothing beside it on either surface has to move. */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 78"
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
      <span
        style={{
          position: "relative",
          fontFamily: "var(--faction-snide-font-impact)",
          fontSize: "var(--text-heading)",
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
          fontFamily: "var(--faction-snide-font-impact)",
          // eslint-disable-next-line local/no-raw-style-values -- ornament: pen-circle caption, sized to the drawn loop rather than the label ramp (§4a).
          fontSize: 10,
          letterSpacing: "0.22em",
          // eslint-disable-next-line local/no-raw-style-values -- ornament: the caption's lead inside the drawn loop; a 4px rung pushes it off the numeral.
          marginTop: 2,
          color: unitColor,
        }}
      >
        {unit}
      </span>
    </div>
  );
}
