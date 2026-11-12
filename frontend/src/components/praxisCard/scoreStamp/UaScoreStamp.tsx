import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { TaskCrown } from "../../factionMarks/TaskCrown";
import { UaEnsoScore } from "../../factionMarks/uaAtoms";
import { scoreBreakdown, formatMult } from "./scoreBreakdown";
import { formatPoints } from "../../../utils/points";
import { factionRoleVars } from "../../../utils/factionRoles";
import { factionBodyVars } from "../../../utils/factionBodyFace";
import type { ScoreStampProps } from "./ScoreStamp";

/**
 * The UA score stamp (#857, ADR-0049): a quiet ruled score box (engraved `base`,
 * Cormorant figure, multiplier chip on the same row, italic working beneath) over
 * the ensō carrying the total. Warm on purpose, see `UaPraxisCard`; colours are
 * `--faction-ua-card-*` only. Rows and order are `scoreBreakdown`'s (ADR-0047,
 * ADR-0076, #2634). Raw numbers are ornament (§4a).
 */

const BOX_WIDTH = 134;
const ENSO_SIZE = 138;

const labelStyle: CSSProperties = {
  fontFamily: "var(--faction-ua-body-font)",
  // eslint-disable-next-line local/no-raw-style-values -- ornament: engraved cap label, sized to the plate.
  fontSize: 10.5,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--leaf-score-stamp-quiet)",
};

const workingStyle: CSSProperties = {
  fontFamily: "var(--faction-ua-body-font)",
  fontStyle: "italic",
  // eslint-disable-next-line local/no-raw-style-values -- ornament: the working written under the plate's rule.
  fontSize: 12,
  color: "var(--leaf-score-stamp-quiet)",
};

function MultChip({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        marginLeft: "auto",
        fontFamily: "var(--leaf-score-stamp-face)",
        fontWeight: 600,
        // eslint-disable-next-line local/no-raw-style-values -- ornament: chip lettering, sized to the pill.
        fontSize: 13,
        color: "var(--faction-ua-card-chip-ink)",
        background: "var(--faction-ua-card-chip-bg)",
        borderRadius: 3,
        // eslint-disable-next-line local/no-raw-style-values -- ornament: the chip's drawn inset, not a gutter.
        padding: "2px 7px",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export default function UaScoreStamp({ praxis, showCrown }: ScoreStampProps) {
  const { t } = useTranslation("praxis");
  if (praxis.score === null || praxis.score === undefined) return null;
  const { base, mult, meta, habit, votes, subtotal, total } = scoreBreakdown(praxis);
  const crowned = praxis.is_top_for_task && showCrown !== false;

  return (
    <div
      style={{
        // #2659/#2673; the module-level styles above read these via the cascade.
        ...factionBodyVars("ua"), ...factionRoleVars("ua", "leaf-score-stamp"),
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        // eslint-disable-next-line local/no-raw-style-values -- ornament: the composition's own lead, plate to ring.
        gap: 3,
      }}
    >
      {crowned && (
        <TaskCrown
          size={26}
          ringInset={3}
          rotate="-5deg"
          style={{ position: "absolute", top: -13, right: -10, zIndex: 3 }}
        />
      )}

      {/* No empty ruled box over the ensō (ADR-0076). */}
      {base !== null && (
        <div
          style={{
            boxSizing: "border-box",
            width: BOX_WIDTH,
            border: "1px solid var(--faction-ua-card-rule)",
            borderRadius: 6,
            background: "var(--faction-ua-card-box-bg)",
            // eslint-disable-next-line local/no-raw-style-values -- ornament: the plate's inset within its own rule.
            padding: "7px 11px",
          }}
        >
          {base !== null && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                // eslint-disable-next-line local/no-raw-style-values -- ornament: lead between the cap label and its figure.
                gap: 7,
                whiteSpace: "nowrap",
              }}
            >
              <span style={labelStyle}>{t("card.stamp.base")}</span>
              <span
                style={{
                  fontFamily: "var(--leaf-score-stamp-face)",
                  fontWeight: 600,
                  // eslint-disable-next-line local/no-raw-style-values -- ornament: the plate's engraved figure.
                  fontSize: 25,
                  lineHeight: 0.8,
                  color: "var(--leaf-score-stamp-ink)",
                }}
              >
                {base}
              </span>
              {/* Chip stays on the base row in every state (§6). Declared deviation. */}
              {mult !== null && <MultChip>{formatMult(mult)}</MultChip>}
            </div>
          )}

          {/* Subtotal under the rule, gated on the multiplier alone (#2633/#2634).
              `12 × 0.8` is `9.600000000000001` in doubles (#1866). */}
          {subtotal !== null && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                borderTop: "1px solid var(--faction-ua-card-rule)",
                // eslint-disable-next-line local/no-raw-style-values -- ornament: the drawn rule's clearance.
                marginTop: 5,
                // eslint-disable-next-line local/no-raw-style-values -- ornament: matches the lead of the working lines.
                paddingTop: 3,
              }}
            >
              <span style={workingStyle}>{t("card.stamp.subtotal")}</span>
              <span
                style={{
                  fontFamily: "var(--leaf-score-stamp-face)",
                  fontWeight: 600,
                  // eslint-disable-next-line local/no-raw-style-values -- ornament: the subtotal figure, a step under base.
                  fontSize: 20,
                  lineHeight: 0.9,
                  color: "var(--leaf-score-stamp-ink)",
                }}
              >
                {formatPoints(subtotal)}
              </span>
            </div>
          )}

          {meta !== null && (
            <div
              style={{
                ...workingStyle,
                color: "var(--leaf-score-stamp-accent)",
                // eslint-disable-next-line local/no-raw-style-values -- ornament: the plate's lead between working lines.
                marginTop: 3,
              }}
            >
              + {meta} {t("card.stamp.meta")}
            </div>
          )}

          {votes !== null && (
            <div
              style={{
                ...workingStyle,
                // eslint-disable-next-line local/no-raw-style-values -- ornament: the plate's lead between working lines.
                marginTop: 3,
              }}
            >
              + {votes} {t("card.stamp.votes")}
            </div>
          )}

          {/* Habit (#1617): flat, outside the subtotal; vermilion like meta, as points ADDED. */}
          {habit !== null && (
            <div
              style={{
                ...workingStyle,
                color: "var(--leaf-score-stamp-accent)",
                // eslint-disable-next-line local/no-raw-style-values -- ornament: the plate's lead between working lines.
                marginTop: 3,
              }}
            >
              + {habit} {t("card.stamp.habit")}
            </div>
          )}
        </div>
      )}

      {/* The shared `UaEnsoScore`, dressed in the warm card tokens (#1147). */}
      <div
        style={{
          display: "flex",
          // With no plate to overlap (ADR-0076), the ring hangs on its own.
          // eslint-disable-next-line local/no-raw-style-values -- ornament: the ring overlaps the plate's foot by 6px; that overlap IS the drawing, and the nearest rungs (4/8) either open a gap under the plate or swallow its last working line.
          marginTop: base !== null ? -6 : 0,
        }}
      >
        <UaEnsoScore
          size={ENSO_SIZE}
          value={formatPoints(total)}
          unit={t("card.stamp.points", { count: total })}
          ringColor="var(--faction-ua-card-enso)"
          valueColor="var(--faction-ua-card-total)"
          unitColor="var(--faction-ua-card-points)"
          /* A ceiling: the ring steps a long total down to clear the brush. */
          valueSize="var(--text-display)"
        />
      </div>
    </div>
  );
}
