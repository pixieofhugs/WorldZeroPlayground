import type { CSSProperties } from "react";
import { useGroundIsBusy } from "../../backdrop/BackdropContext";
import { SingularityBand } from "../../cardMasthead/factionBands";
import { AdminOverlay } from "../shared";
import { PraxisBody, frameBase, type ArchetypeProps } from "./shared";
import { factionRoleVars } from "../../../utils/factionRoles";
import { factionBodyVars } from "../../../utils/factionBodyFace";

/**
 * Singularity — the system slab (#842): near-black glass on a standing raster,
 * green hairline frame, the task card's window-chrome band (#2185), and a cyan
 * scanline sweep. One cursor only, in the score stamp; no sprockets, no corner
 * brackets (#3306). Body ink is pale mint: the phosphor accent burns as text.
 * Both motions are reduced-motion gated in `index.css`.
 */

/** The sweeping scanline. Its `top` and the animation live on `.sg-scan`. */
const scanSweepStyle: CSSProperties = {
  position: "absolute",
  left: "-30%",
  right: "-30%",
  height: 34,
  background: "linear-gradient(transparent, var(--faction-singularity-scan), transparent)",
  pointerEvents: "none",
  zIndex: 1,
};

export function SingularityPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  // On a patterned page ground the raster comes off; the slab goes bare (#2195).
  const groundIsBusy = useGroundIsBusy();
  return (
    <div
      style={{
        ...frameBase,
        /* Card-owned role prefix (#2675): `PraxisBody` is shared, so never `--kit-*`. */
        ...factionBodyVars("singularity"), ...factionRoleVars("singularity", "sg-praxis-card"),
        borderRadius: 8, // terminal slab
        position: "relative",
        overflow: "hidden",
        background: "var(--sg-praxis-card-paper)",
        border: "1px solid var(--faction-singularity-frame)",
        boxShadow: "0 4px 18px var(--color-cast-shadow)",
        /* The kit's one raster (#2394), raw ornament geometry by §4a. */
        backgroundImage: groundIsBusy
          ? undefined
          : "repeating-linear-gradient(0deg, var(--faction-singularity-term-scan) 0 1px, transparent 1px 3px)",
        /* No frame padding: the window chrome is full-bleed (#2185). */
        fontFamily: "var(--font-faction-terminal)",
        color: "var(--faction-singularity-terminal-ink)",
      }}
    >
      <span aria-hidden className="sg-scan" style={scanSweepStyle} />

      {/* `SingularityTaskCard`'s bar (#2185); it replaces this card's own LED bar. */}
      <SingularityBand />

      <div style={{ position: "relative", zIndex: 2, padding: "var(--space-lg)" }}>
        <AdminOverlay {...adminProps} />
        <PraxisBody
          praxis={praxis}
          tint="var(--sg-praxis-card-accent)"
          muted="var(--faction-singularity-phosphor-dim)"
          paper="var(--sg-praxis-card-paper)"
          showCrown={showCrown}
          // One face for both, via the card token (#888).
          fonts={{
            display: "var(--sg-praxis-card-face)",
            body: "var(--sg-praxis-card-face)",
          }}
          titleStyle={{
            fontFamily: "var(--font-faction-terminal)",
            textTransform: "uppercase",
            lineHeight: 1.1,
            color: "var(--faction-singularity-terminal-ink)",
          }}
        />
      </div>
    </div>
  );
}

export default SingularityPraxisCard;
