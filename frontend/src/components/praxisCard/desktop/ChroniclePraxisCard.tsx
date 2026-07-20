import { AdminOverlay } from "../shared";
import { PraxisBody, frameBase, type ArchetypeProps } from "./shared";

/**
 * The CHRONICLE frame (#821). A bound almanac leaf: a gradient running-head band
 * over a sheet ruled in the faction's accent.
 *
 * The chronicle is Warriors of Whimsy's aesthetic — cream, gold and plum
 * (ADR-0050). Cozy Coven also renders through this structure, but wearing the
 * pink marker sticker's tokens since #838; that pairing is temporary and #840
 * replaces it with a sticker archetype. Never mix the two palettes. Frame
 * pixel-fidelity vs. the prototype is flagged for human QA.
 */
export interface ChronicleTheme {
  /** Vellum sheet colour (also the Task Crown inner disc). */
  bg: string;
  /** Primary ink. */
  ink: string;
  /** Muted / secondary text. */
  muted: string;
  /** Accent — border, ruled hairline, score stamp. */
  accent: string;
  /** Running-head gradient stops + its text colour. */
  headerFrom: string;
  headerTo: string;
  headerText: string;
  /** Drop-shadow colour. */
  shadow: string;
  titleFont: string;
  bodyFont: string;
}

export function ChroniclePraxisCard({
  praxis,
  adminProps,
  showCrown,
  masthead,
  device,
  theme,
}: ArchetypeProps & {
  masthead: string;
  /** A small signature glyph shown left of the masthead in the running head. */
  device: string;
  theme: ChronicleTheme;
}) {
  return (
    <div
      style={{
        ...frameBase,
        borderRadius: 9, // chronicle parchment
        position: "relative",
        overflow: "hidden",
        background: theme.bg,
        color: theme.ink,
        border: `2px solid ${theme.accent}`,
        boxShadow: `0 12px 26px -12px ${theme.shadow}`,
        fontFamily: theme.bodyFont,
        transition: "background 150ms, color 150ms",
      }}
    >
      {/* running head — gradient band with a signature device + masthead */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-sm)",
          padding: "var(--space-sm) var(--space-xl)",
          background: `linear-gradient(90deg, ${theme.headerFrom}, ${theme.headerTo})`,
          color: theme.headerText,
          fontFamily: theme.titleFont,
          fontSize: "var(--text-xs)",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
        }}
      >
        {/* eslint-disable-next-line local/no-raw-style-values -- ornament: signature dingbat sized as a glyph, not read as text */}
        <span aria-hidden style={{ fontSize: 15, lineHeight: 1 }}>
          {device}
        </span>
        {masthead}
      </div>
      <div style={{ padding: "var(--space-xl)" }}>
        <AdminOverlay {...adminProps} />
        <PraxisBody
          praxis={praxis}
          tint={theme.accent}
          muted={theme.muted}
          paper={theme.bg}
          titleStyle={{ fontFamily: theme.titleFont, color: theme.ink }}
          showCrown={showCrown}
        />
      </div>
    </div>
  );
}

export default ChroniclePraxisCard;
