import { useTranslation } from "react-i18next";
import { TaskCrown } from "../../factionMarks/TaskCrown";
import DefaultPointsRing from "../../factionMarks/DefaultPointsRing";
import { scoreBreakdown, formatMult } from "./scoreBreakdown";
import { formatPoints } from "../../../utils/points";
import { factionRoleVars } from "../../../utils/factionRoles";
import type { ScoreStampProps } from "./ScoreStamp";

/**
 * The Default / `na` score stamp: the unaffiliated SPECTRUM stamp (ADR-0039,
 * ADR-0049) and every faction's fall-through. Built to the Unaffiliated
 * praxis-detail design (#1091) in the canonical order all nine stamps share
 * (#2634): working rows, ONE 2px spectrum rule, then the total in
 * {@link DefaultPointsRing} (#2042). No grey leader hairlines (#2520); the ring
 * is the object's one structural spectrum (ADR-0083 §3b).
 *
 * The design's arithmetic is NOT built (its mult is vote-derived and votes a
 * count). The model is `base × faction_mult × duel_mult + meta + votes + habit`
 * (ADR-0014/0047/0053, #2633); every number and every row-selection rule comes
 * from `scoreBreakdown()` (ADR-0053). Nothing is derived by subtraction here.
 *
 * Size-agnostic: one width in every mount, stacked in one column (the design's
 * two-column layout starves the card's title column). Colours are roles (#2672),
 * flipping through the `[data-theme="dark"]` cascade.
 */

/** The total mark's size, ornament geometry (§4a). */
const MARK = 96;
/** Fits the 96px mark plus padding; narrow enough for the title column. */
const STAMP_WIDTH = 150;

export default function DefaultScoreStamp({ praxis, showCrown }: ScoreStampProps) {
  const { t } = useTranslation("praxis");
  if (praxis.score === null || praxis.score === undefined) return null;
  const { base, mult, meta, habit, votes, subtotal, total } = scoreBreakdown(praxis);
  const crowned = praxis.is_top_for_task && showCrown !== false;

  /** `chip` rides the base row; `ruled` draws the subtotal's hairline above. */
  const rows: {
    key: string;
    label: string;
    value: string;
    chip?: string;
    ruled?: boolean;
  }[] = [];
  if (base !== null) {
    rows.push({
      key: "base",
      label: t("card.stamp.base"),
      value: `${base}`,
      // The multiplier applies only to the base (#2633), so it rides that row.
      chip: mult !== null ? formatMult(mult) : undefined,
    });
  }
  // `12 × 0.8` is `9.600000000000001` in doubles (#1866).
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
  /* Flat terms, outside the multiplier, below the subtotal's rule (#1617). */
  if (votes !== null) {
    rows.push({ key: "votes", label: t("card.stamp.votes"), value: `+${votes}` });
  }
  if (habit !== null) {
    rows.push({ key: "habit", label: t("card.stamp.habit"), value: `+${habit}` });
  }

  /** The resolver nulls `base` exactly when no other term is in play (ADR-0076). */
  const hasWorking = base !== null;

  return (
    <div
      style={{
        // Core roles only (#2672); `-stamp-bg` and `-card-line` stay named as
        // the surface's extras. Pinned to na: the ground takes no slug.
        ...factionRoleVars("na", "na-score-stamp"),
        position: "relative",
        boxSizing: "border-box",
        width: "100%",
        maxWidth: STAMP_WIDTH,
        border: "1px solid var(--faction-default-card-line)",
        borderRadius: 10,
        background: "var(--faction-default-stamp-bg)",
        color: "var(--na-score-stamp-ink)",
        boxShadow: "0 2px 6px var(--color-cast-shadow-soft)",
        padding: "var(--space-md)",
      }}
    >
      {crowned && (
        <TaskCrown
          size={26}
          ringInset={3}
          rotate="8deg"
          style={{ position: "absolute", top: -13, right: -12, zIndex: 3 }}
        />
      )}

      {rows.map((row) => (
        <div key={row.key}>
          {/* The subtotal's rule: the plate's own `-card-line`, saying "multiplier
              applied". Never a spectrum (ADR-0083 §3b). */}
          {row.ruled && (
            <div
              aria-hidden
              style={{
                height: 1,
                background: "var(--faction-default-card-line)",
                margin: "var(--space-xs) 0 0",
              }}
            />
          )}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "var(--space-xs)",
              padding: "var(--space-xs) 0",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-base)",
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                color: "var(--na-score-stamp-quiet)",
                whiteSpace: "nowrap",
              }}
            >
              {row.label}
            </span>
            <span
              style={{
                marginLeft: "auto",
                fontFamily: "var(--na-score-stamp-face)",
                fontSize: "var(--text-lg)",
                whiteSpace: "nowrap",
              }}
            >
              {row.value}
            </span>
            {/* Outboard of the figure column, so the subtotal still lines up. */}
            {row.chip && (
              <span
                style={{
                  fontFamily: "var(--na-score-stamp-face)",
                  fontSize: "var(--text-base)",
                  color: "var(--na-score-stamp-quiet)",
                  whiteSpace: "nowrap",
                }}
              >
                {row.chip}
              </span>
            )}
          </div>
        </div>
      ))}

      {/* The stamp's one spectrum rule, under the working and above the total
          (#2520, #2634; ADR-0076). Base-only draws no working, so no rule.

          `position: relative` anchors Albescent's travelling `::before`, and THE
          SPAN MUST STAY CHILDLESS: `.alb-moves .spectrum-rule:empty` matches it
          (#2543; `albescentSpectraMove` reads this source). */}
      {hasWorking && (
        <span
          aria-hidden
          className="spectrum-rule"
          style={{
            display: "block",
            position: "relative",
            height: 2,
            borderRadius: 2,
            margin: "var(--space-sm) 0 var(--space-md)",
          }}
        />
      )}

      {/* The total in the spectrum ring, last on the stamp (#2042, #2634). The
          unit letters in `-card-muted` (6.15:1 light / 4.82:1 dark, AA_NORMAL).
          `ground` is the plate, so the mark reads as struck into it. No
          `min-height`: with no working there is no rule and no margin (#1894). */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <DefaultPointsRing
          value={formatPoints(total)}
          unit={t("card.stamp.points", { count: total })}
          size={MARK}
          ground="var(--faction-default-stamp-bg)"
        />
      </div>
    </div>
  );
}
