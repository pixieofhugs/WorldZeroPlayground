import type { CSSProperties } from "react";

/**
 * Singularity card ornaments that were local to a card file, lifted so the
 * invitation letter (#3294) draws the same ones (one copy). The cards import
 * these back; their markup is unchanged.
 */

/** The little robot idling beside the sign-up key (#2036). Text, aria-hidden at the mount. */
export const SINGULARITY_BOT = "[^-^]\n /|_|\\\n  d b";

/** The viewfinder brackets — ornament geometry, raw px by §4a. */
const bracketRule = "2px solid var(--faction-singularity-bracket)";
const bracketBase: CSSProperties = {
  position: "absolute",
  width: 12,
  height: 12,
  pointerEvents: "none",
  zIndex: 2,
};
const bracketTopLeft: CSSProperties = { ...bracketBase, top: 6, left: 6, borderTop: bracketRule, borderLeft: bracketRule };
const bracketTopRight: CSSProperties = { ...bracketBase, top: 6, right: 6, borderTop: bracketRule, borderRight: bracketRule };
const bracketBottomLeft: CSSProperties = { ...bracketBase, bottom: 6, left: 6, borderBottom: bracketRule, borderLeft: bracketRule };
const bracketBottomRight: CSSProperties = { ...bracketBase, bottom: 6, right: 6, borderBottom: bracketRule, borderRight: bracketRule };

/** The praxis slab's four cyan corner brackets. */
export function SingularityBrackets() {
  return (
    <>
      <span aria-hidden style={bracketTopLeft} />
      <span aria-hidden style={bracketTopRight} />
      <span aria-hidden style={bracketBottomLeft} />
      <span aria-hidden style={bracketBottomRight} />
    </>
  );
}

/**
 * The task card's blue sweep band. `.sg-scan` owns the resting offset and the
 * reduced-motion-guarded travel.
 */
export function SingularitySweep() {
  return (
    <div
      aria-hidden="true"
      className="sg-scan"
      style={{
        position: "absolute",
        left: "-30%",
        right: "-30%",
        height: 34,
        pointerEvents: "none",
        zIndex: 3,
        background: "var(--faction-singularity-term-sweep)",
      }}
    />
  );
}
