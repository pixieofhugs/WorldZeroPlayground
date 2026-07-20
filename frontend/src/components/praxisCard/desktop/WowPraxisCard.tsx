import { useTranslation } from "react-i18next";
import { factionCssVar } from "../../../utils/factions";
import ChroniclePraxisCard from "./ChroniclePraxisCard";
import type { ArchetypeProps } from "./shared";

/**
 * Warriors of Whimsy — the CHRONICLE OF PROOF (#821, #812): cream parchment, a
 * gold frame, plum ink, the ✦ device and the googly-balloon verdict. This is
 * WOW's own aesthetic, not a recolour of Coven's — #838 repointed the tokens
 * after ADR-0050 found the two factions wearing each other's identity.
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
