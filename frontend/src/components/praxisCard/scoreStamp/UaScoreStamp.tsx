import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { TaskCrown } from "../../cards/TaskCrown";
import { Enso } from "../../factionMarks";
import { scoreBreakdown, formatMult } from "./scoreBreakdown";
import type { ScoreStampProps } from "./ScoreStamp";

/**
 * The UA score stamp (#857, ADR-0049) — the SCORE BOX and the ENSŌ, the two
 * objects the praxis handoff draws in UA's right column.
 *
 * The box is a quiet ruled plate on the lifted sheet: `base` in engraved caps,
 * the figure in Cormorant beside it, the multiplier chip pinned to the right
 * rail on the same no-wrap row, then the working underneath in EB Garamond
 * italic. Below it, overlapping by a few pixels, the {@link Enso} carries the
 * total — Cormorant over a letter-spaced `points` caption, centred in the ring.
 * #821 had neither: one generic tilted plate stood in for both, which is what
 * ADR-0049 exists to stop happening again.
 *
 * WHY THIS CARD IS WARM WHEN THE FACTION IS NOT. UA has two live plans and the
 * owner split them by surface: the praxis handoff wins the praxis card, the
 * identity kit (#788, #848–853) wins everything else. The card therefore keeps
 * vermilion-on-vellum and its ensō. Every colour here resolves from the
 * `--faction-ua-card-*` block minted for exactly this purpose — nothing reads
 * the legacy gilt-salon token family (ua-gold, ua-gilt, ua-ink, ua-paper,
 * ua-line …) that #853 deletes.
 *
 * ROW SELECTION IS NOT OURS. `scoreBreakdown` decides which rows exist
 * (ADR-0047); this file only decides what a row looks like. The votes row
 * survives at `+0` — a declared deviation from the design, which drops it.
 *
 * Every raw number below is ornament: the plate's own insets and leads, and
 * display type sized to the drawing rather than to the text scale (§4a).
 */

/** The design's box width. Ornament geometry, not layout spacing. */
const BOX_WIDTH = 134;
/** The ensō on the card. The conditional-state sheets draw it at 118. */
const ENSO_SIZE = 138;

const labelStyle: CSSProperties = {
  fontFamily: "var(--faction-ua-body-font)",
  // eslint-disable-next-line local/no-raw-style-values -- ornament: engraved cap label, sized to the plate.
  fontSize: 10.5,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--faction-ua-card-muted)",
};

const workingStyle: CSSProperties = {
  fontFamily: "var(--faction-ua-body-font)",
  fontStyle: "italic",
  // eslint-disable-next-line local/no-raw-style-values -- ornament: the working written under the plate's rule.
  fontSize: 12,
  color: "var(--faction-ua-card-muted)",
};

