import { useTranslation } from "react-i18next";
import { TaskCrown } from "../../cards/TaskCrown";
import { PointsRoundel } from "../../factionMarks";
import { scoreBreakdown, formatMult } from "./scoreBreakdown";
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
 * ROW SELECTION IS NOT OURS. `scoreBreakdown` decides which rows exist
 * (ADR-0047) — including the BASE row, which drops out when the roundel already
 * states that figure (#1131); the tally then holds `VOTES +0` alone, which is
 * still a completed form. This file only decides what a row looks like. The one row this
 * stamp adds on its own is GROUP — `(base + meta)`, drawn under a rule — and it
 * appears only when a metatask AND a multiplier are both in play, which is
 * exactly the design's "full formula" column. Without a multiplier the subtotal
 * explains nothing, so it stays off; the stamp must read as a completed form in
 * all five states, not as a form with holes in it.
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
  const { base, mult, meta, votes, total } = scoreBreakdown(praxis);
  const crowned = praxis.is_top_for_task && showCrown !== false;

  /** Rows in working order. `ruled` draws the subtotal rule above the row. */
  const rows: { key: string; label: string; value: string; gold?: boolean; ruled?: boolean }[] = [];
  if (base !== null) {
    rows.push({ key: "base", label: t("card.stamp.base"), value: `${base}` });
  }
  if (meta !== null) {
    rows.push({ key: "meta", label: t("card.stamp.meta"), value: `+${meta}` });
    // `base` is non-null whenever a metatask is in play (the #1131 rule hides it
    // only when nothing else exists), so the subtotal always has both terms;
    // the guard is what tells the compiler so.
    if (mult !== null && base !== null) {
      rows.push({ key: "group", label: t("card.stamp.group"), value: `${base + meta}`, ruled: true });
    }
  }
  if (mult !== null) {
    rows.push({ key: "mult", label: t("card.stamp.mult"), value: formatMult(mult), gold: true });
  }
  rows.push({ key: "votes", label: t("card.stamp.votes"), value: `+${votes}` });

  return (
    <div
      style={{
        position: "relative",
        flexShrink: 0,
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

      {/* The tally stamp — struck crooked, inked into the sheet. */}
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
              <b
                style={{
                  fontFamily: "var(--font-accent)",
                  // eslint-disable-next-line local/no-raw-style-values -- ornament: poster-face figures written into the field, the design's 17 (§4a)
                  fontSize: 17,
                  lineHeight: 0.8,
                  color: row.gold ? "var(--everymen-stamp-mult)" : "var(--everymen-stamp-numeral)",
                  borderBottom: "1px dashed var(--everymen-red)",
                  minWidth: FIELD_WIDTH,
                  textAlign: "center",
                }}
              >
                {row.value}
              </b>
            </div>
          </div>
        ))}
      </div>

      {/* The total mark — a second, separate strike. */}
      <PointsRoundel
        className="everymen-stamp-print"
        total={total.toFixed(1)}
        unitLabel={t("card.stamp.points")}
        arcLabel={t("card.stamp.onTheRecord")}
        color="var(--everymen-red)"
      />
    </div>
  );
}
