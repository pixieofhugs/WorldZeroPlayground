import type { CSSProperties } from "react";

/**
 * FdlLaurel — the Faction Distinction Laurel.
 *
 * The one cross-faction mark: a rainbow medallion with a laurel glyph, awarded
 * to the single highest-scoring praxis on every faction page. The rainbow ring
 * is a fixed brand constant (--fdl-rainbow); each skin only recolours the inner
 * disc (`innerBg`, the card's paper) and the glyph (`glyphColor`, the card's
 * ink) so the laurel sits on its own paper. Albescent passes a monochrome pair.
 *
 * Ported from the faction-page design bundle (lib/FdlLaurel.tsx); hex swapped
 * for the --fdl-rainbow token per repo convention.
 */
export interface FdlLaurelProps {
  /** Overall medallion diameter, px. */
  size?: number;
  /** Fill of the inner disc — pass the card's paper colour (a CSS var). */
  innerBg?: string;
  /** Laurel glyph colour — pass the card's ink colour (a CSS var). */
  glyphColor?: string;
  /** Ring inset from the edge, px (the coloured rainbow band width). */
  ringInset?: number;
  /** Optional rotation, e.g. "-8deg". */
  rotate?: string;
  /** Optional drop-shadow filter string. */
  shadow?: string;
  style?: CSSProperties;
}

export function FdlLaurel({
  size = 44,
  innerBg = "var(--color-bg-card)",
  glyphColor = "var(--color-text-primary)",
  ringInset = 4,
  rotate,
  shadow,
  style,
}: FdlLaurelProps) {
  const glyph = Math.round(size * 0.42);
  return (
    <span
      title="Faction Distinction Laurel — top praxis"
      style={{
        position: "relative",
        display: "inline-block",
        width: size,
        height: size,
        transform: rotate ? `rotate(${rotate})` : undefined,
        filter: shadow,
        ...style,
      }}
    >
      <span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: "var(--fdl-rainbow)",
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,.2)",
        }}
      />
      <span
        style={{
          position: "absolute",
          inset: ringInset,
          borderRadius: "50%",
          background: innerBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,.12)",
        }}
      >
        <svg
          viewBox="0 0 40 48"
          width={glyph * (40 / 48)}
          height={glyph}
          style={{ display: "block", color: glyphColor }}
          aria-hidden="true"
        >
          <g fill="currentColor">
            <path d="M20 1 C16 10 16 17 20 24 C24 17 24 10 20 1 Z" />
            <path d="M20 22 C14 15 8 15 6 21 C4.6 25 8 29 13.5 27.6 C10.5 25 12.5 21 20 22 Z" />
            <path d="M20 22 C26 15 32 15 34 21 C35.4 25 32 29 26.5 27.6 C29.5 25 27.5 21 20 22 Z" />
            <rect x="11" y="26" width="18" height="4.5" rx="2.2" />
            <path d="M20 30 C17.5 37 16 41 20 47 C24 41 22.5 37 20 30 Z" />
          </g>
        </svg>
      </span>
    </span>
  );
}

/** Index of the single top-scoring praxis (first max), or -1 when empty. */
export function topPraxisIndex(scores: number[]): number {
  if (!scores.length) return -1;
  const max = Math.max(...scores);
  return scores.indexOf(max);
}
