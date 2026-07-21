import { useTranslation } from "react-i18next";
import { Lotus } from "../../factionMarks";
import { AdminOverlay } from "../shared";
import { PraxisBody, frameBase, type ArchetypeProps } from "./shared";

/**
 * UA — the vellum sheet, sealed. A single 2px vermilion rule around a parchment
 * ground that runs highlight-to-shadow across the sheet at 158°, with the
 * {@link Lotus} floated off the left edge as a ground watermark and the ensō
 * carrying the total in the right column (see `UaScoreStamp`).
 *
 * WHY THIS CARD IS WARM WHEN THE FACTION IS NOT (#857). UA has two live plans
 * and the owner split them by surface on 2026-07-20: the PRAXIS HANDOFF wins
 * the praxis card; the UA IDENTITY KIT (#788, #848–853) wins every other UA
 * surface. So this card keeps its parchment-and-vermilion salon voice and its
 * ensō even as the rest of UA becomes a sun-bleached, gold-free practice. It is
 * a deliberate exception — do not harmonise it with the kit.
 *
 * What makes the exception survivable is the TOKEN CONTRACT: every colour here
 * resolves from the `--faction-ua-card-*` block minted for this surface, and
 * nothing reads the legacy gilt-salon token family (ua-gold, ua-gilt, ua-ink,
 * ua-paper, ua-line …) that #853 deletes. That is an acceptance gate, not a
 * preference: this file must stay at zero hits for that prefix.
 *
 * The gilt double-frame that used to wrap this card was invented, not designed
 * — the handoff draws ONE border, and #848 took gold out of UA entirely. #839
 * fixed the radius at 7; this slice removed the second frame and the dotted
 * tooth. Do not reintroduce either.
 */
export function UaPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  const { t } = useTranslation("praxis");
  return (
    <div
      style={{
        ...frameBase,
        position: "relative",
        overflow: "hidden",
        borderRadius: 7, // ensō salon sheet
        background: "var(--faction-ua-card-parchment)",
        border: "2px solid var(--faction-ua-card-frame)",
        boxShadow:
          "0 14px 40px -22px color-mix(in srgb, var(--faction-ua-card-text) 50%, transparent)",
        padding: "var(--space-xl) var(--space-xl) var(--space-lg)",
        fontFamily: "var(--faction-ua-body-font)",
        color: "var(--faction-ua-card-text)",
      }}
    >
      {/*
       * The ground watermark: the lotus hangs off the left edge with its centre
       * pulled up onto the sheet. Raw geometry on purpose — an ornament's
       * position is illustration, not layout spacing (§4a). Its opacity is a
       * token so dark mode lifts it through the cascade, never a ternary; the
       * design's `filter: brightness(2)` is folded into the dark ink instead.
       */}
      <Lotus
        size={420}
        color="var(--faction-ua-card-lotus)"
        style={{
          position: "absolute",
          left: -150,
          top: 250,
          transform: "translateY(-50%)",
          opacity: "var(--faction-ua-card-lotus-opacity)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative" }}>
        <AdminOverlay {...adminProps} />
        <PraxisBody
          praxis={praxis}
          tint="var(--faction-ua-card-accent)"
          muted="var(--faction-ua-card-muted)"
          paper="var(--faction-ua-card-bg)"
          titleStyle={{
            fontFamily: "var(--faction-ua-card-font)",
            fontWeight: 600,
            letterSpacing: "-0.01em",
          }}
          showCrown={showCrown}
          eyebrow={
            /*
             * The running head sits INSIDE the text column, above the title, so
             * it stops at the score box rather than running under the ensō —
             * the `eyebrow` slot #841 added for exactly this shape.
             */
            <div
              style={{
                fontFamily: "var(--faction-ua-body-font)",
                fontSize: "var(--text-base)",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--faction-ua-card-muted)",
                marginBottom: "var(--space-sm)",
              }}
            >
              {t("card.masthead.ua")}
            </div>
          }
        />
      </div>
    </div>
  );
}

export default UaPraxisCard;
