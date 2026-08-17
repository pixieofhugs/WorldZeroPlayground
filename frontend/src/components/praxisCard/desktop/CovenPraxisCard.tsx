import { AdminOverlay } from "../shared";
import { PraxisBody, frameBase, type ArchetypeProps } from "./shared";
import {
  Braid,
  CARD,
  BORDER,
  DEEP,
  DISPLAY,
  INK,
  READING,
  SHADOW,
  SOFT,
} from "../../factionMarks/covenSlip";

/**
 * Cozy Coven — THE SPELL SLIP, filed (#1209).
 *
 * The praxis card is the coven's proof written onto the same candle-lit paper
 * the task slip is issued on: the ward's panel ground inside the slip's pink
 * edge, a braided thread under the dispatch line, Grenze Gotisch for the title
 * and Cormorant Garamond for the reading voice.
 *
 * THIS REPLACES THE PINK MARKER STICKER (ADR-0050 → #1209). The blush sticker
 * stock, its `--faction-coven-sticker-*` family and the all-Caveat setting were
 * the last of the lo-fi identity on this surface. What survives is the sticker's
 * geometry, and deliberately: the 16px die-cut radius and the soft pink bloom
 * are the card's silhouette, and the slip is drawn with exactly the same corner
 * (`CovenTaskCard` is 18 on a wider sheet).
 *
 * ONE RESPONSIVE COMPONENT (ADR-0067). There is no mobile twin any more — this
 * file serves both form factors, and `frameBase`'s `flex: 1 1 394px` /
 * `minWidth: 280` resolves to one full-width card per row on a 375px phone. It
 * therefore carries no form-factor branch and no fixed pixel layout.
 *
 * Coven answers "display" and "body" with two DIFFERENT faces now, where the
 * sticker answered both with Caveat (#888): the slip's own pairing is the witch
 * display over the reading serif, and Caveat is the HAND — it letters a masthead
 * and a name, not a card's whole content.
 */
export function CovenPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  return (
    <div
      style={{
        ...frameBase,
        borderRadius: 16, // the slip's die-cut corner — see frameBase's note
        position: "relative",
        background: CARD,
        color: INK,
        border: `2px solid ${BORDER}`,
        boxShadow: SHADOW,
        fontFamily: READING,
        padding: "var(--space-xl)",
        transition: "background 150ms, color 150ms",
      }}
    >
      <AdminOverlay {...adminProps} />
      <PraxisBody
        praxis={praxis}
        tint={DEEP}
        muted={SOFT}
        paper={CARD}
        titleStyle={{
          fontFamily: DISPLAY,
          fontWeight: 600,
          letterSpacing: "0.005em",
          color: INK,
        }}
        showCrown={showCrown}
        fonts={{
          display: DISPLAY,
          body: READING,
        }}
        /* The eyebrow's dispatch line ("dispatch no. {{id}} · all done!",
           `card.masthead.coven`) and the empty gallery's "Drop a happy little
           photo" (`card.coven.mediaEmpty`) were both CUT by #1909 — the masthead
           because a generic one just says "Praxis" on a praxis card, the media
           label because Coven was one of two factions with the slot. The braid
           stays: it is drawn, not written. */
        eyebrow={<Braid style={{ marginBottom: "var(--space-sm)" }} />}
        mediaEmptyStyle={{
          height: 158,
          borderRadius: 12,
          border: "none",
          // A ring rather than a border: the filled gallery draws the same 2px
          // pink edge as a shadow, so an empty and a full slot sit identically.
          boxShadow: `0 0 0 2px ${BORDER}`,
          background: "transparent",
          color: SOFT,
          fontFamily: READING,
          fontStyle: "italic",
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
