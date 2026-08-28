import { useTranslation } from "react-i18next";
import { TaskCrown } from "../../factionMarks/TaskCrown";
import SingularityReadout from "../../factionMarks/SingularityReadout";
import { scoreBreakdown, formatMult } from "./scoreBreakdown";
import { formatPoints } from "../../../utils/points";
import type { ScoreStampProps } from "./ScoreStamp";

/**
 * The Singularity score stamp (#842, ADR-0049) — the COMPUTED READ-OUT. A darker
 * well set into the system slab, ruled in cyan, printing the working as aligned
 * `LABEL … value` register rows rather than a sentence.
 *
 * Its TOTAL MARK is the LIT WELL, and since #2042 it is the faction's one drawing
 * rather than this file's: `TOTAL` stencilled against the figure in
 * {@link SingularityReadout}, with the soft halo and the blinking block cursor
 * that say the machine is still holding the line open. The well itself used to be
 * the task card's alone and the figure here was bare.
 *
 * ONE DELIBERATE FORMATTING CHOICE, the design's and faction voice rather than
 * data: the votes row zero-pads to two digits (`+04`), because a terminal pads
 * its output.
 *
 * The TOTAL used to be the second such choice — two decimals, `13.60` — and the
 * owner ruled it drift, not voice (#1866): it made a whole 10 read `10.00` here
 * and `10.0` on the other seven, which is one figure printed three ways. It goes
 * through the shared `formatPoints` with every other stamp now.
 *
 * ROW ORDER stays there too, since #2634: base with the ratio struck on it, the
 * subtotal under a rule, then `+ meta`, `+ votes`, `+ habit`, then the register
 * rule and the lit well. What moved is the ratio — off a register line of its
 * own and onto the base line — and what arrived is the subtotal the read-out
 * never printed.
 *
 * Row SELECTION stays in `scoreBreakdown` — a hidden row leaves the register
 * shorter, never gappy, so all five conditional states read as one read-out.
 * That includes `BASE`, which the resolver drops when the figure would only
 * restate `TOTAL` (#1131), and `VOTES`, which it drops at zero (ADR-0076). With
 * both gone the register is empty, so its rule goes too and the read-out is
 * `TOTAL` alone — the machine is not made to echo itself, nor to print `+00`.
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

  /**
   * The register, as lines rather than fixed JSX, because since #1131 EVERY line
   * above the tally is optional — including `base` — and the read-out's first
   * line is the one that must not carry a leading gap. Whichever line comes
   * first gets `marginTop: 0`; the machine never prints a blank line at the top.
   *
   * THE ORDER IS THE SHARED ONE SINCE #2634: base (with the ratio struck on the
   * same line), the register's own rule, the subtotal, then the three additive
   * terms. `chip` is the ratio; `ruled` draws the hairline above a line.
   */
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
      // The ratio is printed ON the base line, in the amber it already wore as a
      // register of its own (#2634). It is not a term the machine adds — under
      // #2633's formula it applies to the base and to nothing else — and a
      // read-out that gave it a line implied a fifth addend.
      chip: mult !== null ? formatMult(mult) : undefined,
    });
  }
  // The subtotal — what the ratio made of the base — under a rule of the
  // register's own. Gated on the multiplier ALONE, and printed through
  // `formatPoints` like `TOTAL` below: `12 × 0.8` is `9.600000000000001` in
  // doubles, and #1866 already ruled that this stamp does not invent its own
  // rounding.
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
        <div key={line.key}>
          {/* THE SUBTOTAL'S RULE — the same phosphor hairline the register/TOTAL
              rule below draws, at half strength. One rule material, two weights:
              the machine parts a line from its own result more quietly than it
              parts the whole register from the bottom line. */}
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

      {/* The rule between the register and `TOTAL`. An empty register has nothing
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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-sm)" }}>
        <span
          style={{
            // eslint-disable-next-line local/no-raw-style-values -- ornament: stencilled register label on the read-out, the design's 8 (§4a)
            fontSize: 8,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--faction-singularity-vote-off)",
          }}
        >
          {t("card.stamp.total")}
        </span>
        {/* THE TOTAL SITS IN THE LIT WELL (#2042). It was a bare glowing numeral
            here and a bordered well on the task card — one faction drawing its
            points mark twice — and the owner's ruling is that the point card
            reflects the card's total look. The drawing is
            {@link SingularityReadout} now; `live` is what keeps this surface's
            own signature, the caret and the halo, which the task card does not
            take (its cursor already trails the sign-up prompt).

            The figure lands on `--text-title` (24) where it was a raw 22: the
            well is the same drawing on both surfaces, so its numeral answers to
            the type scale rather than to a per-surface tuning, and 24 is the rung
            the card's own mobile well already asks for. No unit word — the
            stencilled `TOTAL` to its left is this surface's caption, and the well
            printing `POINTS` beside it would say the same thing twice.

            The ink moves from `-bracket` (7.83:1 on the plate) to the well's own
            `-term-blue-bright` — 4.68:1 light, 9.50:1 dark on the well's ground,
            which is the pairing the well carries with it rather than a new one.
            Over AA_NORMAL in both themes, and the figure is large text besides. */}
        <SingularityReadout value={formatPoints(total)} valueSize="var(--text-title)" live />
      </div>
    </div>
  );
}
