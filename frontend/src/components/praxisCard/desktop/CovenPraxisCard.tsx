import { CovenBand } from "../../cardMasthead/factionBands";
import { useGroundIsBusy } from "../../backdrop/BackdropContext";
import { AdminOverlay } from "../shared";
import { PraxisBody, frameBase, type ArchetypeProps } from "./shared";
import {
  CARD,
  BORDER,
  CovenCat,
  DISPLAY,
  INK,
  READING,
  SHADOW,
  SLIP_SHEET,
  SOFT,
} from "../../factionMarks/covenSlip";

/**
 * Cozy Coven — THE SPELL SLIP, filed (#1209).
 *
 * The praxis card is the coven's proof written onto the same candle-lit paper
 * the task slip is issued on: the four-stop pink→lavender sheet, the hand-
 * lettered band across the head, the cat turning in the corner, Grenze Gotisch
 * for the title and Cormorant Garamond for the reading voice.
 *
 * ## IT WEARS A MASTHEAD AGAIN — #1909's reasoning is SUPERSEDED (#2185)
 *
 * This docstring used to carry #1909's note that the praxis masthead was cut
 * because "a generic one just says 'Praxis' on a praxis card". THE OWNER HAS
 * SINCE DECIDED A PRAXIS CARD DOES WANT A BAND, and it is the faction's own —
 * the same one `CovenTaskCard` wears, mounted from the same module. Nothing
 * about #1909 was wrong at the time; the decision changed, and #2185 is the
 * record. Do not reconstruct the old argument beside the band it argues against,
 * and do not restore the braid the band displaced.
 *
 * ## IT WEARS THE SHEET NOW — #1209's decision is REVERSED (#2135)
 *
 * This docstring used to say the card was "the ward's panel ground inside the
 * slip's pink edge", deliberately NOT the slip: a filed proof against the issued
 * spell. The owner ruled the other way on 2026-08-17 — "the slip is the iconic
 * coven look" — so the ground is `SLIP_SHEET`, the same gradient
 * `CovenTaskCard` paints, and the cat watermark comes with it at the task card's
 * own numbers. Do not restore the panel ground as a regression: it was a written
 * decision and it was overturned on purpose.
 *
 * TWO THINGS RIDE ALONG, and neither is cosmetic.
 *
 * `overflow: hidden`, so the mark clips to the 16px die-cut corner. Safe here
 * and not everywhere: #1255's rule is "what is downstream of the clip?" — this
 * card hosts no composer, menu or modal, only the read-only body, so nothing
 * absolutely positioned needs to escape it.
 *
 * `tint` becomes INK, where it was DEEP. This is #1295's substitution, forced by
 * the ground change and measured: `tint` is the shared body's `accent`, and the
 * shared body paints a collab member's name, a duel rival's name and a roster
 * chip's label in it at `--text-content`. DEEP clears on the ward panel (4.70:1)
 * and does NOT clear on the sheet — 3.33:1 on the gradient's darkest stop in
 * light, with 3.60–3.85 on the other three. INK is the ink Coven reaches for
 * when a pink has to carry words (5.46:1 on that same stop, 7.99 dark), and the
 * new pairs are gated in `factionContrast.test.ts`. Nothing else on the card
 * changes ink: the title was already INK, the quiet copy SOFT, and `paper` stays
 * `CARD` because it grounds solid discs drawn ON the sheet, not the sheet.
 *
 * THIS REPLACES THE PINK MARKER STICKER (ADR-0050 → #1209). The blush sticker
 * stock, its `--faction-coven-sticker-*` family and the all-Caveat setting were
 * the last of the lo-fi identity on this surface. What survives is the sticker's
 * geometry, and deliberately: the 16px die-cut radius and the soft pink bloom
 * are the card's silhouette, and the slip is drawn with exactly the same corner
 * (`CovenTaskCard` is 18 on a wider sheet).
 *
 * The gradient itself is imported, never retyped: four surfaces wear it now, so
 * a private copy is a private copy to re-tune.
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
  /* THE CAT ALTERNATES (#2396, epic #2195), on the same predicate and at the
     same reading as `CovenTaskCard`'s: one ornament per faction, worn on both
     cards, dropped on a patterned ground. A Coven profile keeps it — candlelight
     is a wash. Nothing else on this card branches; the band, the sheet and the
     braid are chrome. */
  const groundIsBusy = useGroundIsBusy();
  return (
    <div
      style={{
        ...frameBase,
        borderRadius: 16, // the slip's die-cut corner — see frameBase's note
        position: "relative",
        // Clips the cat to that corner. Nothing on this card opens a popover,
        // so the clip is free here (#1255).
        overflow: "hidden",
        background: SLIP_SHEET,
        color: INK,
        border: `2px solid ${BORDER}`,
        boxShadow: SHADOW,
        fontFamily: READING,
        /* NO PADDING ON THE FRAME since #2185: the band is full-bleed, and an
           inset frame would have floated it off three edges. The slip's inset
           moved to the body box below. The cat does not move with it — an
           absolutely positioned child resolves against the PADDING box, which
           dropping padding leaves where it was. */
        transition: "background 150ms, color 150ms",
      }}
    >
      {/* The watermark, at `CovenTaskCard`'s exact numbers on a card 10px
          narrower — #2135 pins them rather than picking a second placement, and
          the opacity is the 0.09 every mount holds (the measurements are at
          {@link CovenCat}). `.cvn-wheel` owns the turn and its reduced-motion
          guard in index.css; the body below sits above it on its own layer.

          #2396 takes it off a busy ground: "either burst, or plain" — the slip
          is then BARE, and no second texture stands in for the cat. */}
      {!groundIsBusy && (
        <CovenCat size={190} style={{ right: -6, bottom: -4, opacity: 0.09 }} />
      )}

      {/* THE SLIP'S BAND (#2185) — the same one `CovenTaskCard` wears, twinkle
          field and all, mounted from the shared module. The field is the band's
          BACKDROP, so it travels with the band rather than being rebuilt beside
          it; that is what keeps the stars off the copy on both cards. */}
      <CovenBand />

      <AdminOverlay {...adminProps} />
      {/* The copy takes a layer of its own, for the reason `CovenTaskCard`'s
          body does: the mark is absolutely positioned, so in-flow siblings would
          paint UNDER it. A watermark that crosses the type is the one thing the
          0.09 was chosen to avoid. */}
      <div style={{ position: "relative", zIndex: 1, padding: "var(--space-xl)" }}>
        <PraxisBody
          praxis={praxis}
          tint={INK}
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
          /* NO EYEBROW. The dispatch line ("dispatch no. {{id}} · all done!",
             `card.masthead.coven`) and the empty gallery's "Drop a happy little
             photo" (`card.coven.mediaEmpty`) were both CUT by #1909, and the
             BRAID that outlived them went with #2185: a band that already names
             the coven does not need an ornament run repeating it — the same
             reasoning that untied the braid from under the task card's wordmark
             in #2029. The braid lives on below, ruling off sections. */
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
    </div>
  );
}

export default CovenPraxisCard;
