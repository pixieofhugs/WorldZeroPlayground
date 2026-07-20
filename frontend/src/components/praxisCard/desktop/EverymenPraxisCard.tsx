import type { CSSProperties } from "react";
import { factionCssVar } from "../../../utils/factions";
import { AdminOverlay } from "../shared";
import { PraxisBody, frameBase, type ArchetypeProps } from "./shared";

/** The red margin rule down the Everymen ruled sheet. Static (#586). */
const everymenMarginRule: CSSProperties = {
  position: "absolute",
  left: 22,
  top: 0,
  bottom: 0,
  width: 1,
  background: "rgba(220,80,80,0.2)",
};

export function EverymenPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  return (
    <div
      style={{
        ...frameBase,
        borderRadius: 2, // broadsheet — near-square
        background: factionCssVar("everymen", "card-bg"),
        border: "2px solid var(--color-border)",
        clipPath:
          "polygon(0 0, 100% 0, 100% 90%, 92% 100%, 80% 95%, 68% 100%, 56% 93%, 44% 100%, 32% 94%, 20% 100%, 8% 94%, 0 100%)",
        position: "relative",
        padding: "var(--space-xl) var(--space-xl) var(--space-2xl) var(--space-2xl)",
        fontFamily: "'Special Elite', serif",
        color: factionCssVar("everymen", "card-text"),
        backgroundImage:
          "repeating-linear-gradient(to bottom, transparent, transparent 17px, rgba(100,140,200,0.08) 17px, rgba(100,140,200,0.08) 18px)",
        transition: "background 150ms, color 150ms",
      }}
    >
      <div style={everymenMarginRule} />
      <AdminOverlay {...adminProps} />
      <PraxisBody
        praxis={praxis}
        tint={factionCssVar("everymen", "card-accent")}
        muted={factionCssVar("everymen", "card-muted")}
        paper={factionCssVar("everymen", "card-bg")}
        showCrown={showCrown}
      />
    </div>
  );
}

export default EverymenPraxisCard;
