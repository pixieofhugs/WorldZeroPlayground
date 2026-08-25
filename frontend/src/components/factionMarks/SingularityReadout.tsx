import type { CSSProperties } from "react";
import { factionRoleVars } from "../../utils/factionRoles";

/**
 * The lit well — Singularity's points mark (#2042, ADR-0049).
 *
 * A figure in a darker well ruled in cyan, with its unit stencilled beside it.
 * index.css already calls this object "the singularity points well" in the
 * contrast manifest, which is the tell that it is the faction's device rather
 * than one card's layout: Singularity has no drawn sigil for a total, so the
 * READ-OUT is the mark.
 *
 * IT IS A SHARED MARK, BY OWNER RULING (#2042). Singularity drew it twice — the
 * task card's points well and the praxis-card score stamp's `TOTAL` line, the
 * latter as a bare glowing numeral with no well around it. The ruling is that the
 * point card reflects the card's total look, so this one is canonical and both
 * surfaces mount it. `valueSize` is a prop because the two draw at different
 * scales, and `live` is a prop because only one of them earns the caret.
 *
 * THE WELL BRINGS ITS OWN GROUND, and that is the whole reason the pairing
 * survives the move. A mark drawn for a card and dropped onto a score stamp
 * normally lands on a different ground and has to be re-measured against it
 * (#2042); here the ink never leaves `--faction-singularity-term-readout`, so
 * the card's measurement IS the stamp's:
 *
 *   figure `-term-blue-bright` on `-term-readout`  4.68:1 light · 9.50:1 dark
 *   unit   `-term-blue`        on `-term-readout`  4.58:1 light · 6.74:1 dark
 *
 * What the move DOES change is how much the well stands off what it sits on:
 * 1.16:1 against the stamp's `-stamp-bg` plate, where on the card it is 1.10:1
 * against the `-term-bg` chassis. The fill was never the edge on either surface —
 * the 1px cyan rule is — so the well reads on the stamp exactly as loudly as it
 * already reads on the card.
 *
 * ALWAYS DARK IN BOTH THEMES, like the chassis it was drawn on
 * (`SingularityTaskCard`, WORLD_ZERO_STYLE §6): every value is a token and what
 * the `[data-theme="dark"]` cascade flips is the phosphor, never a ternary here.
 */

const MONO = "var(--sg-readout-face)"; /* Share Tech Mono */

export interface SingularityReadoutProps {
  /**
   * The figure. Pre-formatted by the caller — the task card prints an integer
   * point value and the stamp prints `formatPoints(total)`, and neither
   * formatting rule belongs to a drawing.
   */
  value: string | number;
  /** The unit stencilled beside the figure. Omit where a label already names it. */
  unit?: string;
  /**
   * The figure's tier. A `--text-*` token, never a raw px: the numeral is type,
   * and the well is the geometry that yields to it (§4a). The card passes its
   * form factor's points size; the stamp passes `--text-title`.
   */
  valueSize?: string;
  /**
   * The machine is still holding the line open — a blinking block cursor after
   * the figure and a soft halo under it. The score stamp's signature, and only
   * the score stamp's: on the task card the cursor already trails the sign-up
   * prompt, and a second one in the same card would read as two prompts.
   *
   * ONE PROP FOR BOTH, deliberately. They are one idea and no surface has ever
   * wanted the halo without the caret; splitting them would be a knob for a
   * caller that does not exist.
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
        ...factionRoleVars("singularity", "sg-readout"),
        display: "inline-flex",
        alignItems: "baseline",
        gap: "var(--space-xs)",
        flexShrink: 0,
        boxSizing: "border-box",
        padding: "var(--space-sm) var(--space-md)",
        background: "var(--faction-singularity-term-readout)",
        border: "1px solid var(--faction-singularity-term-border)",
        // Ornament geometry — the well's drawn corner, not a rung of a scale.
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
        {/* `.sg-cursor` carries the reduced-motion-guarded blink; stilled it
            stays drawn, because it is punctuation on the line rather than an
            indicator of anything. */}
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
