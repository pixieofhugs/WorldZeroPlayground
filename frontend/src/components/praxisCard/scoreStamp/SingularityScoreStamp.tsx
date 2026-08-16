import { useTranslation } from "react-i18next";
import { TaskCrown } from "../../factionMarks/TaskCrown";
import { scoreBreakdown, formatMult } from "./scoreBreakdown";
import type { ScoreStampProps } from "./ScoreStamp";

/**
 * The Singularity score stamp (#842, ADR-0049) — the COMPUTED READ-OUT. A darker
 * well set into the system slab, ruled in cyan, printing the working as aligned
 * `LABEL … value` register rows rather than a sentence.
 *
 * Its TOTAL MARK is typographic: `TOT` against the figure in cyan with a soft
 * halo and a blinking block cursor, the machine still holding the line open.
 *
 * TWO DELIBERATE FORMATTING CHOICES, both the design's and both faction voice
 * rather than data:
 *  - the total prints to TWO decimals (`13.60`). A row rule fixes the row
 *    selection, not the notation, and a terminal pads its output;
 *  - the votes row zero-pads to two digits (`+04`), for the same reason.
 * Row SELECTION stays in `scoreBreakdown` — a hidden row leaves the register
 * shorter, never gappy, so all five conditional states read as one read-out.
 * That includes `BASE`, which the resolver drops when the figure would only
 * restate `TOT` (#1131), and `VOTES`, which it drops at zero (ADR-0076). With
 * both gone the register is empty, so its rule goes too and the read-out is
 * `TOT` alone — the machine is not made to echo itself, nor to print `+00`.
 */
export default function SingularityScoreStamp({ praxis, showCrown }: ScoreStampProps) {
  const { t } = useTranslation("praxis");
  if (praxis.score === null || praxis.score === undefined) return null;
  const { base, mult, meta, habit, votes, total } = scoreBreakdown(praxis);
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

  /**
   * The register, as lines rather than fixed JSX, because since #1131 EVERY line
   * above the tally is optional — including `base` — and the read-out's first
   * line is the one that must not carry a leading gap. Whichever line comes
   * first gets `marginTop: 0`; the machine never prints a blank line at the top.
   */
  const lines: { key: string; label: string; value: string; valueColor: string }[] = [];
  if (base !== null) {
    lines.push({
      key: "base",
      label: t("card.stamp.base"),
      value: `${base}`,
      valueColor: "var(--faction-singularity-terminal-ink)",
    });
  }
  if (mult !== null) {
    lines.push({
      key: "mult",
      label: t("card.stamp.mult"),
      value: formatMult(mult),
      valueColor: "var(--faction-singularity-led-amber)",
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
      // The terminal pads its output — `+04`. Notation is this file's, not the
      // resolver's (a row rule fixes which rows exist, not how they read).
      value: `+${String(votes).padStart(2, "0")}`,
      valueColor: "var(--faction-singularity-terminal-ink)",
    });
  }
  // The habit bonus prints after the multiplier and beside votes — it is flat,
  // outside the parentheses (#1617) — and pads like every other line the machine
  // writes. Like votes since ADR-0076, the read-out omits a register the era
  // never wrote to rather than printing `+00`.
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
      style={{
        position: "relative",
        flexShrink: 0,
        minWidth: 120,
        boxSizing: "border-box",
        background: "var(--faction-singularity-stamp-bg)",
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
        <div key={line.key} style={{ ...rowStyle, marginTop: index === 0 ? 0 : rowStyle.marginTop }}>
          <span>{line.label}</span>
          <span style={{ color: line.valueColor }}>{line.value}</span>
        </div>
      ))}

      {/* The rule between the register and `TOT`. An empty register has nothing
          to rule off, so the read-out prints the total alone (ADR-0076). */}
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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "var(--space-sm)" }}>
        <span
          style={{
            // eslint-disable-next-line local/no-raw-style-values -- ornament: stencilled register label on the read-out, the design's 8 (§4a)
            fontSize: 8,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--faction-singularity-vote-off)",
          }}
        >
          {t("card.stamp.totalShort")}
        </span>
        <span
          style={{
            // eslint-disable-next-line local/no-raw-style-values -- ornament: the glowing computed total, the design's 22 in a monospace read-out (§4a)
            fontSize: 22,
            lineHeight: 0.8,
            color: "var(--faction-singularity-bracket)",
            textShadow: "0 0 8px var(--faction-singularity-total-glow)",
          }}
        >
          {total.toFixed(2)}
          <span aria-hidden className="sg-cursor">
            _
          </span>
        </span>
      </div>
    </div>
  );
}
