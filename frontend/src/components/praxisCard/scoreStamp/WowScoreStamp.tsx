import { useTranslation } from "react-i18next";
import { TaskCrown } from "../../factionMarks/TaskCrown";
import { scoreBreakdown, formatMult } from "./scoreBreakdown";
import { factionRoleVars } from "../../../utils/factionRoles";
import { factionBodyVars } from "../../../utils/factionBodyFace";
import { formatPoints } from "../../../utils/points";
import type { ScoreStampProps } from "./ScoreStamp";

/**
 * The Warriors of Whimsy score stamp (#840, ADR-0049/0050): an inset parchment
 * leaf, 2deg off true, hard shadow, working ruled off by a gold→plum bar, then the
 * total in "gold bright" and `✦`, the faction's total mark (the design README
 * carves it out). Whichever rows drop, total and star stay.
 *
 * #2042 for WOW is ONE GROUND, not one component: both its treatments are
 * typographic plaques, so there is nothing to extract. `--faction-wow-stamp-bg`
 * is the cream `-chronicle-bg` the card plaque is struck into (owner 2026-08-18);
 * measured in `pointsMarkUnification.test.tsx`. The devices still differ: #2070
 * ruled `✦` off the card's plaque. Neither star crosses; do not "unify" it.
 *
 * Rows match {@link DefaultScoreStamp}; selection and order are
 * `scoreBreakdown`'s (ADR-0047, #1131, #2634).
 */
export default function WowScoreStamp({ praxis, showCrown }: ScoreStampProps) {
  const { t } = useTranslation("praxis");
  if (praxis.score === null || praxis.score === undefined) return null;
  const { base, mult, meta, habit, votes, subtotal, total } = scoreBreakdown(praxis);
  const crowned = praxis.is_top_for_task && showCrown !== false;

  const workingStyle = {
    fontFamily: "var(--faction-wow-body-font)",
    fontStyle: "italic" as const,
    fontSize: "var(--text-md)",
    color: "var(--wow-score-stamp-accent)",
    marginTop: "var(--space-xs)",
  };

  return (
    <div
      style={{
        // Surface-owned prefix (#2674): the stamp travels through four hosts and
        // must not borrow theirs. Reads fall back to today's tokens.
        ...factionBodyVars("wow"), ...factionRoleVars("wow", "wow-score-stamp"),
        position: "relative",
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

      {/* Written only when something moved the figure (#1131). */}
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
              color: "var(--wow-score-stamp-quiet)",
            }}
          >
            {t("card.stamp.base")}
          </span>
          <span
            style={{
              fontFamily: "var(--wow-score-stamp-face)",
              // eslint-disable-next-line local/no-raw-style-values -- ornament: the chronicle's base numeral, the design's 25 (§4a)
              fontSize: 25,
              lineHeight: 0.8,
              color: "var(--wow-score-stamp-ink)",
            }}
          >
            {base}
          </span>
          {mult !== null && (
            <span
              style={{
                marginLeft: "auto",
                fontFamily: "var(--wow-score-stamp-face)",
                fontSize: "var(--text-lg)",
                color: "var(--faction-wow-on-plum)",
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

      {/* Subtotal under a flat gold hairline, gated on the multiplier (#2634).
          Never the gold→plum bar: that is the one separating rule (ADR-0076).
          `12 × 0.8` is `9.600000000000001` in doubles (#1866). */}
      {subtotal !== null && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            borderTop: "1px solid var(--faction-wow-chronicle-gold)",
            marginTop: "var(--space-xs)",
            paddingTop: "var(--space-xs)",
          }}
        >
          <span style={{ ...workingStyle, marginTop: undefined }}>
            {t("card.stamp.subtotal")}
          </span>
          <span
            style={{
              fontFamily: "var(--wow-score-stamp-face)",
              // eslint-disable-next-line local/no-raw-style-values -- ornament: the subtotal numeral, one step under the base's 25 (§4a)
              fontSize: 20,
              lineHeight: 0.8,
              color: "var(--wow-score-stamp-ink)",
            }}
          >
            {formatPoints(subtotal)}
          </span>
        </div>
      )}

      {meta !== null && (
        <div style={workingStyle}>
          {t("card.stamp.meta")} +{meta}
        </div>
      )}

      {/* No lead when the tally is the first line (#1131). */}
      {votes !== null && (
        <div
          style={{
            ...workingStyle,
            marginTop: base !== null ? workingStyle.marginTop : undefined,
          }}
        >
          {t("card.stamp.votes")} +{votes}
        </div>
      )}

      {/* Habit (#1617): flat, outside the multiplier. */}
      {habit !== null && (
        <div style={workingStyle}>
          {t("card.stamp.habit")} +{habit}
        </div>
      )}

      {/* No working, no separating rule (ADR-0076). */}
      {base !== null && (
        <div
          aria-hidden
          style={{
            height: 2,
            background:
              "linear-gradient(90deg, var(--faction-wow-chronicle-gold), var(--wow-score-stamp-accent))",
            opacity: 0.8,
            margin: "var(--space-sm) 0 var(--space-xs)",
          }}
        />
      )}
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-xs)" }}>
        <span
          style={{
            fontFamily: "var(--wow-score-stamp-face)",
            // eslint-disable-next-line local/no-raw-style-values -- ornament: the bottom-line total, the design's 29 (§4a)
            fontSize: 29,
            lineHeight: 0.8,
            color: "var(--faction-wow-stamp-total)",
            display: "inline-block",
          }}
        >
          {formatPoints(total)}
        </span>
        <span
          aria-hidden
          style={{
            fontFamily: "var(--wow-score-stamp-face)",
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
