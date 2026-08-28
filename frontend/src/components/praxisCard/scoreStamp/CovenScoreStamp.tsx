import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { TaskCrown } from "../../factionMarks/TaskCrown";
import CovenCauldron from "../../factionMarks/CovenCauldron";
import {
  DEEP,
  DISPLAY,
  GOLD,
  INK,
  READING,
  SHADOW,
  SOFT,
} from "../../factionMarks/covenSlip";
import { scoreBreakdown, formatMult } from "./scoreBreakdown";
import { formatPoints } from "../../../utils/points";
import type { ScoreStampProps } from "./ScoreStamp";

/**
 * The Cozy Coven score stamp (#840, ADR-0049, ADR-0050 → #1209 → rebuilt by
 * #2019 to the vendored `TallyStamp` design).
 *
 * TWO STACKED OBJECTS, where there used to be one crooked slip: an arched plate
 * headed `☾ Points ☽` carrying the working as ✦-bulleted rows, and the cauldron
 * below it holding the total. The rows and their selection are still the shared
 * box's (`scoreBreakdown`, ADR-0049/0076); only the presentation is Coven's.
 *
 * WHAT #2019 RETIRED, and why each went.
 *  • The `rotate(-3deg)` tilt and the chip's `+3deg` counter-rotation. The new
 *    composition is symmetrical and reads upright; the counter-rotation was
 *    moot the moment the chip stopped being a chip.
 *  • The gold multiplier chip, now an ordinary `mult` row in the working. The
 *    plate's rows ARE the working, so a term pinned to the right of the base
 *    line was the odd one out. #2634 PUT THE MULTIPLIER BACK ON THE BASE LINE
 *    and left the pill retired: see the chip's own note below for why those are
 *    two decisions and only one of them reverses.
 *  • The `✨`. It was decoration beside the figure; the cauldron IS the mark now.
 *  • The braid, whose job — ruling the working off from the total — belongs to
 *    the plate's own dashed rule above the subtotal.
 * `<TaskCrown>` STAYS. The design draws a `♛` glyph, but at size 26 / `8deg` /
 * a few px off the top-right corner it is describing the shared component this
 * stamp already mounted at those numbers.
 *
 * THE SUBTOTAL ROW IS NO LONGER COVEN-LOCAL (#2634), AND IT STILL MUST NOT
 * SWALLOW THE HABIT BONUS.
 *
 * THIS FILE USED TO ARGUE THE OPPOSITE and the argument is kept rather than
 * deleted, because it was right about its own moment: the row was "a subtotal of
 * two figures `scoreBreakdown` already returns — arithmetic, not a new term,
 * which is why `ScoreBreakdown` gains no `subtotal` field". Two things then
 * happened. #2633 moved the metatask OUT of the multiplier, so `base + meta` is
 * no longer what a multiplier applies to and the figure this plate printed
 * became wrong rather than merely local. And #2634 found the same row drawn
 * three different ways on three different gates — Coven's on `meta` alone,
 * which is why it printed on every metatask praxis with nothing subsequently
 * applied to it. The figure is `subtotal` off the resolver now, `base × mult`,
 * gated on the multiplier alone; ADR-0049 is still unamended, because the
 * shared half deciding what a stamp may show is exactly what it always said.
 *
 * The bonus is FLAT and sits outside the multiplier (#1617), so it is
 * written beside the votes and never inside the subtotal. This skin genuinely meets
 * that case: the stamp dispatches on the TASK's faction (`ScoreStamp.tsx`), so a
 * UA character's praxis on a Coven task lands here with a live habit row — a
 * state the design never draws, because its vendored `breakdown()` predates
 * #1617 and has no habit term at all.
 *
 * THE COLOURS ARE TOKENS, NOT THE DESIGN'S HEXES. Six of the design's palette
 * entries are `--faction-coven-slip-*` to the byte and all six have dark values,
 * so building from the literals would have shipped a light-only card — a
 * regression dressed as fidelity. The design's two near-misses (`--pk-soft`,
 * `--label`) are the values `index.css` records walking DOWN for AA. The three
 * row-value inks are the one genuinely new decision, and they are minted there
 * with both cascades measured.
 */

/** Between the ✦ bullet and its label, and between a label and its figure. */
const ROW: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: "var(--space-md)",
};

/**
 * A figure in the working. `strong` is the subtotal, a step up from the
 * terms it sums; both are drawn figures rather than copy, so they sit off the
 * type scale as ornament (WORLD_ZERO_STYLE §4a).
 */
function value(strong: boolean, color: string): CSSProperties {
  return {
    fontFamily: READING,
    fontWeight: 600,
    // eslint-disable-next-line local/no-raw-style-values -- ornament: the plate's figures, the design's 19/21 (§4a)
    fontSize: strong ? 21 : 19,
    color,
  };
}

