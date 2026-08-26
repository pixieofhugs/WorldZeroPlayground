import { useTranslation } from "react-i18next";
import { TaskCrown } from "../../factionMarks/TaskCrown";
import { scoreBreakdown, formatMult } from "./scoreBreakdown";
import { factionRoleVars } from "../../../utils/factionRoles";
import { formatPoints } from "../../../utils/points";
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
 * ## WOW IS THE ONE FACTION #2042 COULD NOT UNIFY, and it is not for want of trying
 *
 * #2042 rules that a faction's points mark is ONE drawing and the point card takes
 * the task card's. Singularity, S.N.I.D.E. and `na` did that. WOW cannot, because
 * the two directions are each closed — one by arithmetic, one by an owner ruling:
 *
 *   - TAKING THE CARD'S MARK. `WowTaskCard`'s device is the crowned points plaque:
 *     `--faction-wow-chronicle-panel` behind a 2px gold frame, an inset plate
 *     struck into the decree's parchment. This stamp's plate is
 *     `--faction-wow-stamp-bg`, and index.css declares that
 *     `var(--faction-wow-chronicle-panel)` on `:root, [data-theme]` — the SAME
 *     token. So the plaque here is **1.00:1 in both themes**: an inset plate with
 *     nothing to be inset into, reduced to a second gold frame inside the first,
 *     and `--faction-wow-chronicle-gold` on that panel is only 2.00:1 in light.
 *     Giving the plaque a fill that reads would mean picking a new WOW pairing,
 *     which is a design decision and not an extraction.
 *   - TAKING THIS STAMP'S MARK. The `✦` is WOW's total mark and the #840 design
 *     README carves it out by name. #2070 removed the `✦` from the card's plaque
 *     by owner ruling — "it is not in the design and the owner ruled it out" — so
 *     the star cannot travel the other way either.
 *
 * A `star?` prop on a shared plaque (the {@link PointsRoundel} `arcLabel` shape:
 * one optional element the other surface has not earned) would answer the second
 * objection and not the first. So WOW keeps two marks until somebody rules on the
 * plaque's ground here. Do not "fix" this by repainting the shared plaque to suit
 * one surface — that is how the other surface breaks.
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
    color: "var(--wow-score-stamp-accent)",
    marginTop: "var(--space-xs)",
  };

  return (
    <div
      style={{
        // THE ROLE MAP (#2674). `--wow-score-stamp-*` is declared on the plate
        // itself and read nowhere else — the prefix belongs to this SURFACE,
        // not to the app, and the stamp is mounted inside four different hosts
        // whose own prefixes it must not borrow or leak into. Every read below
        // carries today's token as its fallback, so not a pixel of the plate
        // moves.
        ...factionRoleVars("wow", "wow-score-stamp"),
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
        {/* The total MARK. Decorative to a screen reader — the figure beside it
            is the value; the star is the faction's device on it. */}
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
