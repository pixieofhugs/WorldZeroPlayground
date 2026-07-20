import { useTranslation } from "react-i18next";
import { EphemeristsSigil, Foxing } from "../../cards/ephemeristsAtoms";
import { AdminOverlay } from "../shared";
import { PraxisBody, frameBase, type ArchetypeProps } from "./shared";

/**
 * The Ephemerists (ephemerists slug) — a sealed ephemeris entry. A foxed vellum
 * leaf with a lapis-ruled running head, the sigil, and rubric-accented text.
 */
export function EphemeristsPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  const { t } = useTranslation("praxis");
  return (
    <div
      style={{
        position: "relative",
        ...frameBase,
        overflow: "hidden",
        background: "var(--eph-vellum)",
        color: "var(--eph-vellum-text)",
        border: "2px solid color-mix(in srgb, var(--eph-vellum-text) 30%, transparent)",
        fontFamily: "var(--eph-serif)",
        boxShadow: "0 1px 0 rgba(0,0,0,0.04), 0 8px 20px -16px rgba(0,0,0,0.6)",
        transition: "background 150ms, color 150ms",
      }}
    >
      <Foxing opacity={0.4} />
      {/* running head — sigil + ephemeris label, lapis-ruled */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          gap: "var(--space-sm)",
          padding: "var(--space-sm) var(--space-lg) var(--space-sm)",
          borderBottom: "1px solid var(--eph-gold-deep)",
          boxShadow: "0 2px 0 -1px color-mix(in srgb, var(--eph-lapis) 55%, transparent)",
        }}
      >
        <EphemeristsSigil size={13} color="var(--eph-lapis)" />
        <span
          style={{
            fontFamily: "var(--eph-serif)",
            fontSize: "var(--text-xs)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--eph-rubric)",
          }}
        >
          {t("card.masthead.ephemerists")}
        </span>
      </div>
      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: "var(--space-md) var(--space-xl) var(--space-xl)",
        }}
      >
        <AdminOverlay {...adminProps} />
        <PraxisBody
          praxis={praxis}
          tint="var(--eph-rubric)"
          muted="var(--eph-muted)"
          paper="var(--eph-vellum)"
          titleStyle={{ fontFamily: "var(--eph-display)", color: "var(--eph-vellum-text)" }}
          showCrown={showCrown}
        />
      </div>
    </div>
  );
}

export default EphemeristsPraxisCard;
