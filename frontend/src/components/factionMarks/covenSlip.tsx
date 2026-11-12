import type { CSSProperties } from "react";

import { mediaUrl } from "../../utils/media";

/**
 * Cozy Coven — the candlelit vocabulary, drawn once for every Coven surface (#1209).
 * Every colour is a `--faction-coven-slip-*` / `-ward-*` token; where the design's
 * hex was walked down for AA, the walked value wins (`index.css` records why).
 *
 * ## Which ink goes where — measured, not chosen
 *
 * `INK` / `SOFT` / `LABEL` are the text tiers and clear AA on every Coven ground
 * (`utils/__tests__/factionContrast.test.ts`). `DEEP` and `PINK` do NOT: `PINK` is
 * ornament only (rings, auras, hearts, bullets); `DEEP` is a rule, strand or large
 * numeral, body text only on `CARD`. On the hazed page (`.coven-candle-backdrop`,
 * #1295; now only the mobile field desk) `DEEP` falls to 3.47:1, and to 3.33:1 on
 * `SLIP_SHEET`'s darkest stop.
 *
 * When `DEEP` was doing a job, substitute `INK`, not `SOFT`/`LABEL`: those uses
 * are affordances (links, active controls), which must not read quieter than the
 * copy around them.
 */

/* The four faces, exactly as the slip and the ward name them. */
export const CHROME = "var(--font-faction-script)"; /* Caveat */
export const READING = "var(--font-faction-spectral)"; /* Spectral */
export const HAND = "var(--font-faction-script)"; /* Caveat */
export const DISPLAY = "var(--font-faction-witch)"; /* Grenze Gotisch */

/* Ink. See the note above before painting a string in DEEP or PINK. */
export const INK = "var(--faction-coven-slip-ink)";
export const SOFT = "var(--faction-coven-slip-soft)";
export const LABEL = "var(--faction-coven-slip-label)";

/* Ornament and rules. */
export const DEEP = "var(--faction-coven-slip-deep)";
export const PINK = "var(--faction-coven-slip-pk)";
export const GOLD = "var(--faction-coven-slip-gold)";
export const BORDER = "var(--faction-coven-slip-border)";
export const GLOW = "var(--faction-coven-slip-glow)";
export const SHADOW = "var(--faction-coven-slip-shadow)";

/* Grounds. PAGE is the candlelit wash, CARD the paper laid on it. */
export const PAGE = "var(--faction-coven-ward-page)";
export const CARD = "var(--faction-coven-ward-card)";
export const HAIR = "var(--faction-coven-ward-hair)";

/* The call to action, and the gold band that says you already hold this. */
export const CTA_FROM = "var(--faction-coven-slip-cta-from)";
export const CTA_TO = "var(--faction-coven-slip-cta-to)";
export const CTA_INK = "var(--faction-coven-slip-cta-ink)";
export const HOLD_INK = "var(--faction-coven-ward-hold-ink)";

/**
 * The slip: pink paper fading to lavender — the faction's ground on four surfaces
 * (#2135). `DEEP` is ornament on it (3.33:1 on the darkest stop in light).
 */
export const SLIP_SHEET =
  "linear-gradient(158deg, var(--faction-coven-slip-from), var(--faction-coven-slip-mid) 36%, var(--faction-coven-slip-lav) 74%, var(--faction-coven-slip-vio))";

/** Small-caps caption voice — every label on the slip speaks in it. */
export const CAPTION: CSSProperties = {
  fontFamily: CHROME,
  fontWeight: 700,
  fontSize: "var(--text-md)",
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: LABEL,
};


/** The braided thread rule. `.cvn-braid` owns the strands' pigments (index.css). */
export function Braid({ style }: { style?: CSSProperties }) {
  return <span aria-hidden className="cvn-braid" style={{ minWidth: 20, ...style }} />;
}

/** One heart, tied off at an end of the braid. */
export function Heart({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true" style={{ display: "block", flex: "0 0 auto" }}>
      <path
        d="M6 10.5 C1 7.3, 1.2 3.4, 3.6 2.6 C5 2.1, 5.8 3, 6 3.6 C6.2 3, 7 2.1, 8.4 2.6 C10.8 3.4, 11 7.3, 6 10.5 Z"
        fill="var(--faction-coven-slip-deep)"
      />
    </svg>
  );
}

/** The braid with a heart at each end. `.cvn-braid` owns the thread's pigments. */
export function Thread({ style }: { style?: CSSProperties }) {
  return (
    <span aria-hidden="true" style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)", ...style }}>
      <Heart />
      <span className="cvn-braid" style={{ flex: 1, minWidth: 0 }} />
      <Heart />
    </span>
  );
}