export default function CovenScoreStamp({ praxis, showCrown }: ScoreStampProps) {
  const { t } = useTranslation("praxis");
  if (praxis.score === null || praxis.score === undefined) return null;
  const { base, mult, meta, habit, votes, subtotal, total } = scoreBreakdown(praxis);
  const crowned = praxis.is_top_for_task && showCrown !== false;

  /** One ✦-bulleted line of the working. */
  const row = (key: string, label: string, figure: ReactNode, style: CSSProperties) => (
    <div key={key} style={{ ...ROW, ...style }}>
      <span
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "var(--space-xs)",
          fontFamily: READING,
          fontStyle: "italic",
          fontWeight: 600,
          fontSize: "var(--text-content)",
          color: SOFT,
        }}
      >
        <span aria-hidden style={{ fontSize: "var(--text-base)", color: DEEP, opacity: 0.7 }}>
          ✦
        </span>
        {label}
      </span>
      {figure}
    </div>
  );

  const rows: ReactNode[] = [];
  if (base !== null) {
    rows.push(
      row("base", t("card.stamp.base"), (
        <span
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "var(--space-xs)",
          }}
        >
          <span style={value(false, "var(--faction-coven-slip-row-base)")}>{base}</span>
          {/*
           * THE CHIP IS BACK ON THE BASE LINE (#2634), and it is the same
           * multiplier #2019 turned into "an ordinary `mult` row". That change
           * was right about the row and wrong about the line: under #2633's
           * formula the multiplier reaches the BASE and nothing else, so
           * `base × mult` on one line is arithmetically true, and the dashed
           * rule beneath then has exactly one line above it. The gold pill it
           * was is NOT back — the plate's rows are its working, so the chip is
           * the mult row's own ink (`-slip-row-mult`, already measured on this
           * plate) set beside the figure it multiplies. No ground moves, so no
           * pairing is minted.
           */}
          {mult !== null && (
            <span style={value(false, "var(--faction-coven-slip-row-mult)")}>
              {formatMult(mult)}
            </span>
          )}
        </span>
      ), {}),
    );
  }
  /*
   * The subtotal, under the dashed rule that says "the multiplier has been
   * applied". It is `scoreBreakdown`'s figure now, not this file's `base + meta`
   * — see the header — and it is gated on the MULTIPLIER alone, which is what
   * put Coven's subtotal on every metatask praxis for as long as it did.
   *
   * `formatPoints`, like the cauldron's own total: `12 × 0.8` is
   * `9.600000000000001` in doubles (#1866).
   */
  if (subtotal !== null) {
    rows.push(
      row("subtotal", t("card.stamp.subtotal"), (
        <span style={value(true, INK)}>{formatPoints(subtotal)}</span>
      ), {
        borderTop: `1.5px dashed color-mix(in srgb, ${DEEP} 45%, transparent)`,
        paddingTop: "var(--space-xs)",
      }),
    );
  }
  if (meta !== null) {
    rows.push(
      row("meta", t("card.stamp.meta"), <span style={value(false, INK)}>+{meta}</span>, {}),
    );
  }
  if (votes !== null) {
    rows.push(
      row("votes", t("card.stamp.votes"), (
        <span style={value(false, "var(--faction-coven-slip-row-votes)")}>+{votes}</span>
      ), {}),
    );
  }
  /*
   * The habit bonus (#1617), written after the tally: flat, outside the subtotal.
   * The design draws no such row and this skin still has to — see the header.
   */
  if (habit !== null) {
    rows.push(
      row("habit", t("card.stamp.habit"), <span style={value(false, INK)}>+{habit}</span>, {}),
    );
  }

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--space-md)",
      }}
    >
      {/*
       * The crown rides the whole stamp rather than the plate, because the plate
       * is conditional (below) and the crown is not — a praxis can top its task
       * on a bare score. Size, tilt and offset are the ones it already wore.
       */}
      {crowned && (
        <TaskCrown
          size={26}
          ringInset={3}
          rotate="8deg"
          style={{ position: "absolute", top: -13, right: -12, zIndex: 3 }}
        />
      )}

      {/*
       * The arched plate, and ONLY where there is working to hold. `base !== null`
       * is that test: the resolver nulls it exactly when no other term is in play
       * (ADR-0076), so a base-only praxis is the cauldron alone rather than an
       * arch drawn over an empty block. The design's spec sheet draws this state
       * twice and disagrees with itself — plateless in one case, a "no working
       * shown" plate in the other — and the repo already ruled it.
       */}
      {rows.length > 0 && (
        <div
          style={{
            position: "relative",
            minWidth: 150,
            boxSizing: "border-box",
            padding: "var(--space-2xl) var(--space-lg) var(--space-lg)",
            background: `linear-gradient(180deg, var(--faction-coven-ward-card), var(--faction-coven-slip-plate-foot))`,
            border: `2.5px solid ${DEEP}`,
            // The arch: an elliptical head over a die-cut foot, as drawn.
            borderRadius: "92px 92px 20px 20px / 108px 108px 20px 20px",
            boxShadow: `${SHADOW}, inset 0 0 22px color-mix(in srgb, ${DEEP} 12%, transparent)`,
            lineHeight: 1.1,
          }}
        >
          {/* The seal's inner keepsake border, following the arch inside it. */}
          <span
            aria-hidden
            style={{
              position: "absolute",
              inset: 4,
              border: `1px dashed color-mix(in srgb, ${DEEP} 55%, transparent)`,
              borderRadius: "88px 88px 16px 16px / 104px 104px 16px 16px",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-sm)",
              marginBottom: "var(--space-sm)",
            }}
          >
            {/* The moons are the plate's finials — the ornament gold, not ink. */}
            <span aria-hidden style={{ fontSize: "var(--text-xl)", color: GOLD }}>
              ☾
            </span>
            <span
              style={{
                fontFamily: DISPLAY,
                fontSize: "var(--text-title)",
                letterSpacing: "0.06em",
                lineHeight: 1,
                // The design heads the plate "Points". The shared key is the
                // lowercase one every other stamp's caption reads, so the case
                // is presentation here rather than a ninth copy string.
                textTransform: "capitalize",
                color: DEEP,
              }}
            >
              {t("card.stamp.points", { count: total })}
            </span>
            <span aria-hidden style={{ fontSize: "var(--text-xl)", color: GOLD }}>
              ☽
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
            {rows}
          </div>
        </div>
      )}

      <CovenCauldron total={formatPoints(total)} caption={t("card.stamp.points", { count: total })} />
    </div>
  );
}
