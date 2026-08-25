import { Lotus } from "../../factionMarks";
import { UaBand } from "../../cardMasthead/factionBands";
import { AdminOverlay } from "../shared";
import { factionRoleVars } from "../../../utils/factionRoles";
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
 * fixed the radius at 7 and #2403 rules it to 8 with the rest of the frame
 * list's middle rung, so it is now read from `--faction-ua-card-radius` rather
 * than restated here; this slice removed the second frame and the dotted tooth.
 * Do not reintroduce either.
 */
export function UaPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  return (
    <div
      style={{
        ...frameBase,
        // The nine roles under this surface's prefix (#2659/#2673) — the same
        // key the manifest calls this surface, kebab-cased, so the namespace
        // is the one `--praxis-card-basis` already sits in.
        ...factionRoleVars("ua", "leaf-praxis-card"),
        position: "relative",
        overflow: "hidden",
        // The ensō salon sheet's shape, said once (#2361/#2403).
        borderRadius: "var(--leaf-praxis-card-radius)",
        background: "var(--faction-ua-card-parchment)",
        border: "2px solid var(--faction-ua-card-frame)",
        boxShadow:
          "0 14px 40px -22px color-mix(in srgb, var(--leaf-praxis-card-ink) 50%, transparent)",
        /* NO PADDING ON THE FRAME since #2185: the band is full-bleed, and an
           inset frame would have floated it off three edges. The sheet's inset
           moved to the body box below, which is the only thing that ever wanted
           it. The lotus does not move with it — an absolutely positioned child
           resolves against the PADDING box, which dropping padding leaves where
           it was. */
        fontFamily: "var(--faction-ua-body-font)",
        color: "var(--leaf-praxis-card-ink)",
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

      {/* THE LEAF'S BAND (#2185) — the same hairline band `UaTaskCard` wears,
          mounted from the shared module rather than restated here. The ensō is
          not a second mark and does not stand down: it carries the total in the
          right column, where it is the score's device rather than the header's.
          What the band replaced on the task card was the EYEBROW ensō, which was
          a header mark. */}
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
          // Cormorant engraves, EB Garamond reads — the same pair the UA mobile
          // card already carried (#888).
          fonts={{
            display: "var(--leaf-praxis-card-face)",
            body: "var(--faction-ua-body-font)",
          }}
          /*
           * The running head ("Acquisition · filed", `card.masthead.ua`) sat
           * INSIDE the text column, above the title, so it stopped at the score
           * box rather than running under the ensō — the `eyebrow` slot #841
           * added for exactly that shape. #1909 CUT the string, and the slot
           * stays empty: what heads this card now is the faction's own band
           * across the top of the sheet (#2185), not a line inside the text
           * column.
           */
        />
      </div>
    </div>
  );
}

export default UaPraxisCard;
