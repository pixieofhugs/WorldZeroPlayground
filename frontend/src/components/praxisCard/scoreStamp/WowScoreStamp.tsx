import { useTranslation } from "react-i18next";
import { TaskCrown } from "../../factionMarks/TaskCrown";
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
 * (ADR-0047) — base included, which drops out when it would only repeat the
 * total under the rule (#1131). Everything else is the chronicle: MedievalSharp figures, Lora
 * italic for the working, the plum chip, the gold rule.
 */
export default function WowScoreStamp({ praxis, showCrown }: ScoreStampProps) {
  const { t } = useTranslation("praxis");
  if (praxis.score === null || praxis.score === undefined) return null;
  const { base, mult, meta, habit, votes, total } = scoreBreakdown(praxis);
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
          rotate="8deg"
          style={{ position: "absolute", top: -13, right: -12, zIndex: 3 }}
        />
      )}

      {/* Base, with the plum multiplier chip pinned to the right rail. The entry
          is only written when something moved the figure (#1131); the total under
          the gold rule already states it otherwise. The chip rides this line and
          may: a live multiplier is one of the things that keeps the line. */}
      {base !== null && (
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
      )}

      {meta !== null && (
        <div style={workingStyle}>
          {t("card.stamp.meta")} +{meta}
        </div>
      )}

      {/* The tally, when there are votes to enter (ADR-0076). Its lead belongs to
          the line above, so it goes when the base entry does (#1131) and the leaf
          keeps its own inset. */}
      {votes !== null && (
        <div
          style={{
            ...workingStyle,
            marginTop: base !== null ? workingStyle.marginTop : undefined,
          }}
        >
          {t("card.stamp.fromVotes", { votes })}
        </div>
      )}

      {/* The habit bonus, entered after the tally: flat, outside the multiplier
          (#1617). It always has a line above it, so it always keeps its lead. */}
      {habit !== null && (
        <div style={workingStyle}>
          {t("card.stamp.habit")} +{habit}
        </div>
      )}

      {/* The gold→plum hairline, then the total and its star. The hairline rules
          the working off from the total, so it goes when the working does
          (ADR-0076) — `base !== null` is the resolver's own test for that. */}
      {base !== null && (
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
      )}
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-xs)" }}>
        {/* WOW hangs its points upside down (#1716) — an owner ruling, and only
            where a player is BROWSING. This stamp is ADR-0049's single mount for
            every surface that shows a total (the card, the praxis-detail rail,
            the composer's waiting slip), so the angle is not the stamp's to
            decide: `--wow-points-flip` is a knob the MOUNT sets, the
            `--praxis-card-basis` shape (#1137, §1.2) — the same knob the task
            card's plaque reads, because it is one ruling. Unset resolves to
            `0deg`, which is byte-identical to what this rendered before — so
            the two checking surfaces stay upright by construction, and only
            `WowPraxisCard` turns it.

            A TRANSFORM on the presentation, never reversed or substituted
            characters: the digits keep their reading order in the DOM, so the
            total is still announced and still selectable. It composes with the
            leaf's own two-degree strike, which lives on the root above. */}
        <span
          style={{
            fontFamily: "var(--faction-wow-card-font)",
            // eslint-disable-next-line local/no-raw-style-values -- ornament: the bottom-line total, the design's 29 (§4a)
            fontSize: 29,
            lineHeight: 0.8,
            color: "var(--faction-wow-stamp-total)",
            display: "inline-block",
            transform: "rotate(var(--wow-points-flip, 0deg))",
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
