import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { TaskCrown } from "../../factionMarks/TaskCrown";
import { UaEnsoScore } from "../../factionMarks/uaAtoms";
import { scoreBreakdown, formatMult } from "./scoreBreakdown";
import { formatPoints } from "../../../utils/points";
import { factionRoleVars } from "../../../utils/factionRoles";
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
 * (ADR-0047, ADR-0076); this file only decides what a row looks like. The votes
 * row goes at zero, which is what the design drew — the deviation this file used
 * to declare against it is withdrawn. The base row does NOT survive a total it
 * merely repeats (#1131): with nothing to multiply, add or vote there is no
 * working at all, so the plate goes with it and the ensō holds the figure alone.
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
  color: "var(--leaf-score-stamp-quiet)",
};

const workingStyle: CSSProperties = {
  fontFamily: "var(--faction-ua-body-font)",
  fontStyle: "italic",
  // eslint-disable-next-line local/no-raw-style-values -- ornament: the working written under the plate's rule.
  fontSize: 12,
  color: "var(--leaf-score-stamp-quiet)",
};

/** The vermilion chip that carries the multiplier. */
function MultChip({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        marginLeft: "auto",
        fontFamily: "var(--leaf-score-stamp-face)",
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
  const { base, mult, meta, habit, votes, total } = scoreBreakdown(praxis);
  const crowned = praxis.is_top_for_task && showCrown !== false;

  return (
    <div
      style={{
        // The nine roles under this surface's prefix (#2659/#2673). The two
        // module-level style objects and `MultChip` above are all mounted
        // inside this root, so the cascade reaches them.
        ...factionRoleVars("ua", "leaf-score-stamp"),
        position: "relative",
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
          rotate="-5deg"
          style={{ position: "absolute", top: -13, right: -10, zIndex: 3 }}
        />
      )}

      {/* The score box — a ruled plate on the lifted sheet. It is drawn only
          when a working line survives to sit in it: with none, the plate would
          be an empty ruled box over the ensō (ADR-0076). `base !== null` is the
          resolver's own test for that — it nulls the base exactly when no other
          term is in play. */}
      {base !== null && (
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
          {/*
           * The base row. It goes when `scoreBreakdown` nulls the figure (#1131) —
           * the ensō below is already saying it — and the chip goes with it, which
           * is safe because a live multiplier is one of the things that keeps the
           * base row alive in the first place.
           */}
          {base !== null && (
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
                  fontFamily: "var(--leaf-score-stamp-face)",
                  fontWeight: 600,
                  // eslint-disable-next-line local/no-raw-style-values -- ornament: the plate's engraved figure.
                  fontSize: 25,
                  lineHeight: 0.8,
                  color: "var(--leaf-score-stamp-ink)",
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
          )}

          {meta !== null && (
            <div
              style={{
                ...workingStyle,
                color: "var(--leaf-score-stamp-accent)",
                // eslint-disable-next-line local/no-raw-style-values -- ornament: the plate's lead between working lines.
                marginTop: 3,
              }}
            >
              + {meta} {t("card.stamp.meta")}
            </div>
          )}

          {/*
           * The subtotal, drawn under a hairline. It exists only when a
           * metatask AND a multiplier are both live — the design's "full formula"
           * column — because without a multiplier `(base + meta)` explains
           * nothing and the plate reads as a form with a hole in it. Either of
           * those keeps the base row alive too (#1131), so the `base !== null`
           * clause is the compiler's proof, not a fourth state.
           */}
          {meta !== null && mult !== null && base !== null && (
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
              <span style={workingStyle}>{t("card.stamp.subtotal")}</span>
              <span
                style={{
                  fontFamily: "var(--leaf-score-stamp-face)",
                  fontWeight: 600,
                  // eslint-disable-next-line local/no-raw-style-values -- ornament: the subtotal figure, a step under base.
                  fontSize: 20,
                  lineHeight: 0.9,
                  color: "var(--leaf-score-stamp-ink)",
                }}
              >
                {base + meta}
              </span>
            </div>
          )}

          {/*
           * The votes row, when there are votes (ADR-0076) — which is what the
           * design drew all along, and the deviation UA declared against it is
           * withdrawn. Inside the plate the base row is always above this one, so
           * the lead between working LINES is unconditional here.
           */}
          {votes !== null && (
            <div
              style={{
                ...workingStyle,
                // eslint-disable-next-line local/no-raw-style-values -- ornament: the plate's lead between working lines.
                marginTop: 3,
              }}
            >
              {t("card.stamp.fromVotes", { votes })}
            </div>
          )}

          {/*
           * The habit bonus (#1617) — UA's own ability, and the one plate on the
           * site that routinely carries this line. It is written UNDER the tally
           * and outside the subtotal on purpose: the bonus is flat, and
           * the plate's rule is where the multiplier stops applying. Vermilion
           * like the metatask working, because both are points the sheet ADDS.
           */}
          {habit !== null && (
            <div
              style={{
                ...workingStyle,
                color: "var(--leaf-score-stamp-accent)",
                // eslint-disable-next-line local/no-raw-style-values -- ornament: the plate's lead between working lines.
                marginTop: 3,
              }}
            >
              + {habit} {t("card.stamp.habit")}
            </div>
          )}
        </div>
      )}

      {/*
       * The total mark — the ensō, holding the figure in its ring.
       *
       * This used to be a second, hand-rolled copy of `UaEnsoScore`: the same
       * circle with the same numeral-over-caption stack, typed out again with
       * a tighter crop. That is why #1147's overlap could be fixed on the task
       * card and still be live here. One component now, dressed by props — the
       * warm `--faction-ua-card-*` block this surface runs on.
       */}
      <div
        style={{
          display: "flex",
          // With no plate to overlap (ADR-0076), the ring hangs on its own.
          // eslint-disable-next-line local/no-raw-style-values -- ornament: the ring overlaps the plate's foot by 6px; that overlap IS the drawing, and the nearest rungs (4/8) either open a gap under the plate or swallow its last working line.
          marginTop: base !== null ? -6 : 0,
        }}
      >
        <UaEnsoScore
          size={ENSO_SIZE}
          value={formatPoints(total)}
          unit={t("card.stamp.points", { count: total })}
          ringColor="var(--faction-ua-card-enso)"
          valueColor="var(--faction-ua-card-total)"
          unitColor="var(--faction-ua-card-points)"
          /*
           * The display tier is the CEILING; the ring picks the rendered size
           * from it (see `UaEnsoScore`). At this diameter a four-glyph total
           * lands on the 38px the design struck, and a four-DIGIT one steps
           * down until it clears the brush.
           */
          valueSize="var(--text-display)"
        />
      </div>
    </div>
  );
}
