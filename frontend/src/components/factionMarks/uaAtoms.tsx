import type { CSSProperties } from "react";

import { UaSigil } from "../sigil/UaSigil";
import { factionRoleVar } from "../../utils/factionRoles";

/*
 * THE ROLE, NOT THE TOKEN (#2659/#2673) — and the SINGULAR resolver throughout
 * this module, deliberately.
 *
 * These atoms have no root of their own: they are constants and fragments
 * mounted INSIDE a dozen different surfaces, each of which picks its own
 * prefix. An atom cannot read `var(--task-card-ink, …)` without hard-wiring one
 * surface's namespace into every other one's — the leak the law's "the prefix
 * belongs to the surface" rule exists to prevent. `factionRoleVar` needs no
 * prefix: it returns the same `var(--faction-ua-*)` string each of these
 * already held, so not one value moves. What changes is that an atom asks for
 * `face` rather than naming UA's token for it.
 */

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
export const UA_DISPLAY = factionRoleVar("ua", "face");
/** Text cut — EB Garamond. Body copy, labels, metadata. */
export const UA_TEXT = "var(--faction-ua-body-font)";

/** The practice's hue, as a FILL. A hue is never an ink. */
const UA_FILL = factionRoleVar("ua", "fill");

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
  color: factionRoleVar("ua", "quiet"),
};

/**
 * A drop shadow mixed from the ink token rather than a raw rgba.
 *
 * The kit shadows with `rgba(20,12,6,.x)`, which is a light-mode value: on the
 * dark ground it is invisible where it should be deepest. Mixing from
 * `--faction-ua-card-text` inverts with the theme for free.
 */
export function uaShade(percent: number): string {
  return `color-mix(in srgb, ${factionRoleVar("ua", "ink")} ${percent}%, transparent)`;
}

/**
 * How much of the drawn box the ensō leaves clear, across the middle.
 *
 * Measured off `public/factionMarks/enso.webp`: the brush circle's inner edge
 * spans about 0.56 of the square, and a numeral that reaches the ragged inside
 * of the stroke reads as broken rather than as centred. 0.50 is that
 * measurement with the ragged edge kept clear — and it is not a number invented
 * here: it reproduces the praxis stamp's drawn 38px numeral in its 138px ring
 * almost exactly for a four-glyph total, which is how the design sized it.
 */
const RING_CLEAR = 0.5;

/**
 * Advance widths in the ring's face, in em — Cormorant Garamond, falling back to
 * Georgia. `font-variant-numeric: tabular-nums` below makes the uniform figure
 * width true rather than assumed, so one number covers every digit; `lining-nums`
 * keeps the figures off the descender line, which is half of why the old stack
 * ran into the word beneath it.
 *
 * These are deliberately a shade generous. Overestimating costs a fraction of a
 * point of numeral size; underestimating puts ink on the brush.
 */
const DIGIT_EM = 0.52;
const PUNCT_EM = 0.26;

/**
 * The largest the numeral may be and still clear the ring, in px.
 *
 * WHY THE NUMERAL HAS A CEILING AT ALL. §4's geometry doctrine says type wins
 * and geometry yields — make the container bigger. The ensō is the one place
 * that does not apply: the container is a DRAWING, and each surface sizes it
 * from its own layout budget (84 to 138px). A score is `(base + meta) × mult +
 * votes`, so the string is one to six glyphs, and at the wide end a fixed
 * numeral leaves the circle. The ceiling engages only then — every total on the
 * site today renders at its full `valueSize`, which is the owner's ruling that
 * the figure does not shrink (#1147).
 */
function ringCeilingPx(text: string, size: number): number {
  let em = 0;
  for (const glyph of text) em += glyph === "." || glyph === "," ? PUNCT_EM : DIGIT_EM;
  return (size * RING_CLEAR) / Math.max(em, DIGIT_EM);
}

/**
 * The ensō carrying a number.
 *
 * The mark is reserved for the SCORE and the FACTION MARK (brief §4) — this is
 * the score half. The circle is drawn once in {@link UaSigil}; this atom only
 * centres a numeral and its unit inside it. It is the ONLY ensō-with-a-figure
 * on the site (#1147): `UaScoreStamp` used to hand-roll a second one, which is
 * why fixing the ring on one surface never fixed it on the others.
 *
 * THE NUMERAL AND THE WORD ARE TWO LINES, NOT ONE PILE. Both boxes used to be
 * cropped to `line-height: .9` (`.8` in the stamp's copy) with a hairline
 * between them, so a figure's ink sat inside the caption's line box and the two
 * overlapped. The numeral now gets its whole em box and the word is pushed down
 * off the spacing scale — the caption stays, lower, at every digit count.
 *
 * Sizes are raw px because they are ornament geometry, not type or spacing:
 * the numeral scales with the circle, and the circle is a drawn figure.
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
  /**
   * The figure. A string or a number rather than a `ReactNode`, because the
   * ring has to know how wide the numeral wants to be before it can decide
   * whether it fits — and a node's glyph count is not readable from here.
   */
  value: string | number;
  /** The unit word under the numeral. Omit for a bare mark. */
  unit?: string;
  /** The ring's ink. Defaults to {@link UaSigil}'s `--faction-ua-glow`. */
  ringColor?: string;
  valueColor?: string;
  /** The caption's ink. Defaults to the eyebrow's muted tone. */
  unitColor?: string;
  /**
   * The numeral's tier (#1182). Defaults to the score tier every existing
   * caller draws. The composer's points mark sits a rung down on a smaller
   * circle, because there it is a REFERENCE to what the task is worth rather
   * than a result. A --text-* token, never a raw px: the numeral is type.
   *
   * This is a CEILING, not the rendered size — see {@link ringCeilingPx}.
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
            // The tier is the ceiling; the ring is the fit. `min()` is the
            // native platform doing the choosing, so nothing has to measure.
            fontSize: `min(${valueSize}, ${ringCeilingPx(figure, size).toFixed(2)}px)`,
            // A full line box. The crop that used to be here is the defect.
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
          `linear-gradient(180deg, transparent, ${UA_FILL} 12%, ${UA_FILL} 88%, transparent)`,
        opacity: 0.34,
        pointerEvents: "none",
        ...style,
      }}
    />
  );
}
