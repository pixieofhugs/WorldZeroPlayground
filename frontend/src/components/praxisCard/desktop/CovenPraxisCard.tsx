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
import { factionBodyVars } from "../../../utils/factionBodyFace"

/**
 * Cozy Coven — THE SPELL SLIP, filed (#1209). Wears the faction's own band
 * (#2185, same as `CovenTaskCard`) and the slip sheet `SLIP_SHEET` (#2135, owner
 * ruling: "the slip is the iconic coven look"). Don't restore the panel ground
 * or the braid; both were reversed on purpose.
 *
 * `overflow: hidden` clips the cat to the 16px corner; safe because nothing
 * downstream needs to escape (#1255). `tint` is INK, not DEEP: the shared body
 * paints names/chips in it and DEEP is 3.33:1 on the sheet's darkest stop
 * (INK 5.46:1), gated in `factionContrast.test.ts`. `paper` stays `CARD` for
 * discs drawn on the sheet. Gradient is imported, never retyped.
 *
 * One responsive component (ADR-0067). Display/body faces differ: witch display
 * over the reading serif; Caveat is the hand, for mastheads and names only.
 */
export function CovenPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  /* The cat drops on a busy ground (#2396), same predicate as `CovenTaskCard`. */
  const groundIsBusy = useGroundIsBusy();
  return (
    <div
      style={{ ...factionBodyVars("coven"),
        ...frameBase,
        borderRadius: 16, // the slip's die-cut corner — see frameBase's note
        position: "relative",
        // Clips the cat to that corner (#1255).
        overflow: "hidden",
        background: SLIP_SHEET,
        color: INK,
        border: `2px solid ${BORDER}`,
        boxShadow: SHADOW,
        fontFamily: READING,
        /* No frame padding (#2185): the band is full-bleed; inset is on the body. */
        transition: "background 150ms, color 150ms",
      }}
    >
      {/* Watermark at `CovenTaskCard`'s numbers (#2135; see {@link CovenCat}).
          `.cvn-wheel` owns the turn and reduced-motion guard. Bare on a busy ground. */}
      {!groundIsBusy && (
        <CovenCat size={190} style={{ right: -6, bottom: -4, opacity: 0.09 }} />
      )}

      {/* The band carries its twinkle field as backdrop, keeping stars off the copy. */}
      <CovenBand />

      <AdminOverlay {...adminProps} />
      {/* Own layer so the absolutely positioned cat paints under the copy. */}
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
          /* No eyebrow: #1909 cut the dispatch line, #2185 the braid under the band. */
          mediaEmptyStyle={{
            height: 158,
            borderRadius: 12,
            border: "none",
            // A ring like the filled gallery's 2px edge, so empty and full align.
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
