import { useTranslation } from "react-i18next";
import { TaskCrown } from "../../factionMarks/TaskCrown";
import { PointsRoundel } from "../../factionMarks";
import { scoreBreakdown, formatMult } from "./scoreBreakdown";
import { formatPoints } from "../../../utils/points";
import type { ScoreStampProps } from "./ScoreStamp";
import { factionBodyVars } from "../../../utils/factionBodyFace"

/**
 * The Everymen score stamp (#841, ADR-0049): a crooked rubber TALLY stamp with
 * one fill-in row per term, then the {@link PointsRoundel} with the total, struck
 * separately. Rows and order are `scoreBreakdown`'s (ADR-0047/0076, #2634); with
 * no rows the tally is not struck. Both marks print through
 * `.everymen-stamp-print`, which multiplies into the paper in light only (§8).
 */

/** The stamp's fill-in field width — ornament geometry, the design's own. */
const FIELD_WIDTH = 38;

export default function EverymenScoreStamp({ praxis, showCrown }: ScoreStampProps) {
  const { t } = useTranslation("praxis");
  if (praxis.score === null || praxis.score === undefined) return null;
  const { base, mult, meta, habit, votes, subtotal, total } = scoreBreakdown(praxis);
  const crowned = praxis.is_top_for_task && showCrown !== false;

  /** `ruled` draws the subtotal rule above; `chip` is the multiplier. */
  const rows: { key: string; label: string; value: string; chip?: string; ruled?: boolean }[] = [];
  if (base !== null) {
    // The multiplier is struck on the base line, not a blank (#2633/#2634).
    // Ink is `--faction-everymen-bill-mult-ink`: bare `--everymen-gold` is
    // 1.88:1 on the light card.
    rows.push({
      key: "base",
      label: t("card.stamp.base"),
      value: `${base}`,
      chip: mult !== null ? formatMult(mult) : undefined,
    });
  }
  // Gated on the multiplier alone. `12 × 0.8` is `9.600000000000001` (#1866).
  if (subtotal !== null) {
    rows.push({
      key: "subtotal",
      label: t("card.stamp.subtotal"),
      value: formatPoints(subtotal),
      ruled: true,
    });
  }
  if (meta !== null) {
    rows.push({ key: "meta", label: t("card.stamp.meta"), value: `+${meta}` });
  }
  if (votes !== null) {
    rows.push({ key: "votes", label: t("card.stamp.votes"), value: `+${votes}` });
  }
  // Habit is flat, outside the multiplier (#1617).
  if (habit !== null) {
    rows.push({ key: "habit", label: t("card.stamp.habit"), value: `+${habit}` });
  }

  return (
    <div
      style={{ ...factionBodyVars("everymen"),
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--space-sm)",
        width: 118,
      }}
    >
      {crowned && (
        <TaskCrown
          size={26}
          ringInset={3}
          rotate="8deg"
          style={{ position: "absolute", top: -13, right: -10, zIndex: 3 }}
        />
      )}

      {/* No `TALLY` header over an empty form (ADR-0076). */}
      {rows.length > 0 && (
        <div
          className="everymen-stamp-print"
          style={{
            width: "100%",
            boxSizing: "border-box",
            transform: "rotate(1.3deg)",
            border: "2px solid var(--everymen-red)",
            outline: "1px solid var(--everymen-red)",
            outlineOffset: 2,
            borderRadius: 2,
            padding: "var(--space-xs) var(--space-sm)",
            background: "var(--everymen-stamp-field)",
            fontFamily: "var(--faction-everymen-body-font)",
            color: "var(--everymen-stamp-ink)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-xs)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)" }}>
            <span aria-hidden style={{ flex: 1, height: 1, background: "var(--everymen-red)", opacity: 0.45 }} />
            <span
              style={{
                // eslint-disable-next-line local/no-raw-style-values -- ornament: the stamp's own rule header, struck at 8 (§4a)
                fontSize: 8,
                letterSpacing: "0.2em",
                color: "var(--everymen-red)",
              }}
            >
              {t("card.stamp.tally")}
            </span>
            <span aria-hidden style={{ flex: 1, height: 1, background: "var(--everymen-red)", opacity: 0.45 }} />
          </div>

          {rows.map((row) => (
            <div key={row.key}>
              {row.ruled && (
                <div
                  aria-hidden
                  style={{
                    height: 1,
                    background: "var(--everymen-red)",
                    opacity: 0.4,
                    margin: "0 0 var(--space-xs)",
                  }}
                />
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <span
                  style={{
                    // eslint-disable-next-line local/no-raw-style-values -- ornament: typewriter row label on the stamp, the design's 11 (§4a)
                    fontSize: 11,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {row.label}
                </span>
                <span style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-xs)" }}>
                  <b
                    style={{
                      fontFamily: "var(--font-accent)",
                      // eslint-disable-next-line local/no-raw-style-values -- ornament: poster-face figures written into the field, the design's 17 (§4a)
                      fontSize: 17,
                      lineHeight: 0.8,
                      color: "var(--everymen-stamp-numeral)",
                      borderBottom: "1px dashed var(--everymen-red)",
                      minWidth: FIELD_WIDTH,
                      textAlign: "center",
                    }}
                  >
                    {row.value}
                  </b>
                  {/* Beside the field, not in it: nobody fills in a ratio. */}
                  {row.chip && (
                    <span
                      style={{
                        // eslint-disable-next-line local/no-raw-style-values -- ornament: the struck ratio, a step under the filled field's 17 (§4a)
                        fontSize: 13,
                        letterSpacing: "0.04em",
                        color: "var(--faction-everymen-bill-mult-ink)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.chip}
                    </span>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <PointsRoundel
        className="everymen-stamp-print"
        total={formatPoints(total)}
        unitLabel={t("card.stamp.points", { count: total })}
        arcLabel={t("card.stamp.onTheRecord")}
        color="var(--everymen-red)"
      />
    </div>
  );
}
