import { useTranslation } from "react-i18next";
import DefaultSigil from "../../cards/DefaultSigil";
import { AdminOverlay } from "../shared";
import { PraxisBody, frameBase, type ArchetypeProps } from "./shared";

/**
 * Fallback praxis card for `na` / unaffiliated + any task faction without a
 * bespoke archetype — the SPECTRUM card (#820, ADR-0039). A clean sheet wrapped
 * in the community-rainbow band and marked with the seven-segment ring, holding
 * the conditional score stamp (ADR-0047) and the empty-media drop target. No
 * longer borrows the task faction's costume. All colours via --faction-default-*
 * / --spectrum-* tokens; flips light/dark through the [data-theme] cascade.
 */
export function DefaultPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  const { t } = useTranslation("praxis");
  return (
    // Spectrum band → clean inner sheet.
    <div
      style={{
        ...frameBase,
        borderRadius: 10, // plain cream sheet
        padding: "var(--space-xs)",
        background: "var(--faction-default-rainbow)",
        boxShadow: "0 12px 26px -14px color-mix(in srgb, black 40%, transparent)",
      }}
    >
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          background: "var(--faction-default-card-bg)",
          color: "var(--faction-default-card-text)",
          borderRadius: 4,
          padding: "var(--space-xl)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-sm)",
            marginBottom: "var(--space-md)",
            fontFamily: "'Courier Prime', monospace",
            fontSize: "var(--text-xs)",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--faction-default-card-muted)",
          }}
        >
          <DefaultSigil size={22} /> {t("card.masthead.default")}
        </div>
        <AdminOverlay {...adminProps} />
        <PraxisBody
          praxis={praxis}
          tint="var(--faction-default-card-accent)"
          muted="var(--faction-default-card-muted)"
          paper="var(--faction-default-card-bg)"
          showCrown={showCrown}
        />
      </div>
    </div>
  );
}

export default DefaultPraxisCard;
