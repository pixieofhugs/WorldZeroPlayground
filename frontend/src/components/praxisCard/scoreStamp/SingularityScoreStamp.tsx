import { useTranslation } from "react-i18next";
import { TaskCrown } from "../../factionMarks/TaskCrown";
import SingularityReadout from "../../factionMarks/SingularityReadout";
import { scoreBreakdown, formatMult } from "./scoreBreakdown";
import { formatPoints } from "../../../utils/points";
import type { ScoreStampProps } from "./ScoreStamp";
import { factionBodyVars } from "../../../utils/factionBodyFace"

/**
 * The Singularity score stamp (#842, ADR-0049): a computed read-out, working as
 * `LABEL … value` register rows, the total in the shared lit well
 * {@link SingularityReadout} (#2042). One voice choice: additive rows zero-pad
 * (`+04`), because a terminal pads. The total goes through `formatPoints` like
 * every stamp (#1866). Rows and order are `scoreBreakdown`'s (#2634, ADR-0076);
 * an empty register drops its rule and prints `TOTAL` alone, never `+00`.
 */
export default function SingularityScoreStamp({ praxis, showCrown }: ScoreStampProps) {
  const { t } = useTranslation("praxis");
  if (praxis.score === null || praxis.score === undefined) return null;
  const { base, mult, meta, habit, votes, subtotal, total } = scoreBreakdown(praxis);
  const crowned = praxis.is_top_for_task && showCrown !== false;

  const rowStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "var(--space-sm)",
    // eslint-disable-next-line local/no-raw-style-values -- ornament: terminal register row, the design's 10; a read-out is illustration, not prose (§4a)
    fontSize: 10,
    color: "var(--faction-singularity-phosphor-dim)",
    marginTop: "var(--space-xs)",
  } as const;

  /** Every line is optional, so the first one drops its top gap. `chip` is the
   *  ratio; `ruled` draws the hairline above. */
  const lines: {
    key: string
    label: string
    value: string
    valueColor: string
    chip?: string
    ruled?: boolean
  }[] = [];
  if (base !== null) {
    lines.push({
      key: "base",
      label: t("card.stamp.base"),
      value: `${base}`,
      valueColor: "var(--faction-singularity-terminal-ink)",
      // On the base line in amber: it applies only to the base (#2633/#2634).
      chip: mult !== null ? formatMult(mult) : undefined,
    });
  }
  // Gated on the multiplier alone. `12 × 0.8` is `9.600000000000001` (#1866).
  if (subtotal !== null) {
    lines.push({
      key: "subtotal",
      label: t("card.stamp.subtotal"),
      value: formatPoints(subtotal),
      valueColor: "var(--faction-singularity-terminal-ink)",
      ruled: true,
    });
  }
  if (meta !== null) {
    lines.push({
      key: "meta",
      label: t("card.stamp.meta"),
      value: `+${meta}`,
      valueColor: "var(--faction-singularity-terminal-ink)",
    });
  }
  if (votes !== null) {
    lines.push({
      key: "votes",
      label: t("card.stamp.votes"),
      value: `+${String(votes).padStart(2, "0")}`,
      valueColor: "var(--faction-singularity-terminal-ink)",
    });
  }
  // Habit is flat, outside the multiplier (#1617).
  if (habit !== null) {
    lines.push({
      key: "habit",
      label: t("card.stamp.habit"),
      value: `+${String(habit).padStart(2, "0")}`,
      valueColor: "var(--faction-singularity-terminal-ink)",
    });
  }

  return (
    <div
      style={{ ...factionBodyVars("singularity"),
        position: "relative",
        minWidth: 120,
        boxSizing: "border-box",
        background: "var(--faction-singularity-term-page)",
        border: "1px solid var(--faction-singularity-stamp-border)",
        borderRadius: 4,
        boxShadow: "inset 0 0 12px var(--faction-singularity-stamp-glow)",
        fontFamily: "var(--font-faction-terminal)",
        padding: "var(--space-sm) var(--space-md)",
        lineHeight: 1.2,
      }}
    >
      {crowned && (
        <TaskCrown
          size={26}
          ringInset={3}
          rotate="0deg"
          style={{ position: "absolute", top: -13, right: -12, zIndex: 3 }}
        />
      )}

      {lines.map((line, index) => (
        <div key={line.key}>
          {/* The register rule's material at half strength. */}
          {line.ruled && (
            <div
              aria-hidden
              style={{
                height: 1,
                background: "var(--faction-singularity-stamp-rule)",
                opacity: 0.5,
                margin: "var(--space-xs) 0 0",
              }}
            />
          )}
          <div style={{ ...rowStyle, marginTop: index === 0 ? 0 : rowStyle.marginTop }}>
            <span>{line.label}</span>
            <span style={{ display: "flex", gap: "var(--space-xs)" }}>
              <span style={{ color: line.valueColor }}>{line.value}</span>
              {line.chip && (
                <span style={{ color: "var(--faction-singularity-led-amber)" }}>{line.chip}</span>
              )}
            </span>
          </div>
        </div>
      ))}

      {lines.length > 0 && (
        <div
          aria-hidden
          style={{
            height: 1,
            background: "var(--faction-singularity-stamp-rule)",
            margin: "var(--space-sm) 0",
          }}
        />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-sm)" }}>
        <span
          style={{
            // eslint-disable-next-line local/no-raw-style-values -- ornament: stencilled register label on the read-out, the design's 8 (§4a)
            fontSize: 8,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--faction-singularity-term-dim)",
          }}
        >
          {t("card.stamp.total")}
        </span>
        {/* The shared well (#2042); `live` keeps this surface's caret and halo.
            No unit word: the stencilled `TOTAL` is the caption. Ink is the well's
            `-term-blue-bright` (4.68:1 light, 9.50:1 dark). */}
        <SingularityReadout value={formatPoints(total)} valueSize="var(--text-title)" live />
      </div>
    </div>
  );
}
