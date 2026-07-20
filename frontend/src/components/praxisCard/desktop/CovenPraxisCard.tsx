import { useTranslation } from "react-i18next";
import { factionCssVar } from "../../../utils/factions";
import ChroniclePraxisCard from "./ChroniclePraxisCard";
import type { ArchetypeProps } from "./shared";

/**
 * Cozy Coven — pink, with the ☾ device and the moon-phase vote widget. The
 * gold/plum chronicle it wore was WOW's (#838 / ADR-0050); the tokens below are
 * now the pink sticker's, rendered through the shared chronicle STRUCTURE until
 * #840 rebuilds the surface as a marker sticker.
 */
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
        accent: "var(--faction-coven-chronicle-accent)",
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
