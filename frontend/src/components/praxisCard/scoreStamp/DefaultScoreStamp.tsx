import { useTranslation } from "react-i18next";
import { TaskCrown } from "../../cards/TaskCrown";
import { scoreBreakdown, formatMult } from "./scoreBreakdown";
import type { ScoreStampProps } from "./ScoreStamp";

/**
 * The Default / `na` score stamp — the unaffiliated SPECTRUM sheet (ADR-0039,
 * ADR-0049), and the fall-through every faction renders until its own slice
 * lands (#840 / #841 / #842).
 *
 * Two objects, as the design specifies: a bordered SCORE BOX (`base 12`, the
 * `×0.80` chip, the italic `+ 4 from votes`) and, under a rainbow hairline, the
 * unaffiliated TOTAL MARK — the total background-clipped to the community
 * rainbow over a `POINTS` label. Unlike UA (whose ensō sits outside the box),
 * the unaffiliated mark is nested inside the box's border; that is how the
 * prototype draws it.
 *
 * The rainbow-band frame #821 wrapped this in is gone — it had no design source.
 * Colours are only `--faction-default-*` tokens, so the whole stamp flips
 * through the `[data-theme="dark"]` cascade with no `dark ?` branch.
 */
export default function DefaultScoreStamp({ praxis, showCrown }: ScoreStampProps) {
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
        border: "1px solid var(--faction-default-card-line)",
        borderRadius: 8,
        background: "var(--faction-default-stamp-bg)",
        color: "var(--faction-default-card-text)",
        boxShadow: "0 2px 6px rgba(34, 26, 18, 0.1)",
        // A sheet of scrap tucked into the record, not a printed field.
        transform: "rotate(-1deg)",
        padding: "var(--space-sm) var(--space-md) var(--space-md)",
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

      {/* Score box — base numeral with the multiplier chip pinned right. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-sm)",
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-sm)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--faction-default-vote-off)",
          }}
        >
          {t("card.stamp.base")}
        </span>
        <span
          style={{
            fontFamily: "var(--faction-default-card-font)",
            fontSize: "var(--text-title)",
            lineHeight: 0.8,
          }}
        >
          {base}
        </span>
        {mult !== null && (
          <span
            style={{
              marginLeft: "auto",
              fontFamily: "var(--faction-default-card-font)",
              fontSize: "var(--text-lg)",
              letterSpacing: "0.04em",
              // Rainbow appearance 2 of 4 is the RULE below; the chip carries
              // the design's own short green-to-blue ramp, not the spectrum.
              color: "var(--faction-default-chip-text)",
              background: "var(--faction-default-chip)",
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
            fontFamily: "var(--font-body)",
            fontStyle: "italic",
            fontSize: "var(--text-base)",
            color: "var(--faction-default-card-muted)",
            marginTop: "var(--space-xs)",
          }}
        >
          {t("card.stamp.meta")} +{meta}
        </div>
      )}

      <div
        style={{
          fontFamily: "var(--font-body)",
          fontStyle: "italic",
          fontSize: "var(--text-base)",
          letterSpacing: "0.04em",
          color: "var(--faction-default-card-muted)",
          marginTop: "var(--space-xs)",
        }}
      >
        {t("card.stamp.fromVotes", { votes })}
      </div>

      {/* Rainbow hairline, then the total mark. */}
      <div
        aria-hidden
        style={{
          height: 1,
          background: "var(--faction-default-rainbow)",
          margin: "var(--space-sm) 0",
        }}
      />
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-xs)", lineHeight: 1 }}>
        <span
          style={{
            fontFamily: "var(--faction-default-card-font)",
            fontSize: "var(--text-heading)",
            lineHeight: 1.15,
            // Rainbow appearance 3 of 4: the total, clipped to the design's
            // warmer four-stop ramp rather than the full seven-stop spectrum,
            // which smears to mud at four glyphs wide.
            background: "var(--faction-default-total-rainbow)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {total.toFixed(1)}
        </span>
        <span
          style={{
            fontFamily: "var(--faction-default-card-font)",
            fontSize: "var(--text-base)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--faction-default-gold)",
          }}
        >
          {t("card.stamp.points")}
        </span>
      </div>
    </div>
  );
}
