import { useTranslation } from "react-i18next";
import { factionCssVar } from "../../../utils/factions";
import { AdminOverlay } from "../shared";
import { PraxisBody, frameBase, type ArchetypeProps } from "./shared";

/**
 * UA — Gilt salon placard, filed. A gold-framed acquisition plate: gilt-leaf
 * gradient border, parchment ground with a faint dotted tooth, an engraved
 * "Acquisition · filed" regalia line. Matches the UA praxis-read sheet, UaVote,
 * and the DS FactionPraxisCard reference. All colors via --ua-* tokens.
 */
export function UaPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  const { t } = useTranslation("praxis");
  return (
    // Gilt frame: gold-leaf gradient border, then the parchment plate.
    <div
      style={{
        ...frameBase,
        borderRadius: 7, // ensō salon sheet
        padding: "var(--space-xs)",
        background: "var(--ua-gilt)",
        boxShadow:
          "0 12px 26px color-mix(in srgb, var(--ua-ink) 22%, transparent), inset 0 0 0 1px color-mix(in srgb, white 45%, transparent)",
      }}
    >
      <div
        style={{
          position: "relative",
          background: factionCssVar("ua", "card-bg"),
          border: "2px solid color-mix(in srgb, var(--ua-ink) 30%, transparent)",
          borderRadius: 4,
          padding: "var(--space-xl)",
          fontFamily: "var(--faction-ua-body-font)",
          color: factionCssVar("ua", "card-text"),
          backgroundImage:
            "radial-gradient(color-mix(in srgb, var(--ua-ink) 4%, transparent) 1px, transparent 1px)",
          backgroundSize: "5px 5px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--faction-ua-body-font)",
            fontSize: "var(--text-xs)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: factionCssVar("ua", "card-accent"),
            marginBottom: "var(--space-sm)",
          }}
        >
          {t("card.masthead.ua")}
        </div>
        <AdminOverlay {...adminProps} />
        <PraxisBody
          praxis={praxis}
          tint={factionCssVar("ua", "card-accent")}
          muted={factionCssVar("ua", "card-muted")}
          paper={factionCssVar("ua", "card-bg")}
          titleStyle={{ fontFamily: "var(--faction-ua-card-font)", fontStyle: "italic" }}
          showCrown={showCrown}
        />
      </div>
    </div>
  );
}

export default UaPraxisCard;
