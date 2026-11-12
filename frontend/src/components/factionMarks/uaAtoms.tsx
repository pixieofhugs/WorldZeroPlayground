import type { CSSProperties } from "react";

import { UaSigil } from "../sigil/UaSigil";
import UaMandala from "./UaMandala";
import { factionRoleVar } from "../../utils/factionRoles";

/*
 * UA shared presentation atoms (#851): two faces, a tracked uppercase eyebrow, a
 * hairline and the ensō carrying a score. Every value is a token; dark comes from
 * the cascade, never a ternary.
 *
 * Roles come through the SINGULAR `factionRoleVar` (#2659/#2673): these atoms
 * mount inside a dozen surfaces with their own prefixes, so they can't read one
 * surface's `var(--prefix-*)` without leaking it into the others.
 */

/** Headline cut — Cormorant Garamond. Titles, numerals, names. Never italic. */
export const UA_DISPLAY = factionRoleVar("ua", "face");
/** Text cut — EB Garamond. Body copy, labels, metadata. */
export const UA_TEXT = "var(--faction-ua-body-font)";

/** The practice's hue, as a FILL. A hue is never an ink. */
const UA_FILL = factionRoleVar("ua", "fill");

/** The eyebrow — UA's one label shape: small, uppercase, widely tracked, quiet. */
export const UA_EYEBROW: CSSProperties = {
  fontFamily: UA_TEXT,
  fontSize: "var(--text-md)",
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: factionRoleVar("ua", "quiet"),
};

/**
 * A drop shadow mixed from the ink role, so it inverts with the theme (a raw
 * `rgba` vanishes on dark).
 */
export function uaShade(percent: number): string {
  return `color-mix(in srgb, ${factionRoleVar("ua", "ink")} ${percent}%, transparent)`;
}

/**
 * How much of the ensō's box is clear across the middle. Measured off
 * `public/factionMarks/enso.webp` (inner edge ~0.56), with the ragged edge kept clear.
 */
const RING_CLEAR = 0.5;

/**
 * Advance widths in em for the ring's face; `tabular-nums` makes one digit width
 * true. Deliberately generous: overestimating costs a fraction of a point,
 * underestimating puts ink on the brush.
 */
const DIGIT_EM = 0.52;
const PUNCT_EM = 0.26;

/**
 * The largest the numeral may be and still clear the ring, in px. The ensō is a
 * drawing sized by each surface (84-138px) and a score can be six glyphs. Engages
 * only at the wide end — today's totals render at full `valueSize` (#1147).
 */
function ringCeilingPx(text: string, size: number): number {
  let em = 0;
  for (const glyph of text) em += glyph === "." || glyph === "," ? PUNCT_EM : DIGIT_EM;
  return (size * RING_CLEAR) / Math.max(em, DIGIT_EM);
}

/**
 * The ensō carrying a number — the only ensō-with-a-figure on the site (#1147).
 * The circle is {@link UaSigil}; this centres a numeral and unit inside it.
 *
 * Numeral and word are two full line boxes (a cropped `line-height` made them
 * overlap). Sizes are raw px: the numeral scales with a drawn figure.
 */
export function UaEnsoScore({
  size,
  value,
  unit,
  ringColor,
  valueColor = factionRoleVar("ua", "ink"),
  unitColor,
  valueSize = "var(--text-heading)",
  valueWeight = 600,
}: {
  size: number;
  /** A string/number, not a node: the ring must count glyphs to fit it. */
  value: string | number;
  /** The unit word under the numeral. Omit for a bare mark. */
  unit?: string;
  /** The ring's ink. Defaults to {@link UaSigil}'s `--faction-ua-glow`. */
  ringColor?: string;
  valueColor?: string;
  /** The caption's ink. Defaults to the eyebrow's muted tone. */
  unitColor?: string;
  /**
   * The numeral's --text-* tier (#1182); a CEILING, not the rendered size — see
   * {@link ringCeilingPx}.
   */
  valueSize?: string;
  /** The numeral's weight (#1182). Cormorant Garamond ships 500/600/700. */
  valueWeight?: number;
}) {
  const figure = String(value);
  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <UaSigil width={size} height={size} color={ringColor} />
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--space-xs)",
        }}
      >
        <span
          style={{
            fontFamily: UA_DISPLAY,
            fontWeight: valueWeight,
            // The tier is the ceiling; `min()` does the fit with no measuring.
            fontSize: `min(${valueSize}, ${ringCeilingPx(figure, size).toFixed(2)}px)`,
            lineHeight: 1,
            fontVariantNumeric: "lining-nums tabular-nums",
            whiteSpace: "nowrap",
            color: valueColor,
          }}
        >
          {figure}
        </span>
        {unit && (
          <span
            style={{
              ...UA_EYEBROW,
              fontSize: "var(--text-md)",
              lineHeight: 1,
              whiteSpace: "nowrap",
              ...(unitColor ? { color: unitColor } : {}),
            }}
          >
            {unit}
          </span>
        )}
      </span>
    </span>
  );
}

/**
 * The ink column — a UA-orange hairline down a surface's left, fading at both ends
 * (kit §1, "3a Ink Column"). Absolutely positioned; the caller owns the padding.
 */
export function UaInkColumn({ style }: { style?: CSSProperties }) {
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        width: 2,
        background:
          `linear-gradient(180deg, transparent, ${UA_FILL} 12%, ${UA_FILL} 88%, transparent)`,
        opacity: 0.34,
        pointerEvents: "none",
        ...style,
      }}
    />
  );
}

/**
 * One of the two mandalas flanking the sign-up (#2031).
 *
 * In flow, never positioned: an absolute flank rides over the button on a narrow
 * card (see `docs/agents/design-fidelity.md`); flex siblings can't overlap, and
 * the article's `overflow: hidden` trims ornament rather than the control. Takes
 * `UaMandala`'s default glow ink — never an ink token.
 */
export function UaCtaFlank({ side, size }: { side: "start" | "end"; size: number }) {
  return (
    <span
      data-ua-flank={side}
      aria-hidden="true"
      // Ornament only: the button is the one thing in this row a finger may hit.
      style={{ flex: "0 0 auto", lineHeight: 0, pointerEvents: "none" }}
    >
      {/* Boundary off: a closed disc reads as a second boxed seal. `pulse` is the
          flank's only motion (#2072), reduced-motion gated in
          `motion.ornament.css`; it does not spin. */}
      <UaMandala size={size} strength="full" rings={3} petalsPerRing={8} boundary={false} pulse />
    </span>
  );
}
