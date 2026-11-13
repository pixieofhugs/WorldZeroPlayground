import { useId } from "react";
import type { CSSProperties } from "react";

/**
 * The points roundel — Everymen's signature total mark (#841, ADR-0049).
 *
 * A rubber stamp: double circle, total, unit caption, and an optional legend
 * arced on a `textPath`. Inline SVG (live text). The multiply blend belongs to
 * the consumer (`.everymen-stamp-print`), since it inverts in dark.
 *
 * Shared (#2034) by the praxis score stamp and the Everymen task card. Only a
 * scored praxis earns the legend, so `arcLabel` is optional and without it the
 * caption grows into the freed room.
 *
 * Type sizes are user-space units on a 0..100 viewBox (ornament, §4a).
 */

export interface PointsRoundelProps {
  /** Already formatted (`13.6`). */
  total: string;
  unitLabel: string;
  arcLabel?: string;
  /** px, both axes. */
  size?: number;
  /** A faction token; defaults to `currentColor`. */
  color?: string;
  style?: CSSProperties;
  className?: string;
}

/** The r=40 circle, as a path for `textPath`. */
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
  // Unique per card; strip `:` before it reaches a URL fragment.
  const arcId = `wz-roundel-${useId().replace(/:/g, "")}`;
  // Four glyphs (`29.6`) must fit the inner ring.
  const totalSize = total.length > 3 ? 31 : 33;
  // No legend: caption takes its room (7.5 would be mush at 70px).
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
