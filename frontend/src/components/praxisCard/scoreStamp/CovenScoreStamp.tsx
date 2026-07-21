import { useTranslation } from "react-i18next";
import { TaskCrown } from "../../cards/TaskCrown";
import { scoreBreakdown, formatMult } from "./scoreBreakdown";
import type { ScoreStampProps } from "./ScoreStamp";

/**
 * The Cozy Coven score stamp (#840, ADR-0049, ADR-0050) — the STICKER, and the
 * `✨` that closes it.
 *
 * This one is not a rectangle. The design draws a 2px DASHED sticker at
 * `rotate(-3deg)` with a 16px radius and a flat drop under it — a thing peeled
 * off a sheet and pressed onto the card, cut from the same die as the card's own
 * corners. #821 replaced it with the same upright plate every other faction got,
 * which is how a sticker becomes a table.
 *
 * Two more marks the design insists on and #821 flattened:
 *  • the multiplier chip is a HIGHLIGHTER stroke — yellow, pill-radius, and
 *    counter-rotated +3deg so it sits level while the sticker is crooked;
 *  • the rule above the total is DASHED, matching the sticker's own edge, not
 *    the solid hairline the shared box draws.
 *
 * Rows and their selection are the shared box's (ADR-0047 via `scoreBreakdown`);
 * the design files Coven under "the remaining box-pattern factions … follow the
 * Unaffiliated mechanism exactly". Only the presentation is Coven's.
 */
export default function CovenScoreStamp({ praxis, showCrown }: ScoreStampProps) {
  const { t } = useTranslation("praxis");
  if (praxis.total === null || praxis.total === undefined) return null;
  const { base, mult, meta, votes, total } = scoreBreakdown(praxis);
  const crowned = praxis.is_top_for_task && showCrown !== false;

  /** The working's voice — Caveat, bold, in the sticker's pink. */
  const workingStyle = {
    fontFamily: "var(--faction-coven-card-font)",
    fontWeight: 700,
    fontSize: "var(--text-xl)",
    color: "var(--faction-coven-sticker-accent)",
    marginTop: "var(--space-xs)",
  };

  return (
    <div
      style={{
        position: "relative",
        flexShrink: 0,
        minWidth: 118,
        boxSizing: "border-box",
        transform: "rotate(-3deg)",
        background: "var(--faction-coven-stamp-bg)",
        border: "2px dashed var(--faction-coven-stamp-edge)",
        borderRadius: 16, // the sticker's die-cut corner — see frameBase's note
        boxShadow: "0 3px 0 var(--faction-coven-stamp-shadow)",
        padding: "var(--space-sm) var(--space-md)",
        lineHeight: 1.1,
      }}
    >
      {crowned && (
        <TaskCrown
          size={26}
          ringInset={3}
          innerBg="var(--faction-coven-stamp-bg)"
          glyphColor="var(--faction-coven-sticker-accent)"
          rotate="8deg"
          style={{ position: "absolute", top: -13, right: -12, zIndex: 3 }}
        />
      )}

      {/* Base, with the highlighter chip pinned right and counter-rotated. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-xs)",
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            fontFamily: "var(--faction-coven-card-font)",
            fontWeight: 700,
            fontSize: "var(--text-xl)",
            color: "var(--faction-coven-sticker-muted)",
          }}
        >
          {t("card.stamp.base")}
        </span>
        <span
          style={{
            fontFamily: "var(--faction-coven-card-font)",
            fontWeight: 700,
            // eslint-disable-next-line local/no-raw-style-values -- ornament: the sticker's base numeral, the design's 28 (§4a)
            fontSize: 28,
            lineHeight: 0.7,
            color: "var(--faction-coven-card-text)",
          }}
        >
          {base}
        </span>
        {mult !== null && (
          <span
            style={{
              marginLeft: "auto",
              fontFamily: "var(--faction-coven-card-font)",
              fontWeight: 700,
              fontSize: "var(--text-xl)",
              // Counter-rotation, so the chip reads level on the crooked sticker.
              transform: "rotate(3deg)",
              color: "var(--faction-coven-stamp-chip-text)",
              background: "var(--faction-coven-stamp-chip-bg)",
              borderRadius: 10,
              padding: "0 var(--space-sm)",
            }}
          >
            {formatMult(mult)}
          </span>
        )}
      </div>

      {meta !== null && (
        <div style={workingStyle}>
          {t("card.stamp.meta")} +{meta}
        </div>
      )}

      <div style={workingStyle}>{t("card.stamp.fromVotes", { votes })}</div>

      {/* The dashed rule — the sticker's own edge, run across the middle. */}
      <div
        aria-hidden
        style={{
          height: 2,
          background:
            "repeating-linear-gradient(90deg, var(--faction-coven-stamp-edge) 0 4px, transparent 4px 8px)",
          margin: "var(--space-sm) 0 var(--space-xs)",
        }}
      />
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-xs)" }}>
        <span
          style={{
            fontFamily: "var(--faction-coven-card-font)",
            fontWeight: 700,
            // eslint-disable-next-line local/no-raw-style-values -- ornament: the sticker's bottom-line total, the design's 32 (§4a)
            fontSize: 32,
            lineHeight: 0.72,
            color: "var(--faction-coven-sticker-accent)",
          }}
        >
          {total.toFixed(1)}
        </span>
        {/* Coven's total mark. Decorative — the figure beside it is the value. */}
        <span
          aria-hidden
          // eslint-disable-next-line local/no-raw-style-values -- ornament: the ✨ device sized as a glyph, the design's 15 (§4a)
          style={{ fontSize: 15, lineHeight: 1 }}
        >
          ✨
        </span>
      </div>
    </div>
  );
}
