import { useTranslation } from "react-i18next";
import { TaskCrown } from "../../factionMarks/TaskCrown";
import { PointsRoundel } from "../../factionMarks";
import { scoreBreakdown, formatMult } from "./scoreBreakdown";
import { formatPoints } from "../../../utils/points";
import type { ScoreStampProps } from "./ScoreStamp";

/**
 * The Everymen score stamp (#841, ADR-0049) — the TALLY STAMP and the POINTS
 * ROUNDEL, the two objects the design draws in the broadsheet's right column.
 *
 * The tally is a rubber stamp struck crooked on the sheet: a dashed `TALLY`
 * rule header, then one fill-in-the-blank row per term of the working, the
 * figures written into dashed fields in the poster face. Under it, struck
 * separately and crooked the other way, the {@link PointsRoundel} carries the
 * total. #821 had neither — one upright rectangle stood in for both.
 *
 * ROW SELECTION IS NOT OURS, AND SINCE #2634 NEITHER IS THE ORDER.
 * `scoreBreakdown` decides which rows exist (ADR-0047, ADR-0076) — including the
 * BASE row, which drops out when the roundel already states that figure (#1131),
 * and the VOTES row, which drops out when nobody has voted. With both gone the
 * stamp has no fields to fill, so it is not struck at all. This file only decides
 * what a row looks like.
 *
 * THE SUBTOTAL IS NO LONGER THIS STAMP'S OWN ROW. It used to be `(base + meta)`,
 * computed here and drawn only when a metatask AND a multiplier were both in
 * play — "exactly the design's full formula column". #2633 retired the sum: the
 * metatask left the multiplier, so what the ratio applies to is the base alone,
 * and the figure comes off `ScoreBreakdown.subtotal` gated on the multiplier
 * alone. The form still reads as completed in every state; a duel praxis with no
 * metatask now fills the subtotal blank too, which is the one state the old gate
 * left empty on a form that had a ratio in it.
 *
 * Both marks print through `.everymen-stamp-print`, which multiplies them into
 * the paper in light and drops the blend in dark (§8 — the theme switch is in
 * the cascade, never a ternary here).
 */

/** The stamp's fill-in field width — ornament geometry, the design's own. */
const FIELD_WIDTH = 38;

export default function EverymenScoreStamp({ praxis, showCrown }: ScoreStampProps) {
  const { t } = useTranslation("praxis");
  if (praxis.score === null || praxis.score === undefined) return null;
  const { base, mult, meta, habit, votes, subtotal, total } = scoreBreakdown(praxis);
  const crowned = praxis.is_top_for_task && showCrown !== false;

  /**
   * Rows in working order (#2634). `ruled` draws the subtotal rule above the
   * row; `chip` is the multiplier, struck beside the base field rather than
   * filed as a term of its own.
   */
  const rows: { key: string; label: string; value: string; chip?: string; ruled?: boolean }[] = [];
  if (base !== null) {
    // THE MULTIPLIER IS STRUCK ON THE BASE LINE, not filled into a field of its
    // own (#2634). It is not an addend — under #2633's formula it applies to the
    // base and to nothing else — so a form that gave it a blank to fill was
    // reading it as a fifth term. The gold is the one the `mult` row already
    // wore (`--everymen-stamp-mult`, measured on this field), moved and not
    // re-chosen.
    rows.push({
      key: "base",
      label: t("card.stamp.base"),
      value: `${base}`,
      chip: mult !== null ? formatMult(mult) : undefined,
    });
  }
  // The subtotal, under the stamp's own ruled line — what the multiplier made of
  // the base, gated on the multiplier ALONE. It used to require a metatask too
  // and to read `base + meta`, which #2633's formula retired: the parentheses
  // that sum was inside no longer exist. `formatPoints` because `12 × 0.8` is
  // `9.600000000000001` in doubles (#1866).
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
  // The habit bonus is filled in AFTER the multiplier and after the subtotal
  // rule, beside votes, because it is flat and outside the parentheses (#1617).
  if (habit !== null) {
    rows.push({ key: "habit", label: t("card.stamp.habit"), value: `+${habit}` });
  }

  return (
    <div
      style={{
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

      {/* The tally stamp — struck crooked, inked into the sheet. It is struck
          only when there is working to fill it: since ADR-0076 a base-only
          praxis fills no field at all, and a `TALLY` header ruled over an empty
          form is not a completed form — it is an orphaned rule. The roundel
          below carries the figure on its own. */}
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
            fontFamily: "var(--font-faction-typewriter)",
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
                  {/* The multiplier, struck beside the field rather than into
                      one — the field is a blank the clerk fills, and a ratio is
                      not a figure anybody enters. No underline for the same
                      reason. */}
                  {row.chip && (
                    <span
                      style={{
                        // eslint-disable-next-line local/no-raw-style-values -- ornament: the struck ratio, a step under the filled field's 17 (§4a)
                        fontSize: 13,
                        letterSpacing: "0.04em",
                        color: "var(--everymen-stamp-mult)",
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

      {/* The total mark — a second, separate strike. */}
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
