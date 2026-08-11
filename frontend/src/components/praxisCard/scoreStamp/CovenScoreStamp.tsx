import { useTranslation } from "react-i18next";
import { TaskCrown } from "../../factionMarks/TaskCrown";
import {
  Braid,
  CAPTION,
  CARD,
  BORDER,
  DEEP,
  GOLD,
  HAND,
  HOLD_INK,
  INK,
  READING,
  SHADOW,
} from "../../factionMarks/covenSlip";
import { scoreBreakdown, formatMult } from "./scoreBreakdown";
import type { ScoreStampProps } from "./ScoreStamp";

/**
 * The Cozy Coven score stamp (#840, ADR-0049, ADR-0050 → re-dressed by #1209).
 *
 * The working, written on the coven's candle-lit paper and pinned slightly
 * crooked. The rows and their selection are the shared box's (ADR-0047 via
 * `scoreBreakdown`); only the presentation is Coven's. That includes the base
 * line dropping out when it would only repeat the bottom-line total (#1131).
 *
 * WHAT #1209 SWAPPED, and what it kept.
 *
 * The `--faction-coven-stamp-*` family went with the pink marker sticker: the
 * blush stock, the dusty-rose 2px DASHED edge, the theme-invariant amber
 * highlighter chip and the flat drop under it were all the retired identity.
 * The paper is the ward's panel inside the slip's pink edge now, and the
 * multiplier chip takes the "you already hold this" gold — a measured pair
 * (`--faction-coven-slip-gold` under `--faction-coven-ward-hold-ink`, 6.20:1
 * light / 7.03:1 dark) where the amber was never measured against anything.
 *
 * THREE MARKS STAY, and each is a shape rather than a lo-fi token:
 *  • the `rotate(-3deg)` tilt and its `+3deg` counter-rotated chip — a thing
 *    pressed on by hand, and the ward pages keep everything hand-placed
 *    slightly off-square;
 *  • the working set in Caveat — this is the coven's HAND doing arithmetic in
 *    the margin, which is exactly the register Caveat is kept for;
 *  • the `✨` that closes the tally. Decorative; the figure beside it is the
 *    value.
 *
 * The dashed rule above the total is the one that did NOT survive: it existed to
 * match the sticker's dashed edge, and with the edge gone it matched nothing. It
 * is a braid, which is what rules a Coven surface.
 */
export default function CovenScoreStamp({ praxis, showCrown }: ScoreStampProps) {
  const { t } = useTranslation("praxis");
  if (praxis.score === null || praxis.score === undefined) return null;
  const { base, mult, meta, habit, votes, total } = scoreBreakdown(praxis);
  const crowned = praxis.is_top_for_task && showCrown !== false;

  /** The working's voice — the coven's hand, in the margin. */
  const workingStyle = {
    fontFamily: HAND,
    fontWeight: 700,
    fontSize: "var(--text-xl)",
    color: DEEP,
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
        background: CARD,
        border: `2px solid ${BORDER}`,
        borderRadius: 16, // the slip's die-cut corner — see frameBase's note
        boxShadow: SHADOW,
        padding: "var(--space-sm) var(--space-md)",
        lineHeight: 1.1,
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

      {/* Base, with the gold chip pinned right and counter-rotated. The line is
          only written when something moved the figure (#1131) — the bottom line
          already carries it otherwise — and the chip rides this line, which is
          safe: a live multiplier is one of the things that keeps the line. */}
      {base !== null && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-xs)",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ ...CAPTION, fontSize: "var(--text-base)" }}>
            {t("card.stamp.base")}
          </span>
          <span
            style={{
              fontFamily: READING,
              fontWeight: 600,
              // eslint-disable-next-line local/no-raw-style-values -- ornament: the slip's base numeral, the design's 28 (§4a)
              fontSize: 28,
              lineHeight: 0.7,
              color: INK,
            }}
          >
            {base}
          </span>
          {mult !== null && (
            <span
              style={{
                marginLeft: "auto",
                fontFamily: "var(--font-faction-rounded)",
                fontWeight: 700,
                fontSize: "var(--text-lg)",
                // Counter-rotation, so the chip reads level on the crooked slip.
                transform: "rotate(3deg)",
                color: HOLD_INK,
                background: GOLD,
                borderRadius: 10,
                padding: "0 var(--space-sm)",
              }}
            >
              {formatMult(mult)}
            </span>
          )}
        </div>
      )}

      {meta !== null && (
        <div style={workingStyle}>
          {t("card.stamp.meta")} +{meta}
        </div>
      )}

      {/* The tally, always. Its lead belongs to the line above it, so it goes
          when the base line does (#1131) and the slip keeps its own padding. */}
      <div
        style={{
          ...workingStyle,
          marginTop: base !== null ? workingStyle.marginTop : undefined,
        }}
      >
        {t("card.stamp.fromVotes", { votes })}
      </div>

      {/* The habit bonus, written after the tally: flat, outside the multiplier
          (#1617). It always has a line above it, so it always keeps its lead. */}
      {habit !== null && (
        <div style={workingStyle}>
          {t("card.stamp.habit")} +{habit}
        </div>
      )}

      {/* The braid — what rules a Coven surface. */}
      <Braid style={{ margin: "var(--space-sm) 0 var(--space-xs)" }} />

      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-xs)" }}>
        <span
          style={{
            fontFamily: READING,
            fontWeight: 600,
            // eslint-disable-next-line local/no-raw-style-values -- ornament: the slip's bottom-line total, the design's 32 (§4a)
            fontSize: 32,
            lineHeight: 0.72,
            color: DEEP,
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
