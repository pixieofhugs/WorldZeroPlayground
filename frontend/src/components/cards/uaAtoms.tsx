import type { CSSProperties, ReactNode } from "react";

import { UaSigil } from "./UaSigil";

/**
 * UA shared presentation atoms — the pieces every UA desktop surface repeats
 * (#851, brief §1).
 *
 * THE SALON IS DEAD. UA is a quiet, sun-bleached practice with a real dark
 * mode: two faces (a Cormorant display cut and an EB Garamond text cut), a
 * wide-tracked uppercase eyebrow, a hairline, and the ensō carrying a score.
 * Those five things are the whole vocabulary, so they live here rather than
 * being re-typed with slightly different tracking on eleven surfaces.
 *
 * Every value is a token. Both themes come from the `[data-theme="dark"]`
 * cascade in index.css — there is no ternary anywhere in the UA skin.
 */

/** Headline cut — Cormorant Garamond. Titles, numerals, names. Never italic. */
export const UA_DISPLAY = "var(--faction-ua-card-font)";
/** Text cut — EB Garamond. Body copy, labels, metadata. */
export const UA_TEXT = "var(--faction-ua-body-font)";

/**
 * The eyebrow — small, uppercase, widely tracked, quiet.
 *
 * The one label shape UA has. It replaces the salon's four competing regalia
 * treatments (engraved caps, mono kicker, gold small-caps, italic slug), which
 * is most of why the old skin read as loud.
 */
export const UA_EYEBROW: CSSProperties = {
  fontFamily: UA_TEXT,
  fontSize: "var(--text-md)",
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "var(--faction-ua-card-muted)",
};

/** The same label in the accent, for a section head that must lead the eye. */
export const UA_EYEBROW_ACCENT: CSSProperties = {
  ...UA_EYEBROW,
  color: "var(--faction-ua-card-accent)",
};

/**
 * A drop shadow mixed from the ink token rather than a raw rgba.
 *
 * The kit shadows with `rgba(20,12,6,.x)`, which is a light-mode value: on the
 * dark ground it is invisible where it should be deepest. Mixing from
 * `--faction-ua-card-text` inverts with the theme for free.
 */
export function uaShade(percent: number): string {
  return `color-mix(in srgb, var(--faction-ua-card-text) ${percent}%, transparent)`;
}

/** The neutral hairline, as a border shorthand. */
export const UA_HAIRLINE = "1px solid var(--faction-ua-rule)";

/**
 * The ensō carrying a number.
 *
 * The mark is reserved for the SCORE and the FACTION MARK (brief §4) — this is
 * the score half. The circle is drawn once in {@link UaSigil}; this atom only
 * centres a numeral and its unit inside it.
 *
 * Sizes are raw px because they are ornament geometry, not type or spacing:
 * the numeral scales with the circle, and the circle is a drawn figure.
 */
export function UaEnsoScore({
  size,
  value,
  unit,
  valueColor = "var(--faction-ua-card-text)",
  valueSize = "var(--text-heading)",
  valueWeight = 600,
}: {
  size: number;
  value: ReactNode;
  /** The unit word under the numeral. Omit for a bare mark. */
  unit?: string;
  valueColor?: string;
  /**
   * The numeral's tier (#1182). Defaults to the score tier every existing
   * caller draws. The composer's points mark sits a rung down on a smaller
   * circle, because there it is a REFERENCE to what the task is worth rather
   * than a result. A --text-* token, never a raw px: the numeral is type.
   */
  valueSize?: string;
  /** The numeral's weight (#1182). Cormorant Garamond ships 500/600/700. */
  valueWeight?: number;
}) {
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
      <UaSigil width={size} height={size} />
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 0.9,
        }}
      >
        <span
          style={{
            fontFamily: UA_DISPLAY,
            fontWeight: valueWeight,
            fontSize: valueSize,
            lineHeight: 0.9,
            color: valueColor,
          }}
        >
          {value}
        </span>
        {unit && (
          <span style={{ ...UA_EYEBROW, fontSize: "var(--text-sm)" }}>
            {unit}
          </span>
        )}
      </span>
    </span>
  );
}

/**
 * The ink column — a hairline of UA orange running down the left of a surface,
 * fading out at both ends.
 *
 * The task card's signature (kit §1, "3a Ink Column") and the one piece of
 * chrome that carries the faction on a surface too dense for the mandala.
 * Absolutely positioned: the caller owns the padding it sits inside.
 */
export function UaInkColumn({ style }: { style?: CSSProperties }) {
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        width: 2,
        background:
          "linear-gradient(180deg, transparent, var(--faction-ua) 12%, var(--faction-ua) 88%, transparent)",
        opacity: 0.34,
        pointerEvents: "none",
        ...style,
      }}
    />
  );
}
