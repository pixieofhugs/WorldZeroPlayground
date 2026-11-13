import type { CSSProperties } from "react";
import { CARD, DEEP, DISPLAY, READING, SOFT } from "./covenSlip";

/**
 * The cauldron — Cozy Coven's total mark (#2019, ADR-0049).
 *
 * Shared by owner ruling: the score stamp and the Coven task card (#2033) both
 * mount it, so geometry changes here hit both surfaces.
 *
 * Text lives inside the viewBox so it scales with `size` (HTML px overlays
 * would burst a small cauldron). Only the drop-shadow radius can't scale, so
 * it's derived from `size` into a custom property.
 *
 * Motions (`.cvn-cauldron-sigil`, `.cvn-cauldron-bub`) live in `index.css`
 * behind the reduced-motion gate; inline animation would bypass it.
 */

/** viewBox units; the design draws it at 158 CSS px. */
const VIEW = 132;

interface CovenCauldronProps {
  /** Already formatted (`29.5`). */
  total: string;
  caption: string;
  /** px, both axes. */
  size?: number;
  style?: CSSProperties;
  className?: string;
}

export default function CovenCauldron({
  total,
  caption,
  size = 158,
  style,
  className,
}: CovenCauldronProps) {
  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      width={size}
      height={size}
      role="img"
      aria-label={`${total} ${caption}`}
      className={className}
      style={{
        // Glow and bubbles leave the viewport.
        overflow: "visible",
        flexShrink: 0,
        // From `size` so the halo stays proportional (pairing in index.css).
        ["--cvn-cauldron-glow" as string]: `${size / 20}px`,
        ...style,
      }}
    >
      {/* Bubbles: ornament only, stay drawn when motion is reduced. */}
      <g
        className="cvn-cauldron-bub"
        fill="none"
        stroke={DEEP}
        strokeWidth={1.6}
        opacity={0.8}
      >
        <circle cx={50} cy={38} r={4.5} />
      </g>
      <g
        className="cvn-cauldron-bub"
        fill="none"
        stroke={DEEP}
        strokeWidth={1.4}
        opacity={0.8}
        style={{ ["--tw-delay" as string]: "1.1s" }}
      >
        <circle cx={68} cy={28} r={3} />
      </g>
      <g
        className="cvn-cauldron-bub"
        fill="none"
        stroke={DEEP}
        strokeWidth={1.6}
        opacity={0.8}
        style={{ ["--tw-delay" as string]: "2.1s" }}
      >
        <circle cx={82} cy={36} r={5.5} />
      </g>

      {/* `fillOpacity` lets either host's ground read through. */}
      <g className="cvn-cauldron-sigil">
        <path d="M46 108 l-5 13" stroke={DEEP} strokeWidth={2.4} strokeLinecap="round" />
        <path d="M86 108 l5 13" stroke={DEEP} strokeWidth={2.4} strokeLinecap="round" />
        <path
          d="M25 54 C25 92 42 112 66 112 C90 112 107 92 107 54 Z"
          fill={CARD}
          fillOpacity={0.94}
          stroke={DEEP}
          strokeWidth={1.8}
        />
        <ellipse
          cx={66}
          cy={54}
          rx={41}
          ry={8.5}
          fill={CARD}
          fillOpacity={0.94}
          stroke={DEEP}
          strokeWidth={1.8}
        />
        <ellipse cx={66} cy={54} rx={32} ry={5} fill="none" stroke={DEEP} strokeWidth={1} opacity={0.4} />
      </g>

      {/* aria-hidden: the <svg> label already carries both. */}
      <text
        x={66}
        y={84}
        textAnchor="middle"
        aria-hidden="true"
        fill={DEEP}
        fontFamily={READING}
        fontWeight={600}
        fontSize={27}
      >
        {total}
      </text>
      <text
        x={66}
        y={97}
        textAnchor="middle"
        aria-hidden="true"
        fill={SOFT}
        fontFamily={DISPLAY}
        fontSize={10}
        letterSpacing={1.8}
        style={{ textTransform: "uppercase" }}
      >
        {caption}
      </text>
    </svg>
  );
}