/** The vermilion chip that carries the multiplier. */
function MultChip({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        marginLeft: "auto",
        fontFamily: "var(--faction-ua-card-font)",
        fontWeight: 600,
        // eslint-disable-next-line local/no-raw-style-values -- ornament: chip lettering, sized to the pill.
        fontSize: 13,
        color: "var(--faction-ua-card-chip-ink)",
        background: "var(--faction-ua-card-chip-bg)",
        borderRadius: 3,
        // eslint-disable-next-line local/no-raw-style-values -- ornament: the chip's drawn inset, not a gutter.
        padding: "2px 7px",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export default function UaScoreStamp({ praxis, showCrown }: ScoreStampProps) {
  const { t } = useTranslation("praxis");
  if (praxis.score === null || praxis.score === undefined) return null;
  const { base, mult, meta, votes, total } = scoreBreakdown(praxis);
  const crowned = praxis.is_top_for_task && showCrown !== false;

  return (
    <div
      style={{
        position: "relative",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        // eslint-disable-next-line local/no-raw-style-values -- ornament: the composition's own lead, plate to ring.
        gap: 3,
      }}
    >
      {crowned && (
        <TaskCrown
          size={26}
          ringInset={3}
          innerBg="var(--faction-ua-card-box-bg)"
          glyphColor="var(--faction-ua-card-frame)"
          rotate="-5deg"
          style={{ position: "absolute", top: -13, right: -10, zIndex: 3 }}
        />
      )}

      {/* The score box — a ruled plate on the lifted sheet. */}
      <div
        style={{
          boxSizing: "border-box",
          width: BOX_WIDTH,
          border: "1px solid var(--faction-ua-card-rule)",
          borderRadius: 6,
          background: "var(--faction-ua-card-box-bg)",
          // eslint-disable-next-line local/no-raw-style-values -- ornament: the plate's inset within its own rule.
          padding: "7px 11px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            // eslint-disable-next-line local/no-raw-style-values -- ornament: lead between the cap label and its figure.
            gap: 7,
            whiteSpace: "nowrap",
          }}
        >
          <span style={labelStyle}>{t("card.stamp.base")}</span>
          <span
            style={{
              fontFamily: "var(--faction-ua-card-font)",
              fontWeight: 600,
              // eslint-disable-next-line local/no-raw-style-values -- ornament: the plate's engraved figure.
              fontSize: 25,
              lineHeight: 0.8,
              color: "var(--faction-ua-card-text)",
            }}
          >
            {base}
          </span>
          {/*
           * The chip stays on the base row in EVERY state. The design's
           * "full formula" column moves it onto a `× mult` row of its own; the
           * other four keep it here, and a plate that rearranges itself stops
           * reading as the same object when a row drops out (§6 — the archetype
           * is the identity). Declared deviation.
           */}
          {mult !== null && <MultChip>{formatMult(mult)}</MultChip>}
        </div>

        {meta !== null && (
          <div
            style={{
              ...workingStyle,
              color: "var(--faction-ua-card-accent)",
              // eslint-disable-next-line local/no-raw-style-values -- ornament: the plate's lead between working lines.
              marginTop: 3,
            }}
          >
            + {meta} {t("card.stamp.meta")}
          </div>
        )}

        {/*
         * The grouped subtotal, drawn under a hairline. It exists only when a
         * metatask AND a multiplier are both live — the design's "full formula"
         * column — because without a multiplier `(base + meta)` explains
         * nothing and the plate reads as a form with a hole in it.
         */}
        {meta !== null && mult !== null && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              borderTop: "1px solid var(--faction-ua-card-rule)",
              // eslint-disable-next-line local/no-raw-style-values -- ornament: the drawn rule's clearance.
              marginTop: 5,
              // eslint-disable-next-line local/no-raw-style-values -- ornament: matches the lead of the working lines.
              paddingTop: 3,
            }}
          >
            <span style={workingStyle}>{t("card.stamp.group")}</span>
            <span
              style={{
                fontFamily: "var(--faction-ua-card-font)",
                fontWeight: 600,
                // eslint-disable-next-line local/no-raw-style-values -- ornament: the subtotal figure, a step under base.
                fontSize: 20,
                lineHeight: 0.9,
                color: "var(--faction-ua-card-text)",
              }}
            >
              {base + meta}
            </span>
          </div>
        )}

        {/*
         * The votes row survives at `+0` — ADR-0047 beats the design here, which
         * drops the line when votes are zero. Deliberate, and the same call
         * every other #841 stamp makes.
         */}
        <div
          style={{
            ...workingStyle,
            // eslint-disable-next-line local/no-raw-style-values -- ornament: the plate's lead between working lines.
            marginTop: 3,
          }}
        >
          {t("card.stamp.fromVotes", { votes })}
        </div>
      </div>

      {/* The total mark — the ensō, holding the figure in its ring. */}
      <div
        style={{
          position: "relative",
          width: ENSO_SIZE,
          height: ENSO_SIZE,
          // ornament: the ring overlaps the plate's foot; that overlap IS the
          // drawing. No directive — a unary minus is not a Literal, so the rule
          // never sees it (one of the #750 laundering shapes) and the directive
          // would report as unused.
          marginTop: -6,
        }}
      >
        <Enso size={ENSO_SIZE} color="var(--faction-ua-card-enso)" />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            // eslint-disable-next-line local/no-raw-style-values -- ornament: hairline lead between figure and caption.
            gap: 1,
          }}
        >
          <span
            style={{
              fontFamily: "var(--faction-ua-card-font)",
              fontWeight: 600,
              // eslint-disable-next-line local/no-raw-style-values -- ornament: the total, set to fill the brush ring.
              fontSize: 38,
              lineHeight: 0.8,
              color: "var(--faction-ua-card-total)",
            }}
          >
            {total.toFixed(1)}
          </span>
          <span
            style={{
              fontFamily: "var(--faction-ua-body-font)",
              // eslint-disable-next-line local/no-raw-style-values -- ornament: the caption inside the ring.
              fontSize: 8.5,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--faction-ua-card-points)",
            }}
          >
            {t("card.stamp.points")}
          </span>
        </div>
      </div>
    </div>
  );
}
