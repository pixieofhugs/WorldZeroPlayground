import type { CSSProperties } from "react";

/**
 * The rubric — the Ephemerists' signature total mark (#841, ADR-0049).
 *
 * In a manuscript the rubric is the passage struck in red: the line the scribe
 * wanted read first. Here it is the total, set in the codex's engraved face and
 * inked in rubrication red over a `Points` caption, ruled off from the working
 * above it by a gold-to-verdigris hairline — gold leaf on the left, the
 * faction's own celestial teal on the right.
 *
 * A mark rather than a stamp fragment (ADR-0049): the rubric is the object the
 * Ephemerists' score box is BUILT AROUND, and #821 lost it by treating the whole
 * right column as one generic plate. It is DOM rather than SVG because it is
 * typeset text — the mark is the setting, not a drawing.
 *
 * Colours arrive as tokens, so the whole mark flips with `[data-theme="dark"]`
 * and no hex reaches the markup.
 */

export interface RubricProps {
  /** The total, already formatted for display (`13.6`). */
  total: string;
  /** The caption under — or rather beside — the numeral. */
  unitLabel: string;
  /** The rubrication ink for the numeral. */
  color?: string;
  /** The caption's gold. */
  captionColor?: string;
  /** Left-hand stop of the hairline rule (gold leaf). */
  ruleFrom?: string;
  /** Right-hand stop of the hairline rule (celestial teal). */
  ruleTo?: string;
  style?: CSSProperties;
}

export default function Rubric({
  total,
  unitLabel,
  color = "var(--eph-rubric)",
  captionColor = "var(--eph-gold)",
  ruleFrom = "var(--eph-frame)",
  ruleTo = "var(--faction-ephemerists)",
  style,
}: RubricProps) {
  return (
    <div style={style}>
      <div
        aria-hidden
        style={{
          height: 1,
          background: `linear-gradient(90deg, ${ruleFrom}, ${ruleTo})`,
          opacity: 0.7,
          margin: "var(--space-sm) 0 var(--space-xs)",
        }}
      />
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-xs)" }}>
        <span
          style={{
            fontFamily: "var(--eph-display)",
            fontWeight: 600,
            // ornament: the rubric numeral is the mark's own optical size —
            // engraved caps struck at 28, not a step on the text scale (§4a).
            fontSize: 28,
            lineHeight: 0.8,
            color,
          }}
        >
          {total}
        </span>
        <span
          style={{
            fontFamily: "var(--eph-display)",
            fontSize: "var(--text-sm)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: captionColor,
          }}
        >
          {unitLabel}
        </span>
      </div>
    </div>
  );
}
