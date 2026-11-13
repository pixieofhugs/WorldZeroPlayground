import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { TaskCrown } from "../../factionMarks/TaskCrown";
import EphemeristsGloss, { type GlossWord } from "../../factionMarks/EphemeristsGloss";
import {
  BAND_INK,
  BAND_QUIET,
  BRASS_LIGHT,
  CAPTION,
  CompassRose,
  DECO,
  INK,
  INNER,
  OCHRE,
  SMALL_CAPS,
  WASH,
  chamferMount,
  chamferSheet,
} from "../../factionMarks/ephemeristsPlate";
import { scoreBreakdown, formatMult } from "./scoreBreakdown";
import { formatPoints } from "../../../utils/points";
import type { ScoreStampProps } from "./ScoreStamp";
import { factionBodyVars } from "../../../utils/factionBodyFace"

/**
 * The Ephemerists score stamp (#1207, #2145): the Valley plate's TALLY CELL, a
 * cut panel of working with the total struck last in the compass rose. Colours
 * are `--faction-ephemerists-plate-*` tokens; `-brass` is a rule colour, never
 * an ink. Row selection is `scoreBreakdown`'s (ADR-0047/0053/0076).
 *
 * No outer padding on the root (#2634 §5 declined, law 09 #2655): this stamp
 * travels, and the crown's `top: -13` resolves against the root's padding box,
 * so a pad here breaks the sum `ephemeristsPlateSurfaces.test.tsx` pins for
 * #2360/#2655. A short gap is the host's to state.
 *
 * With nothing but a total (`base === null`) the panel falls away (ADR-0076).
 *
 * Contrast: the total is `-band-ink` (7.59:1) and unit `-band-quiet` (8.37:1) on
 * the disc (#2141); the metatask row is ochre ink on the cell (4.97/4.99:1,
 * AA_NORMAL at 11px). Never `-plate-band-quiet` on this panel: 1.78:1.
 *
 * One arrangement for every line (#2285): figures in the left column, words in
 * the right, one colour per row (`-plate-caption`, 5.68/6.67:1 on
 * `-plate-inner`). The columns are the CELL's grid; {@link WorkingRow} emits two
 * cells and no wrapper.
 *
 * The ratio rides the base line as a chamfered chip with no label (#2634,
 * #2821), notation `×0.80` via `formatMult`. A metatask row is drawn though the
 * design has none. Labels are the shared English, turned by the faction's
 * script rotation, never hardcoded Latin or kanji (#2145 §5, #1909).
 */

/** Cell width and rose size (§4a). 84px is the card size at which `CompassRose`
 *  drops its short ticks. */
const STAMP_WIDTH = 128;
const ROSE = 84;

/** The cell's label voice: incised caps at the label tier's 11px (#1608). */
const LABEL: CSSProperties = { ...SMALL_CAPS, fontSize: "var(--text-md)" };

/** One figure size for every row: the plate ramp's smallest step that reads as a figure. */
const FIGURE: CSSProperties = { fontFamily: DECO, fontSize: "var(--text-xl)", lineHeight: 1 };

/**
 * One line of the working: figure, then word (#2285), in one `ink`.
 *
 * The word turns, the figure never does (#2148): a lost decode costs a label,
 * not a score. `ordinal` phases each label's beat apart (#2392).
 */
function WorkingRow({
  figure,
  label,
  gloss,
  ordinal = 0,
  ink,
  chip,
}: {
  figure: string;
  label: string;
  /**
   * The catalog entry the label turns through; absent = does not turn. Only the
   * subtotal: each `glosses.json` word costs four subset webfont requests
   * (#2148, checked by `ephemeristsScriptTurn.test.tsx`).
   */
  gloss?: GlossWord;
  ordinal?: number;
  ink: string;
  /** The ratio, struck in the FIGURE column beside the number it multiplies. */
  chip?: ReactNode;
}) {
  return (
    <>
      <span
        style={{ ...FIGURE, color: ink, display: "flex", alignItems: "center", gap: "var(--space-xs)" }}
      >
        {figure}
        {chip}
      </span>
      <span style={{ ...LABEL, color: ink }}>
        {gloss ? (
          <EphemeristsGloss word={gloss} english={label} ordinal={ordinal} />
        ) : (
          label
        )}
      </span>
    </>
  );
}

