import { AdminOverlay } from "../shared";
import {
  factionSpectrumSheet,
} from "../../../utils/factions";
import { factionRoleVars } from "../../../utils/factionRoles";
import { PraxisBody, frameBase, type ArchetypeProps } from "./shared";

/**
 * The unaffiliated card — a plain cream sheet (#842, ADR-0039), and the fallback
 * for any faction without an archetype. Restraint: the rainbow appears only in
 * the score box (`DefaultScoreStamp`), the vote divider, and the border.
 * No running head (#1701): the title is read first.
 *
 * The 3px spectrum border matches `DefaultTaskCard` for every player (#2499,
 * owner ruling). Composed via {@link factionSpectrumSheet} because the ramp must
 * join all three sheet lists (image, blend, clip) or Albescent's dark prism
 * gets the wrong blend mode.
 */
export function DefaultPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  return (
    <div
      style={{
        // Role map (#2672), PINNED to na: the ground is slug-blind, and ink may
        // not leave a ground that can't follow it (#2361). So this is `{}`; the
        // prefix lets a host dress the surface by name.
        ...factionRoleVars("na", "na-praxis-card"),
        ...frameBase,
        position: "relative",
        borderRadius: 10, // plain cream sheet
        border: "3px solid transparent",
        ...factionSpectrumSheet(),
        color: "var(--na-praxis-card-ink)",
        boxShadow: "0 3px 14px var(--color-cast-shadow-soft)",
        padding: "var(--space-xl) var(--space-xl) var(--space-lg)",
      }}
    >
      <AdminOverlay {...adminProps} />
      <PraxisBody
        praxis={praxis}
        tint="var(--na-praxis-card-accent)"
        muted="var(--na-praxis-card-quiet)"
        paper="var(--na-praxis-card-paper)"
        showCrown={showCrown}
        // The quiet sheet keeps the house body face on purpose (#888).
        fonts={{
          display: "var(--na-praxis-card-face)",
          body: "var(--font-body)",
        }}
        titleStyle={{
          fontFamily: "var(--na-praxis-card-face)",
          letterSpacing: "0.02em",
          lineHeight: 1,
          color: "var(--na-praxis-card-ink)",
        }}
        voteRule={
          <div
            aria-hidden
            className="spectrum-rule"
            style={{
              height: 2,
              // Between the design's light (0.4) and dark (0.5): no `dark ?` branch.
              opacity: 0.45,
              margin: "var(--space-lg) 0 var(--space-md)",
            }}
          />
        }
      />
    </div>
  );
}

export default DefaultPraxisCard;
