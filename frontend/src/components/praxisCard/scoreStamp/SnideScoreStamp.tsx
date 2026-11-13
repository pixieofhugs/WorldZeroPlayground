import { useTranslation } from "react-i18next";
import { TaskCrown } from "../../factionMarks/TaskCrown";
import { PenCircle } from "../../factionMarks/snideAtoms";
import { scoreBreakdown, formatMult } from "./scoreBreakdown";
import { formatPoints } from "../../../utils/points";
import type { ScoreStampProps } from "./ScoreStamp";
import { factionBodyVars } from "../../../utils/factionBodyFace"

/**
 * The S.N.I.D.E. score stamp (#842, ADR-0049): the evidence tag, a black well
 * tilted -3deg, acid rule, hard shadow, the total circled in the shared pink pen
 * loop {@link PenCircle} (#2042). Rows and order are `scoreBreakdown`'s
 * (ADR-0047, #2634); each optional row is its own line, so nothing is positioned
 * against a row that may not exist.
 */
export default function SnideScoreStamp({ praxis, showCrown }: ScoreStampProps) {
  const { t } = useTranslation("praxis");
  if (praxis.score === null || praxis.score === undefined) return null;
  const { base, mult, meta, habit, votes, subtotal, total } = scoreBreakdown(praxis);
  const crowned = praxis.is_top_for_task && showCrown !== false;

  /* The loop stays 96; a long figure steps down a rung (#2638, owner
     2026-08-27/28). Counts DIGITS, not glyphs: `formatPoints` emits only digits
     and one point, and `PenCircle` documents a four-glyph `13.6` as fitting at
     `--text-heading`, so `1080` steps and `21.6` does not. Decimals become real in
     era 2 (`backend/eras/era_2.py`). Resolved here so the atom and the task card
     keep their rung; `DefaultPointsRing`/`SingularityReadout` share the latent
     crowding, out of scope. */
  const figure = formatPoints(total);
  const digits = figure.replace(/\D/g, "").length;
  const figureSize = digits >= 4 ? "var(--text-title)" : "var(--text-heading)";

  const typedLine = {
    fontFamily: "var(--faction-snide-font-type)",
    // eslint-disable-next-line local/no-raw-style-values -- ornament: typewriter working on the tag, the design's 11 (§4a)
    fontSize: 11,
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
    color: "var(--faction-snide-acid)",
    marginTop: "var(--space-xs)",
  };

  return (
    <div
      style={{ ...factionBodyVars("snide"),
        position: "relative",
        minWidth: 116,
        boxSizing: "border-box",
        // No borderRadius: the tag is cut, not rounded.
        background: "var(--faction-snide-note-bar)",
        border: "2px solid var(--faction-snide-acid)",
        boxShadow: "3px 4px 0 var(--faction-snide-stamp-shadow)",
        transform: "rotate(-3deg)",
        padding: "var(--space-sm) var(--space-md) var(--space-md)",
        lineHeight: 1.1,
      }}
    >
      {crowned && (
        <TaskCrown
          size={26}
          ringInset={3}
          rotate="7deg"
          style={{ position: "absolute", top: -13, right: -12, zIndex: 3 }}
        />
      )}

      {/* Typed only when something moved the figure (#1131); the chip leaves with it. */}
      {base !== null && (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)", whiteSpace: "nowrap" }}>
          <span
            style={{
              fontFamily: "var(--faction-snide-font-type)",
              fontSize: "var(--text-md)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--faction-snide-vote-off)",
            }}
          >
            {t("card.stamp.base")}
          </span>
          <span
            style={{
              fontFamily: "var(--faction-snide-font-black)",
              // eslint-disable-next-line local/no-raw-style-values -- ornament: Archivo Black figure struck at the design's 27, a poster face rather than text (§4a)
              fontSize: 27,
              lineHeight: 0.8,
              color: "var(--faction-snide-acid)",
            }}
          >
            {base}
          </span>
          {mult !== null && (
            <span
              style={{
                marginLeft: "auto",
                fontFamily: "var(--faction-snide-font-black)",
                // eslint-disable-next-line local/no-raw-style-values -- ornament: the stuck-on multiplier chip, the design's 11 (§4a)
                fontSize: 11,
                color: "var(--faction-snide-ink)",
                background: "var(--faction-snide-pink)",
                // eslint-disable-next-line local/no-raw-style-values -- ornament: the chip's drawn inset; rounding to a rung swells a sticker into a button (§4a)
                padding: "2px 5px",
                transform: "rotate(3deg)",
                whiteSpace: "nowrap",
              }}
            >
              {formatMult(mult)}
            </span>
          )}
        </div>
      )}

      {/* The half-tear: 1px against the perforation's 2px, so the tag never reads
          torn twice. Gated on the multiplier alone (#2634). `formatPoints`:
          `12 × 0.8` is `9.600000000000001` (#1866). */}
      {subtotal !== null && (
        <>
          <div
            aria-hidden
            style={{
              height: 0,
              borderTop: "1px dashed var(--faction-snide-acid-deep)",
              opacity: 0.75,
              margin: "var(--space-xs) 0 0",
            }}
          />
          <div style={typedLine}>
            {t("card.stamp.subtotal")} {formatPoints(subtotal)}
          </div>
        </>
      )}

      {meta !== null && <div style={typedLine}>{t("card.stamp.meta")} +{meta}</div>}

      {votes !== null && (
        <div
          style={{
            ...typedLine,
            // No lead when the tally is the first line (#1131).
            marginTop: base !== null ? typedLine.marginTop : undefined,
          }}
        >
          {t("card.stamp.votes")} +{votes}
        </div>
      )}

      {/* Habit (#1617): flat, outside the multiplier. */}
      {habit !== null && (
        <div style={typedLine}>
          {t("card.stamp.habit")} +{habit}
        </div>
      )}

      {/* The perforation tears the working off the total; no working, no tear (ADR-0076). */}
      {base !== null && (
        <div
          aria-hidden
          style={{
            height: 0,
            borderTop: "2px dashed var(--faction-snide-acid-deep)",
            opacity: 0.75,
            margin: "var(--space-sm) 0",
          }}
        />
      )}
      {/* Inks are this surface's, not the atom's defaults: the card's `-note-ink`
          is 1.05:1 on this plate in light. Figure is acid (16.31/16.81:1);
          caption is `-vote-off` (6.46:1), not `-card-muted`, which the wall
          frame re-points (#2177). The loop's 96 grows the 116 `minWidth`. */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <PenCircle
          size={96}
          value={figure}
          valueSize={figureSize}
          unit={t("card.stamp.pointsShort")}
          valueColor="var(--faction-snide-acid)"
          unitColor="var(--faction-snide-vote-off)"
        />
      </div>
    </div>
  );
}
