import { useId } from "react";
import type { CSSProperties } from "react";

/**
 * The points roundel — Everymen's signature total mark (#841, ADR-0049).
 *
 * A rubber stamp struck onto the broadsheet: a double circle with the total
 * across the middle, `POINTS` beneath it, and the certification legend arced
 * around the inner ring on a `textPath`. #821 replaced it with a generic
 * rectangle; the roundel IS the faction's claim that the work is on the record,
 * so it comes back as a mark rather than as a border treatment.
 *
 * Inline SVG rather than a masked asset (the {@link Enso} route): the roundel
 * carries live text, so it has to be typeset at render time, and at ~1 KB the
 * bundle argument for masking never arises. Every `fill` reads the `color` prop,
 * so one token dresses the whole mark and dark mode flows through the cascade.
 *
 * The multiply blend belongs to the CONSUMER, via `.everymen-stamp-print` — the
 * blend has to invert in dark and that is a cascade decision, not a prop.
 *
 * IT IS A SHARED MARK, and since #2034 it is struck on TWO surfaces: the praxis
 * card's score stamp and the Everymen task card's points seal. That is what
 * makes `arcLabel` optional. The legend reads "★ VERIFIED ★ ON THE RECORD" — a
 * claim only a scored praxis can make, so a task card omits it, and with two
 * texts in the ring instead of three the unit caption takes the room the legend
 * was holding. Both mounts therefore keep their own proportions from one
 * drawing; the praxis stamp passes a legend and is unchanged by this.
 *
 * Type sizes here are the design's, in the SVG's own user-space units on a
 * 0..100 viewBox — they are neither `px` nor text-scale steps, and the scale
 * factor is `size / 100`. Stamp lettering is ornament (`WORLD_ZERO_STYLE` §4a),
 * and SVG geometry has never been on the `--text-*` scale.
 */

export interface PointsRoundelProps {
  /** The total, already formatted for display (`13.6`). */
  total: string;
  /** The `POINTS` caption under the numeral. */
  unitLabel: string;
  /** The legend arced around the inner ring. Omitted where none is earned. */
  arcLabel?: string;
  /** Rendered size in px, both axes. Design draws it at 102. */
  size?: number;
  /** The stamp ink. Pass a faction token; defaults to the surrounding ink. */
  color?: string;
  style?: CSSProperties;
  className?: string;
}

/** The r=40 circle the legend runs along, as a path so `textPath` can use it. */
const ARC_PATH = "M50,50 m0,-40 a40,40 0 1,1 -0.01,0 z";

export default function PointsRoundel({
  total,
  unitLabel,
  arcLabel,
  size = 102,
  color = "currentColor",
  style,
  className,
}: PointsRoundelProps) {
  // One roundel per card, many cards per feed — the textPath id must not
  // collide. React's ids carry `:` delimiters, which are legal in an id but not
  // in a CSS selector, so they come out before the id reaches a URL fragment.
  const arcId = `wz-roundel-${useId().replace(/:/g, "")}`;
  // The design shrinks the numeral for a four-glyph total (`29.6`) so it stays
  // inside the inner ring; anything shorter is struck at full size.
  const totalSize = total.length > 3 ? 31 : 33;
  // Without the legend the ring holds two texts, not three, so the caption
  // takes the room the arc was holding rather than staying tuned for it — the
  // task card strikes this at 70px, where the stamp's 7.5 would be sub-6px mush.
  const unitSize = arcLabel ? 7.5 : 10.5;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={`${total} ${unitLabel}`}
      className={className}
      style={{ overflow: "visible", transform: "rotate(-6deg)", flexShrink: 0, ...style }}
    >
      <circle cx={50} cy={50} r={46} fill="none" stroke={color} strokeWidth={2.5} />
      <circle cx={50} cy={50} r={40} fill="none" stroke={color} strokeWidth={1} />
      {arcLabel && (
        <>
          <defs>
            <path id={arcId} d={ARC_PATH} />
          </defs>
          <text fill={color} fontFamily="var(--font-faction-typewriter)" fontSize={8} letterSpacing={1.6}>
            <textPath href={`#${arcId}`} startOffset="2%">
              {arcLabel}
            </textPath>
          </text>
        </>
      )}
      <text
        x={50}
        y={54}
        textAnchor="middle"
        fill={color}
        fontFamily="var(--font-accent)"
        fontSize={totalSize}
      >
        {total}
      </text>
      <text
        x={50}
        y={68}
        textAnchor="middle"
        fill={color}
        fontFamily="var(--font-faction-typewriter)"
        fontSize={unitSize}
        letterSpacing={2}
        style={{ textTransform: "uppercase" }}
      >
        {unitLabel}
      </text>
    </svg>
  );
}
