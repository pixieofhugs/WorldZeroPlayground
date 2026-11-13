import type { CSSProperties } from "react";
import { factionRoleVars } from "../../../utils/factionRoles";
import { factionBodyVars } from "../../../utils/factionBodyFace";
import { EverymenBand } from "../../cardMasthead/factionBands";
import { useGroundIsBusy } from "../../backdrop/BackdropContext";
import { AdminOverlay } from "../shared";
import { PraxisBody, frameBase, type ArchetypeProps } from "./shared";

/**
 * Everymen — the broadsheet (#841): ruled-off cream newsprint, the shared red
 * masthead band (#2185), a red margin rule, and the tally stamp in the right
 * column. The frame rule is faction ink (`--everymen-frame`), part of the
 * printing. One ornament per faction (#2195/#2393): the burst or a bare sheet,
 * never ledger lines; the margin rule is a single line, not a texture.
 */

/** The frame's ground, and what `PraxisBody` knocks its boxes out of. */
const PAPER = "var(--ev-praxis-paper)";

/** The red margin rule down the sheet. Static (#586). */
const everymenMarginRule: CSSProperties = {
  position: "absolute",
  left: 22,
  top: 0,
  bottom: 0,
  width: 1,
  background: "color-mix(in srgb, var(--everymen-red) 28%, transparent)",
};

export function EverymenPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  const groundIsBusy = useGroundIsBusy();
  return (
    <div
      style={{
        ...frameBase,
        ...factionBodyVars("everymen"), ...factionRoleVars("everymen", "ev-praxis"),
        borderRadius: 2, // broadsheet — near-square
        overflow: "hidden",
        background: PAPER,
        border: "1px solid var(--everymen-frame)",
        boxShadow: "0 3px 14px var(--color-cast-shadow-soft)",
        position: "relative",
        fontFamily: "var(--faction-everymen-body-font)",
        color: "var(--ev-praxis-ink)",
        transition: "background 150ms, color 150ms",
      }}
    >
      {/* Same `.em-burst` as the task card; dropped on a patterned ground. */}
      {!groundIsBusy && <div aria-hidden="true" className="em-burst" />}
      {/* The bill's band, shared with `EverymenTaskCard` (#2185); no cogs (#2029). */}
      <EverymenBand />

      <div
        style={{
          position: "relative",
          padding: "var(--space-lg) var(--space-xl) var(--space-xl) var(--space-2xl)",
        }}
      >
        <div style={everymenMarginRule} />
        <AdminOverlay {...adminProps} />
        <PraxisBody
          praxis={praxis}
          tint="var(--ev-praxis-accent)"
          muted="var(--ev-praxis-quiet)"
          paper={PAPER}
          showCrown={showCrown}
          fonts={{
            display: "var(--ev-praxis-face)",
            body: "var(--faction-everymen-body-font)",
          }}
        />
      </div>
    </div>
  );
}

export default EverymenPraxisCard;
