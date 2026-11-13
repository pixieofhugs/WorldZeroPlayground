import type { CSSProperties } from "react";
import { factionRoleVars } from "../../utils/factionRoles";
import { factionBodyVars } from "../../utils/factionBodyFace";

/**
 * The lit well — Singularity's points mark (#2042, ADR-0049). Shared by owner
 * ruling: the task card's points well and the score stamp's total both mount
 * it. The well brings its own ground, so the card's contrast holds anywhere:
 *
 *   figure `-term-blue-bright` on `-term-readout`  4.68:1 light · 9.50:1 dark
 *   unit   `-term-blue`        on `-term-readout`  4.58:1 light · 6.74:1 dark
 *
 * Its edge is the 1px cyan rule, not the fill. Always dark in both themes.
 */

const MONO = "var(--sg-readout-face)"; /* Share Tech Mono */

interface SingularityReadoutProps {
  /** Pre-formatted by the caller. */
  value: string | number;
  /** Omit where a label already names it. */
  unit?: string;
  /** A `--text-*` token, never raw px (§4a). */
  valueSize?: string;
  /**
   * Blinking cursor + halo; score stamp only (the task card already has a
   * cursor on its sign-up prompt).
   */
  live?: boolean;
  style?: CSSProperties;
}

export default function SingularityReadout({
  value,
  unit,
  valueSize = "var(--text-heading)",
  live = false,
  style,
}: SingularityReadoutProps) {
  return (
    <span
      style={{
        ...factionBodyVars("singularity"), ...factionRoleVars("singularity", "sg-readout"),
        display: "inline-flex",
        alignItems: "baseline",
        gap: "var(--space-xs)",
        flexShrink: 0,
        boxSizing: "border-box",
        padding: "var(--space-sm) var(--space-md)",
        background: "var(--faction-singularity-term-readout)",
        border: "1px solid var(--faction-singularity-term-border)",
        // Ornament geometry.
        borderRadius: 5,
        ...style,
      }}
    >
      <span
        style={{
          fontFamily: MONO,
          fontSize: valueSize,
          lineHeight: 0.85,
          color: "var(--faction-singularity-term-blue-bright)",
          whiteSpace: "nowrap",
          ...(live ? { textShadow: "0 0 8px var(--faction-singularity-total-glow)" } : {}),
        }}
      >
        {value}
        {/* `.sg-cursor`: reduced-motion-guarded blink; stays drawn when still. */}
        {live && (
          <span aria-hidden className="sg-cursor">
            _
          </span>
        )}
      </span>
      {unit && (
        <span
          style={{
            fontFamily: MONO,
            fontSize: "var(--text-base)",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--faction-singularity-term-blue)",
            whiteSpace: "nowrap",
          }}
        >
          {unit}
        </span>
      )}
    </span>
  );
}
