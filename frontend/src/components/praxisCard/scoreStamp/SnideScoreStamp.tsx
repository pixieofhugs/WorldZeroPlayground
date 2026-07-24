import { useTranslation } from "react-i18next";
import { TaskCrown } from "../../cards/TaskCrown";
import { scoreBreakdown, formatMult } from "./scoreBreakdown";
import type { ScoreStampProps } from "./ScoreStamp";

/**
 * The S.N.I.D.E. score stamp (#842, ADR-0049) — the EVIDENCE TAG wired to the
 * slab: a black well punched into the plate, tilted -3deg, ruled in acid and
 * printed with a hard (unblurred) drop shadow.
 *
 * The faction's TOTAL MARK is typographic, not graphic — Anton at the design's
 * 30 with a 2px hot-pink offset shadow, the misregistered second pass of a
 * two-colour photocopy. That mark is S.N.I.D.E.'s signature and it was absent
 * entirely until this issue: #821's one generic tilted plate rendered the same
 * numeral every faction got.
 *
 * Row SELECTION stays in `scoreBreakdown` (ADR-0047) — this file is presentation
 * only. Each optional row is its own line so the tag stays legible across all
 * five conditional states; nothing here is positioned relative to a row that
 * may not exist.
 */
export default function SnideScoreStamp({ praxis, showCrown }: ScoreStampProps) {
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
        // No borderRadius: the tag is cut, not rounded.
        background: "var(--faction-snide-stamp-bg)",
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

      {/* Base, with the pink multiplier chip stuck on at the right. */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)", whiteSpace: "nowrap" }}>
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-sm)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--faction-snide-vote-off)",
          }}
        >
          {t("card.stamp.base")}
        </span>
        <span
          style={{
            fontFamily: "var(--faction-snide-font-impact)",
            // eslint-disable-next-line local/no-raw-style-values -- ornament: Anton figure struck at the design's 27, a poster face rather than text (§4a)
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

      {meta !== null && (
        <div
          style={{
            fontFamily: "var(--font-body)",
            fontWeight: 700,
            // eslint-disable-next-line local/no-raw-style-values -- ornament: typewriter working on the tag, the design's 11 (§4a)
            fontSize: 11,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--faction-snide-acid)",
            marginTop: "var(--space-xs)",
          }}
        >
          {t("card.stamp.meta")} +{meta}
        </div>
      )}

      <div
        style={{
          fontFamily: "var(--font-body)",
          fontWeight: 700,
          // eslint-disable-next-line local/no-raw-style-values -- ornament: typewriter working on the tag, the design's 11 (§4a)
          fontSize: 11,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--faction-snide-acid)",
          marginTop: "var(--space-xs)",
        }}
      >
        {t("card.stamp.fromVotes", { votes })}
      </div>

      {/* Torn-off perforation, then the total mark. */}
      <div
        aria-hidden
        style={{
          height: 0,
          borderTop: "2px dashed var(--faction-snide-acid-deep)",
          opacity: 0.75,
          margin: "var(--space-sm) 0",
        }}
      />
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-xs)" }}>
        <span
          style={{
            fontFamily: "var(--faction-snide-font-impact)",
            // eslint-disable-next-line local/no-raw-style-values -- ornament: the signature total, Anton at the design's 30 over a misregistered pink pass (§4a)
            fontSize: 30,
            lineHeight: 0.78,
            color: "var(--faction-snide-acid)",
            textShadow: "2px 2px 0 var(--faction-snide-pink)",
          }}
        >
          {total.toFixed(1)}
        </span>
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-xs)",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--faction-snide-card-muted)",
          }}
        >
          {t("card.stamp.pointsShort")}
        </span>
      </div>
    </div>
  );
}
