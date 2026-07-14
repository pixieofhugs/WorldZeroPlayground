import { useId } from "react";
import i18n from "../../i18n";

/**
 * Shared UA (University of Asthmatics) heraldic atoms — the gilt-salon crest
 * and motto ribbon that are the faction's locked identity.
 *
 * Extracted from UAFactionHero so the crest is drawn once and dropped into
 * every UA surface that carries it (faction hero, task card, edit-praxis
 * masthead + commission slip) rather than re-drawn per file. All colors via
 * --ua-* tokens (never hardcode hex — CLAUDE.md); the salon is always-light,
 * so tokens read identically in both themes.
 */


/** Heraldic crest — a shield with a rising sun and crossed brushes. */
export function UACrest({ width, height }: { width: number; height: number }) {
  // Unique clip id per instance — the shield is rendered many times per page
  // (a card list, the hero, twice in edit-praxis); a shared literal id would
  // be invalid SVG and risk cross-instance clipping.
  const clipId = useId();
  const shield = "M8 6 H92 V60 C92 92 66 108 50 116 C34 108 8 92 8 60 Z";
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 100 120"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={shield} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect x="0" y="0" width="100" height="120" fill="var(--ua-orange)" />
        <rect x="0" y="60" width="100" height="60" fill="var(--ua-paper-warm)" />
        <circle cx="50" cy="60" r="15" fill="var(--ua-gold-lt)" />
        <g stroke="var(--ua-gold-lt)" strokeWidth="2.4" strokeLinecap="round">
          <line x1="50" y1="60" x2="50" y2="20" />
          <line x1="50" y1="60" x2="22" y2="30" />
          <line x1="50" y1="60" x2="78" y2="30" />
          <line x1="50" y1="60" x2="14" y2="48" />
          <line x1="50" y1="60" x2="86" y2="48" />
          <line x1="50" y1="60" x2="34" y2="22" />
          <line x1="50" y1="60" x2="66" y2="22" />
        </g>
        <g transform="translate(50 84)">
          <g transform="rotate(38)">
            <rect x="-2" y="-30" width="4" height="44" rx="1.5" fill="var(--ua-ink)" />
            <rect x="-3" y="10" width="6" height="6" fill="var(--ua-gold-pale)" />
            <path d="M-3 16 L3 16 L1.5 26 L-1.5 26 Z" fill="var(--ua-orange)" />
          </g>
          <g transform="rotate(-38)">
            <rect x="-2" y="-30" width="4" height="44" rx="1.5" fill="var(--ua-gold)" />
            <rect x="-3" y="10" width="6" height="6" fill="var(--ua-gold-pale)" />
            <path d="M-3 16 L3 16 L1.5 26 L-1.5 26 Z" fill="var(--ua-gold-lt)" />
          </g>
        </g>
      </g>
      <path d={shield} fill="none" stroke="var(--ua-gold-lt)" strokeWidth="2.5" />
      <path d={shield} fill="none" stroke="var(--ua-ink)" strokeWidth="0.8" />
    </svg>
  );
}

/** The motto cartouche — a burnt-amber ribbon with notched ends. */
export function MottoRibbon({
  fontSize = 11,
  padding = "5px 26px",
}: {
  fontSize?: number;
  padding?: string;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: "fit-content",
        background: "var(--ua-orange)",
        color: "var(--ua-paper-warm)",
        fontFamily: '"Marcellus", Georgia, serif',
        fontSize,
        letterSpacing: "0.1em",
        padding,
        clipPath: "polygon(0 0,100% 0,96% 50%,100% 100%,0 100%,4% 50%)",
      }}
    >
      {i18n.t("feed:identity.ua.motto")}
    </div>
  );
}
