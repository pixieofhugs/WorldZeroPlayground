import { useTranslation } from "react-i18next";
import { factionCssVar } from "../../../utils/factions";
import ChroniclePraxisCard from "./ChroniclePraxisCard";
import type { ArchetypeProps } from "./shared";

/**
 * Warriors of Whimsy — the SAME chronicle structure recoloured to WOW yellow
 * (balloon vote widget). WOW's first bespoke skin (#821, #812). Uses only
 * `--faction-wow-*` tokens; deliberately NOT coven's gold/plum.
 */
export function WowPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  const { t } = useTranslation("praxis");
  return (
    <ChroniclePraxisCard
      praxis={praxis}
      adminProps={adminProps}
      showCrown={showCrown}
      masthead={t("card.masthead.wow")}
      device="✦"
      theme={{
        bg: "var(--faction-wow-chronicle-bg)",
        ink: factionCssVar("wow", "card-text"),
        muted: factionCssVar("wow", "card-muted"),
        accent: factionCssVar("wow", "card-accent"),
        headerFrom: "var(--faction-wow-chronicle-header-from)",
        headerTo: "var(--faction-wow-chronicle-header-to)",
        headerText: "var(--faction-wow-chronicle-header-text)",
        shadow: "var(--faction-wow-chronicle-shadow)",
        titleFont: factionCssVar("wow", "card-font"),
        bodyFont: "'EB Garamond', serif",
      }}
    />
  );
}

export default WowPraxisCard;