/**
 * The four-point twinkle — the coven's ORNAMENT glyph, not its badge (the sigil is
 * the witch hat). `color` defaults to `--faction-coven`; mounts pass `GOLD` or `CTA_INK`.
 */
export function Spark({
  size = 22,
  color = "var(--faction-coven)",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block" }}>
      <path d="M12 0c.9 7 4.1 10.2 11 11-6.9.8-10.1 4-11 11-.9-7-4.1-10.2-11-11C7.9 10.2 11.1 7 12 0Z" fill={color} />
    </svg>
  );
}


/**
 * The turning watermark — a line-drawn cat (#2041), the design's own drawing
 * (`TaskCards.dc.html`). Open strokes only: at 9% a filled shape is a smudge.
 *
 * Placement is the mount's: a half-cropped face reads as a mistake, so mounts sit
 * it fully inside their container (only a whisker tip, at x=97, may graze an edge).
 * The composer masthead passes `position: static` to use it as a flex item (#2746);
 * the kit turns at one tempo (see `.cvn-wheel` in `motion.ornament.css`, gated on
 * reduced motion; no component-injected `<style>`, #911).
 *
 * Opacity is the mount's and is a contrast decision (#1302). `-slip-soft` on the
 * slip's corner stops:
 *
 *   alpha   light lav / vio      dark lav / vio
 *   0.09    4.68 / 4.51          5.10 / 5.38     ← what every mount ships
 *   0.13    4.44 / 4.28          4.65 / 4.91
 *
 * 0.09 is the last step clearing AA on both stops in both themes; don't raise it.
 */
export function CovenCat({ size, style }: { size: number; style?: CSSProperties }) {
  return (
    <svg
      className="cvn-wheel"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      style={{ position: "absolute", zIndex: 0, pointerEvents: "none", ...style }}
    >
      {CAT.map(([d, width]) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke={DEEP}
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

/** `[path, stroke-width]`, in draw order. See {@link CovenCat}. */
const CAT: ReadonlyArray<readonly [string, number]> = [
  ["M50 24 C68 24 80 37 80 52 C80 70 66 82 50 82 C34 82 20 70 20 52 C20 37 32 24 50 24 Z", 2.2],
  ["M28 31 L25 10 L44 23", 1.9],
  ["M72 31 L75 10 L56 23", 1.9],
  ["M38 47 L38 55", 1.9],
  ["M62 47 L62 55", 1.9],
  ["M50 60 L46 64 M50 60 L54 64 M50 60 L50 67", 1.9],
  ["M21 57 L3 52 M21 63 L3 67 M79 57 L97 52 M79 63 L97 67", 1.9],
];

/** Initials for a name with no uploaded portrait — two letters at most. */
export function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "·"
  );
}

/** A portrait filling a medallion's field, cropped square-to-circle. */
const PORTRAIT: CSSProperties = {
  display: "block",
  width: "100%",
  height: "100%",
  borderRadius: "50%",
  objectFit: "cover",
};

/**
 * One member's disc: a 2px gradient ring (pink→deep for coven, lavender→violet for
 * `guest`) round the portrait, or the monogram as fallback (#2226). The ring is the
 * outer span's background through its 2px padding, so it dresses either.
 */
export function SlipAvatar({
  name,
  size,
  kin = "coven",
  avatarUrl,
}: {
  name: string;
  size: number;
  kin?: "coven" | "guest";
  /** The member's portrait. Empty/absent falls back to the monogram. */
  avatarUrl?: string | null;
}) {
  return (
    <span
      aria-hidden
      style={{
        display: "block",
        width: size,
        height: size,
        borderRadius: "50%",
        flex: "0 0 auto",
        boxSizing: "border-box",
        // eslint-disable-next-line local/no-raw-style-values -- ornament: the drawn ring's stroke width.
        padding: 2,
        background:
          kin === "guest"
            ? "linear-gradient(150deg, var(--faction-coven-slip-lav), var(--faction-coven-slip-vio))"
            : `linear-gradient(150deg, ${PINK}, ${DEEP})`,
      }}
    >
      {avatarUrl ? (
        <img alt="" src={mediaUrl(avatarUrl)} style={PORTRAIT} />
      ) : (
        <span
          className="flex items-center justify-center"
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            background: CARD,
            fontFamily: READING,
            // ornament: sized to the disc, not the type scale (§4a).
            fontSize: Math.round(size * 0.42),
            color: DEEP,
          }}
        >
          {initialsOf(name)}
        </span>
      )}
    </span>
  );
}