export default function EphemeristsScoreStamp({ praxis, showCrown }: ScoreStampProps) {
  const { t } = useTranslation("praxis");
  if (praxis.score === null || praxis.score === undefined) return null;
  const { base, mult, meta, habit, votes, subtotal, total } = scoreBreakdown(praxis);
  const crowned = praxis.is_top_for_task && showCrown !== false;
  const working = base !== null;

  return (
    /* The crown is a SIBLING of the clipped panel (#2122): `clip-path` would
     * cut its overhang. */
    <div
      style={{
        ...factionBodyVars("ephemerists"),
        position: "relative",
        width: "100%",
        maxWidth: working ? STAMP_WIDTH : ROSE,
      }}
      /* WCAG 2.2.2 pause scope for the labels' turn (#2148). */
      className="eph-turn-scope"
    >
      {crowned && (
        <TaskCrown
          size={26}
          ringInset={3}
          rotate="6deg"
          style={{ position: "absolute", top: -13, right: -12, zIndex: 3 }}
        />
      )}

      {working && (
        /* The brass rule is the MOUNT, not a border (#2314): `clip-path` cuts
         * at the border box and would shave a border along the chamfers. */
        <div style={chamferMount(7)}>
          <div
            style={{
              ...chamferSheet(7, INNER),
              boxSizing: "border-box",
              padding: "var(--space-sm) var(--space-md)",
              lineHeight: 1.1,
              /* Figure and word columns belong to the cell (#2285). */
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              alignItems: "baseline",
              columnGap: "var(--space-sm)",
              rowGap: "var(--space-sm)",
            }}
          >
            {/* The ratio rides the base line (#2634): under #2633 it applies only
                to the base. It is a number, so it sits in the figure column. */}
            <WorkingRow
              figure={`${base}`}
              label={t("card.stamp.base")}
              gloss="base"
              ordinal={0}
              ink={CAPTION}
              chip={
                mult !== null ? (
                  <span style={chamferMount(5)}>
                    <span
                      style={{
                        ...chamferSheet(5, WASH),
                        display: "block",
                        padding: "0 var(--space-xs)",
                        fontFamily: DECO,
                        fontSize: "var(--text-lg)",
                        lineHeight: 1.4,
                        color: INK,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatMult(mult)}
                    </span>
                  </span>
                ) : undefined
              }
            />

            {/* Subtotal under a brass hairline, gated on the multiplier (#2634).
                `12 × 0.8` is `9.600000000000001` in doubles (#1866). */}
            {subtotal !== null && (
              <>
                <span
                  aria-hidden
                  style={{ gridColumn: "1 / -1", height: 1, background: BRASS_LIGHT }}
                />
                <WorkingRow
                  figure={formatPoints(subtotal)}
                  label={t("card.stamp.subtotal")}
                  ink={CAPTION}
                />
              </>
            )}

            {/* Ochre: a foreign award, not the task's. */}
            {meta !== null && (
              <WorkingRow figure={`+${meta}`} label={t("card.stamp.meta")} gloss="bonus" ordinal={1} ink={OCHRE} />
            )}

            {/* `+` and figure are arithmetic, not copy: only the label is encoded (#1637). */}
            {votes !== null && (
              <WorkingRow figure={`+${votes}`} label={t("card.stamp.votes")} gloss="bonus" ordinal={2} ink={CAPTION} />
            )}

            {/* Habit (#1617): flat, outside the ratio. */}
            {habit !== null && (
              <WorkingRow figure={`+${habit}`} label={t("card.stamp.habit")} gloss="bonus" ordinal={3} ink={CAPTION} />
            )}
          </div>
        </div>
      )}

      {/* Figure and unit are HTML over the rose, not SVG `<text>`, so the unit
          stays one replaceable node for the script rotation. */}
      <div
        style={{
          position: "relative",
          width: ROSE,
          height: ROSE,
          margin: working ? "var(--space-sm) auto 0" : "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CompassRose size={ROSE} />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            lineHeight: 0.82,
          }}
        >
          <span style={{ fontFamily: DECO, fontSize: "var(--text-title)", color: BAND_INK }}>
            {formatPoints(total)}
          </span>
          <span
            style={{
              ...SMALL_CAPS,
              fontSize: "var(--text-md)",
              color: BAND_QUIET,
              marginTop: "var(--space-xs)",
            }}
          >
            <EphemeristsGloss
              word="points"
              english={t("card.stamp.points", { count: total })}
              ordinal={4}
            />
          </span>
        </div>
      </div>
    </div>
  );
}
