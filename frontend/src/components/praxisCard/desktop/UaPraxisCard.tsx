import { Lotus } from "../../factionMarks";
import { UaBand } from "../../cardMasthead/factionBands";
import { AdminOverlay } from "../shared";
import { factionRoleVars } from "../../../utils/factionRoles";
import { factionBodyVars } from "../../../utils/factionBodyFace";
import { PraxisBody, frameBase, type ArchetypeProps } from "./shared";

/**
 * UA — the vellum sheet: one 2px vermilion rule, parchment at 158°, the
 * {@link Lotus} watermark off the left edge, the ensō carrying the total
 * (`UaScoreStamp`).
 *
 * Deliberately warm while the rest of UA is gold-free (#857, owner 2026-07-20):
 * the praxis handoff wins this card, the identity kit wins every other surface.
 * Do not harmonise. Every colour is `--faction-ua-card-*`; zero reads of the
 * legacy gilt-salon family #853 deletes is an acceptance gate. One border only,
 * no second gilt frame or dotted tooth.
 */
export function UaPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  return (
    <div
      style={{
        ...frameBase,
        // Role prefix = the manifest key, kebab-cased (#2659/#2673).
        ...factionBodyVars("ua"), ...factionRoleVars("ua", "leaf-praxis-card"),
        position: "relative",
        overflow: "hidden",
        // #2361/#2403.
        borderRadius: "var(--leaf-praxis-card-radius)",
        background: "var(--faction-ua-card-parchment)",
        border: "2px solid var(--faction-ua-card-frame)",
        boxShadow:
          "0 14px 40px -22px color-mix(in srgb, var(--leaf-praxis-card-ink) 50%, transparent)",
        /* No frame padding: the band is full-bleed (#2185). The absolute lotus
           resolves against the padding box, so it does not move. */
        fontFamily: "var(--faction-ua-body-font)",
        color: "var(--leaf-praxis-card-ink)",
      }}
    >
      {/* Ornament position is illustration, not spacing (§4a). Opacity is a
          token so dark mode lifts it through the cascade. */}
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

      {/* `UaTaskCard`'s band (#2185). The ensō stays: it is the score's device. */}
      <UaBand />

      <div style={{ position: "relative", padding: "var(--space-xl) var(--space-xl) var(--space-lg)" }}>
        <AdminOverlay {...adminProps} />
        <PraxisBody
          praxis={praxis}
          tint="var(--leaf-praxis-card-accent)"
          muted="var(--leaf-praxis-card-quiet)"
          paper="var(--leaf-praxis-card-paper)"
          titleStyle={{
            fontFamily: "var(--leaf-praxis-card-face)",
            fontWeight: 600,
            letterSpacing: "-0.01em",
          }}
          showCrown={showCrown}
          fonts={{
            display: "var(--leaf-praxis-card-face)",
            body: "var(--faction-ua-body-font)",
          }}
        />
      </div>
    </div>
  );
}

export default UaPraxisCard;
