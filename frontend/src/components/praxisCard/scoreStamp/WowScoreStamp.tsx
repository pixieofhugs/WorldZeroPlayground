import { useTranslation } from "react-i18next";
import { TaskCrown } from "../../cards/TaskCrown";
import { scoreBreakdown, formatMult } from "./scoreBreakdown";
import type { ScoreStampProps } from "./ScoreStamp";

/**
 * The Warriors of Whimsy score stamp (#840, ADR-0049, ADR-0050) — the chronicle's
 * PARCHMENT PLATE and the ✦ TOTAL MARK.
 *
 * The design pastes a small inset leaf onto the chronicle, struck two degrees off
 * true with a hard offset shadow, and rules the working off from the bottom line
 * with a gold→plum hairline. Under that rule the total is set in the "gold
 * bright" reserved for exactly this one figure, and followed by `✦`.
 *
 * `✦` IS THE POINT. The retired four-point star survives here and only here —
 * the design README carves it out explicitly — and #821 losing it is half of why
 * this stamp is being rebuilt. It is the faction's total mark, not decoration:
 * whichever rows drop out, the total and its star stay.
 *
 * The design files WOW under the shared box pattern ("the remaining box-pattern
 * factions … follow the Unaffiliated mechanism exactly"), so the ROWS match
 * {@link DefaultScoreStamp} and row selection stays in `scoreBreakdown`
 * (ADR-0047). Everything else is the chronicle: MedievalSharp figures, Lora
 * italic for the working, the plum chip, the gold rule.
 */
export default function WowScoreStamp({ praxis, showCrown }: ScoreStampProps) {
  const { t } = useTranslation("praxis");
  if (praxis.total === null || praxis.total === undefined) return null;
  const { base, mult, meta, votes, total } = scoreBreakdown(praxis);
  const crowned = praxis.is_top_for_task && showCrown !== false;

  /** The working's voice: Lora italic, the chronicle's quiet secondary face. */
  const workingStyle = {
    fontFamily: "var(--faction-wow-body-font)",
    fontStyle: "italic" as const,
    fontSize: "var(--text-md)",
    color: "var(--faction-wow-card-accent)",
    marginTop: "var(--space-xs)",
  };

  return (
    <div
      style={{
        position: "relative",
        flexShrink: 0,
        minWidth: 116,
        boxSizing: "border-box",
        transform: "rotate(-2deg)",
        background: "var(--faction-wow-stamp-bg)",
        border: "2px solid var(--faction-wow-chronicle-border)",
        borderRadius: 6,
        boxShadow: "2px 3px 0 var(--faction-wow-stamp-shadow)",
        padding: "var(--space-sm) var(--space-md)",
        lineHeight: 1.1,
      }}
    >
      {crowned && (
        <TaskCrown
          size={26}
          ringInset={3}
          innerBg="var(--faction-wow-stamp-bg)"
          glyphColor="var(--faction-wow-chronicle-gold)"
          rotate="8deg"
          style={{ position: "absolute", top: -13, right: -12, zIndex: 3 }}
        />
      )}

      {/* Base, with the plum multiplier chip pinned to the right rail. */}
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
            fontFamily: "var(--faction-wow-body-font)",
            fontStyle: "italic",
            fontSize: "var(--text-base)",
            color: "var(--faction-wow-card-muted)",
          }}
        >
          {t("card.stamp.base")}
        </span>
        <span
          style={{
            fontFamily: "var(--faction-wow-card-font)",
            // eslint-disable-next-line local/no-raw-style-values -- ornament: the chronicle's base numeral, the design's 25 (§4a)
            fontSize: 25,
            lineHeight: 0.8,
            color: "var(--faction-wow-card-text)",
          }}
        >
          {base}
        </span>
        {mult !== null && (
          <span
            style={{
              marginLeft: "auto",
              fontFamily: "var(--faction-wow-card-font)",
              fontSize: "var(--text-lg)",
              color: "var(--faction-wow-stamp-chip-text)",
              background: "var(--faction-wow-stamp-chip-bg)",
              borderRadius: 4,
              padding: "0 var(--space-xs)",
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

      {/* The gold→plum hairline, then the total and its star. */}
      <div
        aria-hidden
        style={{
          height: 2,
          background:
            "linear-gradient(90deg, var(--faction-wow-chronicle-gold), var(--faction-wow-card-accent))",
          opacity: 0.8,
          margin: "var(--space-sm) 0 var(--space-xs)",
        }}
      />
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-xs)" }}>
        <span
          style={{
            fontFamily: "var(--faction-wow-card-font)",
            // eslint-disable-next-line local/no-raw-style-values -- ornament: the bottom-line total, the design's 29 (§4a)
            fontSize: 29,
            lineHeight: 0.8,
            color: "var(--faction-wow-stamp-total)",
          }}
        >
          {total.toFixed(1)}
        </span>
        {/* The total MARK. Decorative to a screen reader — the figure beside it
            is the value; the star is the faction's device on it. */}
        <span
          aria-hidden
          style={{
            fontFamily: "var(--faction-wow-card-font)",
            // eslint-disable-next-line local/no-raw-style-values -- ornament: the ✦ device sized as a glyph, the design's 13 (§4a)
            fontSize: 13,
            color: "var(--faction-wow-chronicle-gold)",
          }}
        >
          ✦
        </span>
      </div>
    </div>
  );
}
