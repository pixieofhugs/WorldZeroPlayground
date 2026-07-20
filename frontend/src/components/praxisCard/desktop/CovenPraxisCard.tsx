import { useTranslation } from "react-i18next";
import { factionCssVar } from "../../../utils/factions";
import ChroniclePraxisCard from "./ChroniclePraxisCard";
import type { ArchetypeProps } from "./shared";

/** Cozy Coven — the gold/plum chronicle (moon-phase vote widget). */
export function CovenPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  const { t } = useTranslation("praxis");
  return (
    <ChroniclePraxisCard
      praxis={praxis}
      adminProps={adminProps}
      showCrown={showCrown}
      masthead={t("card.masthead.coven")}
      device="☾"
      theme={{
        bg: "var(--faction-coven-chronicle-bg)",
        ink: factionCssVar("coven", "card-text"),
        muted: factionCssVar("coven", "card-muted"),
        accent: "var(--faction-coven-chronicle-plum)",
        headerFrom: "var(--faction-coven-chronicle-header-from)",
        headerTo: "var(--faction-coven-chronicle-header-to)",
        headerText: "var(--faction-coven-chronicle-header-text)",
        shadow: "var(--faction-coven-chronicle-shadow)",
        titleFont: "var(--font-faction-script)",
        bodyFont: "'EB Garamond', serif",
      }}
    />
  );
}

export default CovenPraxisCard;
