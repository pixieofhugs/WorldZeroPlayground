import type { CSSProperties } from "react";
import { CARD, DEEP, DISPLAY, READING, SOFT } from "./covenSlip";

/**
 * The cauldron — Cozy Coven's total mark (#2019, ADR-0049).
 *
 * A belled pot on two legs under a rising brew, with the figure it holds set
 * across its middle. It replaces the `✨` that used to close the Coven tally:
 * the sparkle was decoration beside a numeral, and under ADR-0049 a faction's
 * total mark is the device the figure sits INSIDE.
 *
 * IT IS A SHARED MARK, BY OWNER RULING, and that is what fixes its shape. Coven
 * draws a cauldron on two surfaces — the score stamp's total, and the points on
 * the Coven task card (#2033) — and the ruling is that this one is canonical and
 * the task card mounts it rather than drawing its own. So `size` is a prop and
 * not a constant, and the figure and its caption are props too, because #2033
 * passes different values. Change the geometry here and you have changed both
 * surfaces.
 *
 * EVERYTHING IS INSIDE THE viewBox, text included, which is the whole reason one
 * `size` can hold every proportion at once. The design overlays the numeral and
 * caption as absolutely-positioned HTML at 33px and 12px — px, so they would
 * stay 33px on an 84px cauldron and burst it. Typeset in user-space units they
 * scale with the box, exactly as {@link PointsRoundel} typesets Everymen's. The
 * one thing a viewBox cannot scale is a `drop-shadow` radius, so the glow's is
 * derived from `size` into a custom property the keyframe reads.
 *
 * The two motions are `.cvn-cauldron-sigil` and `.cvn-cauldron-bub` in
 * `index.css`, behind the reduced-motion gate. The design writes both inline,
 * which is the one shape that bypasses it.
 */

/** The drawing's own coordinate space. The design draws it at 158 CSS px. */
const VIEW = 132;

interface CovenCauldronProps {
  /** The figure held in the pot, already formatted for display (`29.5`). */
  total: string;
  /** The caption struck under it — `points` on the stamp, shorter elsewhere. */
  caption: string;
  /** Rendered size in px, both axes. The design draws it at 158. */
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
        // The glow and the rising bubbles both leave the viewport; SVG clips by
        // default. Also the pot's own flexShrink, since the stamp is a flex item.
        overflow: "visible",
        flexShrink: 0,
        // Derived from `size`, so the ratchet never sees a literal and the halo
        // stays proportional at both mounts (index.css states the pairing).
        ["--cvn-cauldron-glow" as string]: `${size / 20}px`,
        ...style,
      }}
    >
      {/* The brew. Three bubbles on a stagger, ornament only — they stay drawn
          when the gate stills them, because nothing is carried by the rise. */}
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

      {/* The pot: two legs, the belled body, the rim, and the brew's surface
          line. `fillOpacity` lets the ground it lands on read through, so the
          same drawing sits on the stamp's plate and on a task card's sheet. */}
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

      {/* The figure and its caption, struck across the belly of the pot rather
          than floated over it. `aria-hidden` because the <svg> already carries
          both as its label — otherwise a screen reader reads them twice. */}
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
