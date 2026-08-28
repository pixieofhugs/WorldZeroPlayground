import type { CSSProperties } from "react";
import i18n from "../../i18n";

/**
 * TaskCrown — the one praxis mark (ADR-0028, amended by ADR-0054).
 *
 * A rainbow medallion with a fleur-de-lis glyph, worn by the top-scoring
 * SUBMITTED praxis for its task (`is_top_for_task`, computed live server-side;
 * ties are co-champions, a sole entrant is crowned by default). It replaces the
 * retired cross-task "Faction Distinction Laurel" — same medallion chrome, new
 * glyph, new meaning.
 *
 * ONE canonical look on every faction card (ADR-0054 supersedes ADR-0028's
 * per-card recolour): the inner disc (--fdl-disc) + glyph (--fdl-glyph) are
 * theme-aware tokens — identical on every faction, adapting only to light vs
 * dark mode. Callers no longer pass disc/glyph colours; that is the point, so
 * the "one praxis mark" reads as one mark.
 *
 * The ring reads --fdl-ring: the same seam-closed smooth conic cut (#1213,
 * ADR-0066), but theme-INVARIANT — it carries the BRIGHT (dark-theme) hues in
 * both themes (#2134). It composed --faction-default-rainbow-conic until then,
 * and that token's seven stops flip: the light seven are darkened so the
 * spectrum stays legible as ink and under text on white, a duty this 4px
 * ornamental rim does not share, so in light mode it read as one muddy band.
 * ADR-0054's "fixed brand constant in both themes" clause is therefore restored
 * for this one mark, and #1219 stands everywhere else. The disc and the glyph
 * still flip; only the ring stopped.
 */
interface TaskCrownProps {
  /** Overall medallion diameter, px. */
  size?: number;
  /** Ring inset from the edge, px (the coloured rainbow band width). */
  ringInset?: number;
  /** Optional rotation, e.g. "-8deg". */
  rotate?: string;
  /** Optional drop-shadow filter string. */
  shadow?: string;
  style?: CSSProperties;
}

export function TaskCrown({
  size = 44,
  ringInset = 4,
  rotate,
  shadow,
  style,
}: TaskCrownProps) {
  const glyph = Math.round(size * 0.46);
  return (
    <span
      title={i18n.t("feed:taskCrown.title")}
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
          background: "var(--fdl-ring)",
          // Both rims are a percentage of the mark's OWN ink (#1609). They were
          // fixed blacks on two discs that flip — `--fdl-disc` goes #faf6ee ->
          // #1a1712 — so in dark the inner rim was black on near-black and did
          // nothing. `--fdl-glyph` is the twin that flips the other way
          // (#1a1209 -> #f0e6d0), which is what a rim wants.
          boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--fdl-glyph) 20%, transparent)",
        }}
      />
      <span
        style={{
          position: "absolute",
          inset: ringInset,
          borderRadius: "50%",
          background: "var(--fdl-disc)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--fdl-glyph) 12%, transparent)",
        }}
      >
        {/* Fleur-de-lis: central lance, two out-curling arms, band, foot + side feet. */}
        <svg
          viewBox="0 0 40 48"
          width={glyph * (40 / 48)}
          height={glyph}
          style={{ display: "block", color: "var(--fdl-glyph)" }}
          aria-hidden="true"
        >
          <g fill="currentColor">
            <path d="M20 1 C15.5 9 15.5 18 20 27 C24.5 18 24.5 9 20 1 Z" />
            <path d="M17.5 25 C11 15 1.5 17 2.5 25.5 C3.3 31.8 10.8 33.4 15.4 29.4 C10 29 9.5 23.5 17.5 25 Z" />
            <path d="M22.5 25 C29 15 38.5 17 37.5 25.5 C36.7 31.8 29.2 33.4 24.6 29.4 C30 29 30.5 23.5 22.5 25 Z" />
            <rect x="12.5" y="29" width="15" height="4.5" rx="2.2" />
            <path d="M20 33.5 C16.5 39.5 16 43.5 20 47.5 C24 43.5 23.5 39.5 20 33.5 Z" />
            <path d="M16 33.5 C12 36 9.5 40 12.5 43.5 C13.6 39.5 15.3 37.2 17.6 35.6 Z" />
            <path d="M24 33.5 C28 36 30.5 40 27.5 43.5 C26.4 39.5 24.7 37.2 22.4 35.6 Z" />
          </g>
        </svg>
      </span>
    </span>
  );
}
