import { useTranslation } from "react-i18next";
import { factionCssVar } from "../../../utils/factions";
import { AdminOverlay } from "../shared";
import { PraxisBody, frameBase, type ArchetypeProps } from "./shared";

/**
 * Cozy Coven — THE PINK STICKER (#840, ADR-0050).
 *
 * A near-white card with a 1px pink hairline and a 16px radius, hand-written in
 * Caveat end to end: "dispatch no. 663 · all done! ✿", "Drop a happy little
 * photo ✿". Warm and soft, and — the part that matters — NOT a chronicle. Until
 * this issue Coven rendered through the gold/plum chronicle frame with pink
 * tokens poured in, which is the shape of the ADR-0050 mix-up: the two factions
 * had swapped identities and the recovery was done in colour only.
 *
 * So the frame is Coven's own now, and the borrowed structure is gone with it:
 *
 *  • no running-head band. A sticker has no masthead — the dispatch line is the
 *    first thing written ON it, an eyebrow inside the text column;
 *  • the border is a 1px HAIRLINE, not the chronicle's 2px binding, and the
 *    shadow is a soft pink bloom rather than a hard parchment drop;
 *  • the media slot is a ROUNDED WINDOW ringed in pink (radius 12, a 2px ring
 *    drawn as a shadow so the image can sit flush), not a dashed box.
 *
 * The dark variant is built explicitly, not inherited: the design draws a deep
 * plum-black ground with the sticker's dashes lifted to a dusty rose, and none
 * of it falls out of the light values by substitution.
 */
export function CovenPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  const { t } = useTranslation("praxis");
  return (
    <div
      style={{
        ...frameBase,
        borderRadius: 16, // the sticker's die-cut corner
        position: "relative",
        background: "var(--faction-coven-sticker-bg)",
        color: factionCssVar("coven", "card-text"),
        border: "1px solid var(--faction-coven-sticker-border)",
        boxShadow: "0 4px 18px var(--faction-coven-sticker-shadow)",
        fontFamily: "var(--faction-coven-card-font)",
        padding: "var(--space-xl)",
        transition: "background 150ms, color 150ms",
      }}
    >
      <AdminOverlay {...adminProps} />
      <PraxisBody
        praxis={praxis}
        tint="var(--faction-coven-sticker-accent)"
        muted="var(--faction-coven-sticker-muted)"
        paper="var(--faction-coven-sticker-bg)"
        titleStyle={{
          fontFamily: "var(--faction-coven-card-font)",
          fontWeight: 700,
          color: factionCssVar("coven", "card-text"),
        }}
        showCrown={showCrown}
        eyebrow={
          <div
            style={{
              fontFamily: "var(--faction-coven-card-font)",
              fontWeight: 700,
              fontSize: "var(--text-content)",
              color: "var(--faction-coven-sticker-accent)",
              marginBottom: "var(--space-xs)",
            }}
          >
            {t("card.masthead.coven", { id: praxis.id })}
          </div>
        }
        mediaEmptyLabel={t("card.coven.mediaEmpty")}
        mediaEmptyStyle={{
          height: 158,
          borderRadius: 12,
          border: "none",
          // A ring rather than a border: the filled gallery draws the same 2px
          // pink edge as a shadow, so an empty and a full slot sit identically.
          boxShadow: "0 0 0 2px var(--faction-coven-sticker-border)",
          background: "transparent",
          color: "var(--faction-coven-sticker-muted)",
          textTransform: "none",
          letterSpacing: "0.02em",
          fontSize: "var(--text-content)",
          opacity: 1,
        }}
      />
    </div>
  );
}

export default CovenPraxisCard;
