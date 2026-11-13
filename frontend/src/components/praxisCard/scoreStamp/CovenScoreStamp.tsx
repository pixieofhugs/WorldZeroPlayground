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
import { factionBodyVars } from "../../../utils/factionBodyFace"

/**
 * The Cozy Coven score stamp (#840, ADR-0049/0050; rebuilt by #2019 to the
 * vendored `TallyStamp`): an arched plate headed `☾ Points ☽` carrying the
 * working as ✦ rows, over the cauldron holding the total. Row selection is the
 * shared `scoreBreakdown`'s (ADR-0049/0076). Upright, no tilt; `<TaskCrown>` is
 * the design's `♛` at the same numbers.
 *
 * The subtotal is the resolver's `base × mult`, gated on the multiplier alone
 * (#2633, #2634). The habit bonus is FLAT, outside the multiplier (#1617), so it
 * never enters the subtotal; this skin does meet it (stamps dispatch on the
 * TASK's faction, so a UA character's praxis on a Coven task lands here), though
 * the design has no habit row.
 *
 * Colours are `--faction-coven-slip-*` tokens, not the design's hexes: the hexes
 * have no dark values, and two were walked down for AA in `index.css`.
 */

/** Between the ✦ bullet and its label, and between a label and its figure. */
const ROW: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: "var(--space-md)",
};

/** A figure in the working (`strong` = subtotal); ornament, off the type scale (§4a). */
function value(strong: boolean, color: string): CSSProperties {
  return {
    fontFamily: READING,
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
          {/* `base × mult` on one line (#2634): the multiplier reaches only the
              base (#2633). The mult row's ink, not the retired gold pill. */}
          {mult !== null && (
            <span style={value(false, "var(--faction-coven-slip-row-mult)")}>
              {formatMult(mult)}
            </span>
          )}
        </span>
      ), {}),
    );
  }
  /* Under the dashed "multiplier applied" rule. `formatPoints`: `12 × 0.8` is
   * `9.600000000000001` in doubles (#1866). */
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
  /* Habit (#1617): flat, after the tally, outside the subtotal. */
  if (habit !== null) {
    rows.push(
      row("habit", t("card.stamp.habit"), <span style={value(false, INK)}>+{habit}</span>, {}),
    );
  }

  return (
    <div
      style={{ ...factionBodyVars("coven"),
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--space-md)",
      }}
    >
      {/* The crown rides the whole stamp: the plate is conditional, the crown is not. */}
      {crowned && (
        <TaskCrown
          size={26}
          ringInset={3}
          rotate="8deg"
          style={{ position: "absolute", top: -13, right: -12, zIndex: 3 }}
        />
      )}

      {/* The plate only where there is working: the resolver nulls `base` when no
          other term is in play (ADR-0076), so base-only is the cauldron alone. */}
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
                // Shared lowercase key; the capital is presentation.
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
