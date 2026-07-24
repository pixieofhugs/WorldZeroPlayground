import { useTranslation } from "react-i18next";
import { TaskCrown } from "../../cards/TaskCrown";
import { Rubric } from "../../factionMarks";
import { scoreBreakdown, formatMult } from "./scoreBreakdown";
import type { ScoreStampProps } from "./ScoreStamp";

/**
 * The Ephemerists score stamp (#841, ADR-0049) — the codex's SCORE BOX with the
 * {@link Rubric} set into its foot.
 *
 * The design files this faction under the shared box pattern ("Ephemerists …
 * follow the Unaffiliated mechanism exactly"), so the row mechanics match
 * {@link DefaultScoreStamp} — base numeral with the multiplier chip pinned
 * right, the working underneath, then the total. Everything else is the codex:
 * gold leaf binding the box, the brighter leaf inside it, engraved caps for
 * every figure, the chip in celestial teal rather than spectrum, and the total
 * struck in rubrication red under a gold-to-verdigris hairline.
 *
 * Row selection stays in `scoreBreakdown` (ADR-0047); this file is presentation
 * only. Each optional row is its own line, so the box reads as a shorter or
 * longer entry in all five conditional states rather than as a form with gaps.
 */
export default function EphemeristsScoreStamp({ praxis, showCrown }: ScoreStampProps) {
  const { t } = useTranslation("praxis");
  if (praxis.score === null || praxis.score === undefined) return null;
  const { base, mult, meta, votes, total } = scoreBreakdown(praxis);
  const crowned = praxis.is_top_for_task && showCrown !== false;

  return (
    <div
      style={{
        position: "relative",
        flexShrink: 0,
        minWidth: 116,
        boxSizing: "border-box",
        background: "var(--eph-stamp-bg)",
        border: "1.5px solid var(--eph-frame)",
        borderRadius: 4,
        boxShadow: "0 2px 6px rgba(42, 29, 18, 0.12)",
        transform: "rotate(-1deg)",
        padding: "var(--space-sm) var(--space-md)",
        lineHeight: 1.1,
      }}
    >
      {crowned && (
        <TaskCrown
          size={26}
          ringInset={3}
          rotate="6deg"
          style={{ position: "absolute", top: -13, right: -12, zIndex: 3 }}
        />
      )}

      {/* Base, with the multiplier chip pinned to the right rail. */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)", whiteSpace: "nowrap" }}>
        <span
          style={{
            fontFamily: "var(--eph-serif)",
            fontSize: "var(--text-sm)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--eph-muted)",
          }}
        >
          {t("card.stamp.base")}
        </span>
        <span
          style={{
            fontFamily: "var(--eph-display)",
            fontWeight: 600,
            fontSize: "var(--text-title)",
            lineHeight: 0.8,
            color: "var(--eph-vellum-text)",
          }}
        >
          {base}
        </span>
        {mult !== null && (
          <span
            style={{
              marginLeft: "auto",
              fontFamily: "var(--eph-display)",
              fontSize: "var(--text-md)",
              color: "var(--faction-ephemerists-on-fill)",
              background: "var(--faction-ephemerists)",
              borderRadius: 3,
              padding: "0 var(--space-xs)",
            }}
          >
            {formatMult(mult)}
          </span>
        )}
      </div>

      {meta !== null && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-xs)",
            marginTop: "var(--space-xs)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--eph-display)",
              fontSize: "var(--text-sm)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--eph-parchment)",
              // The design's meta chip is spectrum green; here it is the deep
              // rubric — a manuscript marks an addition in red, and the gold
              // that would otherwise be the codex choice pays only 4.2:1
              // against parchment at this size.
              background: "var(--eph-rubric-deep)",
              borderRadius: 3,
              padding: "0 var(--space-xs)",
            }}
          >
            {t("card.stamp.meta")}
          </span>
          <span
            style={{
              fontFamily: "var(--eph-serif)",
              fontStyle: "italic",
              fontSize: "var(--text-md)",
              color: "var(--eph-muted)",
            }}
          >
            +{meta}
          </span>
        </div>
      )}

      <div
        style={{
          fontFamily: "var(--eph-serif)",
          fontStyle: "italic",
          fontSize: "var(--text-md)",
          color: "var(--eph-muted)",
          marginTop: "var(--space-xs)",
        }}
      >
        {t("card.stamp.fromVotes", { votes })}
      </div>

      {/* The total mark. */}
      <Rubric total={total.toFixed(1)} unitLabel={t("card.stamp.points")} />
    </div>
  );
}
