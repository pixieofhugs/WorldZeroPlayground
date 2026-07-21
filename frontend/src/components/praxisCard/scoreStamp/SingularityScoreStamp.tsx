import { useTranslation } from "react-i18next";
import { TaskCrown } from "../../cards/TaskCrown";
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
 *  - the total prints to TWO decimals (`13.60`). ADR-0047 fixes the row
 *    selection, not the notation, and a terminal pads its output;
 *  - the votes row zero-pads to two digits (`+04`), for the same reason.
 * Row SELECTION stays in `scoreBreakdown` — a hidden row leaves the register
 * shorter, never gappy, so all five conditional states read as one read-out.
 */
export default function SingularityScoreStamp({ praxis, showCrown }: ScoreStampProps) {
  const { t } = useTranslation("praxis");
  if (praxis.total === null || praxis.total === undefined) return null;
  const { base, mult, meta, votes, total } = scoreBreakdown(praxis);
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
          innerBg="var(--faction-singularity-stamp-bg)"
          glyphColor="var(--faction-singularity-bracket)"
          rotate="0deg"
          style={{ position: "absolute", top: -13, right: -12, zIndex: 3 }}
        />
      )}

      <div style={{ ...rowStyle, marginTop: 0 }}>
        <span>{t("card.stamp.base")}</span>
        <span style={{ color: "var(--faction-singularity-terminal-ink)" }}>{base}</span>
      </div>

      {mult !== null && (
        <div style={rowStyle}>
          <span>{t("card.stamp.mult")}</span>
          <span style={{ color: "var(--faction-singularity-led-amber)" }}>{formatMult(mult)}</span>
        </div>
      )}

      {meta !== null && (
        <div style={rowStyle}>
          <span>{t("card.stamp.meta")}</span>
          <span style={{ color: "var(--faction-singularity-terminal-ink)" }}>+{meta}</span>
        </div>
      )}

      <div style={rowStyle}>
        <span>{t("card.stamp.votes")}</span>
        <span style={{ color: "var(--faction-singularity-terminal-ink)" }}>
          {`+${String(votes).padStart(2, "0")}`}
        </span>
      </div>

      <div
        aria-hidden
        style={{
          height: 1,
          background: "var(--faction-singularity-stamp-rule)",
          margin: "var(--space-sm) 0",
        }}
      />

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
