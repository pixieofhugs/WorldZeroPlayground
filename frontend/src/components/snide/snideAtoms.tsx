/**
 * Shared S.N.I.D.E. craft atoms — the struck-through circle-S sigil reused
 * across SNIDE surfaces (task detail, faction hero). Mirrors
 * components/cards/ephemeristsAtoms.tsx. Colors come from the namespaced
 * --faction-snide-* tokens in index.css. Filter-free (matches the faction's
 * CSS-only craft layers — no SVG feTurbulence).
 */

interface SnideSigilProps {
  size?: number;
  color?: string;
}

/** A sprayed, struck-through circle-S — the defiant SNIDE mark. */
export function SnideSigil({
  size = 48,
  color = "var(--faction-snide-acid)",
}: SnideSigilProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      style={{ display: "block" }}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="19" fill="none" stroke={color} strokeWidth="3" />
      <text
        x="24"
        y="34"
        textAnchor="middle"
        style={{
          fontFamily: "var(--faction-snide-font-impact)",
          // eslint-disable-next-line local/no-raw-style-values -- ornament: sigil letterform drawn into the 48px SVG
          fontSize: 30,
        }}
        fill={color}
      >
        S
      </text>
      <line
        x1="9"
        y1="40"
        x2="39"
        y2="8"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
