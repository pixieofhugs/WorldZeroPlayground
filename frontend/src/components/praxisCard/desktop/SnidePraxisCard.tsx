import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { factionCssVar } from "../../../utils/factions";
import SnideMasthead from "../../cards/SnideMasthead";
import { AdminOverlay } from "../shared";
import { PraxisBody, frameBase, type ArchetypeProps } from "./shared";

const SNIDE_TORN_CLIP =
  "polygon(0% 0%, 4% 100%, 8% 20%, 12% 90%, 16% 10%, 20% 80%, 24% 0%, 28% 100%, 32% 15%, 36% 85%, 40% 5%, 44% 95%, 48% 20%, 52% 80%, 56% 0%, 60% 100%, 64% 15%, 68% 90%, 72% 5%, 76% 85%, 80% 0%, 84% 100%, 88% 20%, 92% 80%, 96% 10%, 100% 0%)";

/** The torn top/bottom edges of the Snide scrap. Static (#586). */
const snideTornBase: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  height: 6,
  background: "var(--color-bg-page)",
  clipPath: SNIDE_TORN_CLIP,
};
const snideTornTop: CSSProperties = { ...snideTornBase, top: -1 };
const snideTornBottom: CSSProperties = { ...snideTornBase, bottom: -1 };

export function SnidePraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  const { t } = useTranslation("praxis");
  return (
    <div
      style={{
        ...frameBase,
        background: factionCssVar("snide", "card-bg"),
        position: "relative",
        padding: "var(--space-lg)",
        fontFamily: "'Special Elite', serif",
        color: factionCssVar("snide", "card-text"),
        transition: "background 150ms, color 150ms",
      }}
    >
      <div style={snideTornTop} />
      <div style={snideTornBottom} />
      <div className="snide-tape" style={{ top: -10, left: 22, transform: "rotate(-8deg)" }} />
      <SnideMasthead subtitle={t("card.masthead.snide")} />
      <AdminOverlay {...adminProps} />
      <PraxisBody
        praxis={praxis}
        tint={factionCssVar("snide", "card-accent")}
        muted={factionCssVar("snide", "card-muted")}
        paper={factionCssVar("snide", "card-bg")}
        showCrown={showCrown}
      />
    </div>
  );
}

export default SnidePraxisCard;
