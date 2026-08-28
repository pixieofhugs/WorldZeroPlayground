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

/**
 * The Ephemerists score stamp (#1207, redrawn by #2145) — the Valley plate's
 * TALLY CELL: a cut panel of WORKING, with the total struck last in the
 * faction's compass rose.
 *
 * It replaces the codex's rubric box (#841), which painted the retired
 * `--eph-*` illuminated-codex family onto a card that is papyrus everywhere
 * else. Every colour here is a `--faction-ephemerists-plate-*` token, so the
 * cell flips through the `[data-theme="dark"]` cascade with no ternary; `-brass`
 * stays a rule colour and never an ink, and every label takes `-caption` or
 * `-quiet`.
 *
 * ## The working comes FIRST (#2145 §4)
 *
 * The stamp used to lead with the total and file the derivation under it, which
 * is every other faction's score box. The owner's ruling is that the Ephemerists
 * are the faction whose conceit is that the WORKING is worth showing, so the
 * order is base, ratio, the foreign award, the tally — and then the rose. It
 * also puts the rose against the panel's chamfered corner, where the disc and
 * the cut belong together.
 *
 * #2634 did not disturb that — every other stamp came to MEET it, because
 * "totals sit at the bottom" is now the rule for all nine. What changed inside
 * the cell is the ratio's line (see the chip below) and one new row: the
 * SUBTOTAL, `base × ratio`, under a brass hairline, gated on the ratio alone.
 *
 * ## The panel is not flush to the stamp's box any more (#2634 §5)
 *
 * The root declared no clearance above the brass mount, so the chamfered panel
 * met the top of the stamp's box while the other eight sit inside a plate's own
 * inset. `PANEL_CLEARANCE` is that space, and the crown's offset is written
 * against it so the ♛ still overhangs the panel's corner by the 13px it always
 * did rather than floating clear of it. The praxis card's masthead band sits
 * directly above this stamp, so how much of the reported gap was the band's is a
 * question only a browser can answer; the PR says so.
 *
 * WITH NOTHING BUT A TOTAL THE PLATE FALLS AWAY and the rose stands alone.
 * `base === null` is `scoreBreakdown`'s own predicate for "no working at all"
 * (it is null precisely when mult, meta, habit and votes are too), so the panel
 * is drawn on exactly the condition the other eight skins gate their separating
 * rule on: with zero rows left, a chamfered plate would rule off an empty block
 * (ADR-0076).
 *
 * Row selection stays in `scoreBreakdown` (ADR-0047/0053/0076) — this file is
 * presentation only.
 *
 * ## Two pairings this redraw moves, both measured
 *
 * THE TOTAL WAS `-plate-ochre` ON `-plate-disc`, 3.0007:1. It cleared the
 * LARGE-text floor by seven ten-thousandths, at `--text-title` (24px), which is
 * a coincidence and not a design. The disc's ink budget is the BAND's (#2141),
 * so the figure is `-band-ink` at 7.59:1 and the unit `-band-quiet` at 8.37:1 —
 * the same two the task card's rose already prints, in both cascades, on a chip
 * that does not flip.
 *
 * THE METATASK LINE WAS THE SAME PAIRING INVERTED — `-plate-disc` on an ochre
 * chip, therefore also 3.0007:1 — at `--text-md`, which is **11px** and owes
 * AA_NORMAL's 4.5:1, not 3:1. That row is now ochre INK on the panel cell:
 * 4.97:1 in light, 4.99:1 in dark. It is still the plate's one accent, still
 * marking a foreign award rather than the task's own, and it no longer asks an
 * 11px label to live on a large-text ratio.
 *
 * ## ONE ARRANGEMENT FOR EVERY LINE (#2285)
 *
 * The cell showed three numbers three ways: the base label and its figure at
 * opposite ends of a `space-between` row, the metatask word BEFORE its figure,
 * the tally figure before its word — so a simple addition was read three ways.
 * The owner's ruling is a two-column read, **numbers on the left, words on the
 * right, for every line**, at one face and one size across the figures and one
 * across the labels: the column position tells a figure from its word, so
 * neither the type nor a second colour has to.
 *
 * The columns are the CELL's grid, not each row's — {@link WorkingRow} emits
 * two grid cells and no wrapper, because a per-row flexbox lines a figure up
 * with its own label and with nothing else. That is also why a fourth row
 * (habit) cannot arrive off-pattern: there is one row component and it has no
 * arrangement to choose.
 *
 * TWO FIGURES CHANGE INK, and only because the ruling forbids a number and its
 * label in two colours to tell them apart. The label tier's caption gold stays
 * — it is the plate's label voice everywhere — so the figures join their
 * labels rather than the other way round: base was `-plate-ink` (14.93:1 light
 * / 12.84:1 dark) and the tally `-plate-quiet` (8.21:1 / 5.52:1), and both are
 * now `-plate-caption`, **5.68:1 in light and 6.67:1 in dark on `-plate-inner`**
 * — AA_NORMAL at the labels' 11px and at the figures' 14px alike, and already
 * gated as `factionContrast`'s "ephemerists panel cell, caption" row. No ink is
 * introduced and the metatask row, whose word and figure were already one
 * colour, is untouched.
 *
 * THE MULTIPLIER CHIP KEPT ITS OWN SHAPE UNTIL #2634, and the reasoning is left
 * standing because only its conclusion moved. It is not one of the addends and
 * it is not a line of the working — it is a ruled chip, rebuilt one commit ago
 * (#2150/#2314) — which is why it spanned both columns rather than filing itself
 * as a term. #2633 then took the metatask out of the multiplier, so what the
 * ratio applies to is the base and nothing else, and the owner ruled the chip
 * onto the base line on all nine stamps. It keeps the chamfer and loses the word
 * and the brass hairline that parted the word from the ratio; see the mount.
 *
 * `-plate-quiet` therefore leaves this cell. It was here because the vendored
 * frame asked for `-plate-band-quiet`, which is a DISC ink (#c2ae7e, minted for
 * the compass blue) and measures **1.78:1** on this panel; that deviation still
 * stands wherever the two names are confused, it simply no longer has a reader
 * here.
 *
 * DEVIATIONS from the vendored frame, both named in the PR:
 *  • the multiplier chip printed `×0.80` rather than the design's `0.80 :1`,
 *    and was LABELLED from the shared `card.stamp.mult` key rather than from the
 *    design's "ratio", so that a faction word could not fork one number's name
 *    between two surfaces. #2634 settled the question by removing the label
 *    entirely: a chip on the base line names itself, on all nine stamps, and
 *    the notation stays `×0.80` through the shared `formatMult`.
 *  • the design draws no metatask row (its sample has none). One is drawn here,
 *    in the box pattern's own place, because the stamp must stay legible in all
 *    five states.
 *
 * THE LABEL IS "points", IN ENGLISH (#2145 §5). The design sets `PVNCTA`; the
 * faction's script rotation is its own mechanism and this label is one of its
 * consumers, not a place to hardcode Latin.
 *
 * THE FIVE KANJI ARE GONE (#1909). Four rows were labelled 基 / 票 / 習 / 点 as
 * {@link GlossedGlyph}s with the shared English on `title`. The copy audit ruled
 * all five strings CUT — they were the only faction-specific score-stamp labels
 * in the app, on a surface it ruled generic — so every row now prints the SHARED
 * label it was already glossed with, in the same incised small caps. The tally's
 * `+ N` still sets its figure outside the label, so #1637's bound holds.
 */

/**
 * The cell's width, and the rose struck in it. Ornament geometry (§4a).
 *
 * They are two numbers now rather than one: the rose no longer sets the cell's
 * width, because the working sits above it instead of around it. 84px is the
 * praxis card's size for this mark — the size at which `CompassRose` drops the
 * forty short ticks — against the task card's 128.
 */
const STAMP_WIDTH = 128;
const ROSE = 84;

/**
 * The space above the brass mount (#2634 §5). Ornament geometry in the sense of
 * §4a's sibling rule: it is the inset the other eight stamps get from their own
 * plate padding, which this one has no plate to take it from.
 */
const PANEL_CLEARANCE = "var(--space-sm)";
/**
 * The crown's overhang, measured from the PANEL rather than from the stamp's
 * box — the 13px every skin hangs it by, less the clearance the panel now sits
 * below. Absolutely positioned children resolve against the root's padding box,
 * so without this the clearance would push the panel down and leave the ♛
 * hanging in the gap.
 */
const CROWN_TOP = `calc(${PANEL_CLEARANCE} - 13px)`;

/** The cell's label voice: incised caps at the label tier's 11px (#1608). */
const LABEL: CSSProperties = { ...SMALL_CAPS, fontSize: "var(--text-md)" };

/**
 * The cell's figure voice: the plate's display face, at ONE size for every row.
 *
 * `--text-xl` (14px) is the smallest step of the plate's own ramp that reads as
 * a figure rather than as another label — the base figure used to be `--text-title`
 * and shout over the total struck in the rose, and the tally's used to be set in
 * running italic at the LABEL's 11px.
 */
const FIGURE: CSSProperties = { fontFamily: DECO, fontSize: "var(--text-xl)", lineHeight: 1 };

/**
 * ONE LINE OF THE WORKING: the figure, then the word (#2285).
 *
 * Two grid cells and no wrapper — see the cell's grid above. `ink` is the whole
 * line's colour, one per row: the ruling forbids a number and its label being
 * told apart by colour, so a row never carries two.
 *
 * THE WORD TURNS AND THE FIGURE NEVER DOES (#2148). `gloss` names the catalog
 * entry the label is cast through; `ordinal` is the row's place among this
 * cell's turning labels and phases its beat away from theirs — this cell is the
 * surface #2392 was filed for, with five labels on one clock. The figure is
 * left alone on purpose — the whole conceit rests on the cost of not decoding
 * being a lost label rather than a lost score.
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
   * The catalog entry the label is cast through, or absent for a label that
   * does NOT turn.
   *
   * Only the SUBTOTAL is absent, and the reason is the mechanism rather than the
   * row: `glosses.json` holds seven words and each one costs four subset webface
   * requests in `fetch-fonts.mjs` (#2148), with
   * `ephemeristsScriptTurn.test.tsx` checking the shipped `unicode-range`
   * covers every cast. An eighth word for one arithmetic label is a font build
   * for a line that is not a term of the working. It rests in English, which is
   * frame 0 for every other label on this cell anyway.
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
    /*
     * THE CROWN IS A SIBLING OF THE CLIPPED PANEL, NOT A CHILD OF IT (#2122).
     * `clip-path` clips descendants, and the crown is hung at `top:-13
     * right:-12` precisely so it overhangs — so as a child it was the one part
     * of the cell guaranteed to be cut away, which is what the issue's
     * screenshot shows. The overhang is the design; the clip moved off it.
     * This is the shape `EphemeristsFactionBody` already uses for its own
     * crown, one relatively-positioned wrapper around the thing being crowned.
     */
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: working ? STAMP_WIDTH : ROSE,
        paddingTop: PANEL_CLEARANCE,
      }}
      /* WCAG 2.2.2's pause mechanism for the labels' turn (#2148): the
         stylesheet's pause rule is a descendant selector, so the whole cell is
         the scope rather than each label being wrapped in one. */
      className="eph-turn-scope"
    >
      {crowned && (
        <TaskCrown
          size={26}
          ringInset={3}
          rotate="6deg"
          style={{ position: "absolute", top: CROWN_TOP, right: -12, zIndex: 3 }}
        />
      )}

      {working && (
        /*
         * THE PANEL'S RULE IS ITS GROUND, NOT A BORDER (#2314, treatment #2150).
         * `clip-path` cuts at the border box, so the `border: 1px solid` that
         * stood here was shaved away along both chamfers — the owner's report is
         * "gold border is missing on the sides of the score stamps". The brass
         * is the MOUNT and the panel is laid a pixel inside it; the clip then
         * carries the rule instead of shaving it. Nothing about the panel's box
         * moves: the mount's 1px padding is the border's 1px.
         */
        <div style={chamferMount(7)}>
          <div
            style={{
              ...chamferSheet(7, INNER),
              boxSizing: "border-box",
              padding: "var(--space-sm) var(--space-md)",
              lineHeight: 1.1,
              /*
               * THE FIGURES ARE ONE COLUMN AND THE WORDS ANOTHER (#2285), which
               * is a property of the CELL and cannot be one of a row: two
               * independent flex rows align a figure with its own label and with
               * nothing above or below it.
               */
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              alignItems: "baseline",
              columnGap: "var(--space-sm)",
              rowGap: "var(--space-sm)",
            }}
          >
            {/* 基 stood at the base row, glossed "base". #1909 cut all five of this
                cell's kanji: they were the only faction-specific score-stamp labels
                in the app, on a surface the audit ruled generic. The shared gloss
                each one carried is now the visible label.

                THE RATIO RIDES THIS ROW SINCE #2634. It stood beneath as a ruled
                chip of its own spanning both columns, on the stated grounds that
                "it is not one of the addends and it is not a line of the
                working" (#2150/#2314/#2285). Both halves of that are still true
                and the conclusion no longer follows: under #2633's formula the
                ratio applies to the BASE and to nothing else, so `base × ratio`
                on one line is the shortest true drawing, and the rule beneath it
                then has exactly one line above it — which is the owner's ruling
                of 2026-08-24 for all nine stamps.

                #2285's two-column read survives intact: the ratio is a NUMBER,
                so it sits in the number column with the figure it multiplies,
                and the word column still holds nothing but words. What the chip
                gives up is its `mult` label and the brass hairline that parted
                that word from the ratio — a chip on the base line names itself,
                which is why the three stamps that already drew one (UA,
                S.N.I.D.E., WOW) never labelled theirs. */}
            <WorkingRow
              figure={`${base}`}
              label={t("card.stamp.base")}
              gloss="base"
              ordinal={0}
              ink={CAPTION}
              chip={
                mult !== null ? (
                  /* The chamfer treatment of #2150/#2314, one rung down — the chip
                     kept the clipped border it always had. */
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

            {/* THE BRASS RULE AND THE SUBTOTAL (#2634) — what the ratio made of
                the base, under a hairline of the plate's rule brass. `-brass`
                stays a RULE colour and never an ink (see the header), so the
                line is brass and the figure beside its label is the cell's
                caption gold like every other row's.

                Gated on the multiplier ALONE. `formatPoints` for the figure,
                exactly as the rose's total: `12 × 0.8` is `9.600000000000001` in
                doubles (#1866). */}
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

            {/* The metatask award, struck in the plate's one accent — a foreign
                award, not the task's. See the ochre measurement above. */}
            {meta !== null && (
              <WorkingRow figure={`+${meta}`} label={t("card.stamp.meta")} gloss="bonus" ordinal={1} ink={OCHRE} />
            )}

            {/* The tally, cut only when there are votes to record (ADR-0076). The `+`
                and the figure are arithmetic, not copy, so they are set here rather
                than interpolated into a sentence: this is the one line where a label
                and a numeral sit together, and #1637's whole bound is that only the
                label is encoded. */}
            {votes !== null && (
              <WorkingRow figure={`+${votes}`} label={t("card.stamp.votes")} gloss="bonus" ordinal={2} ink={CAPTION} />
            )}

            {/* The habit bonus (#1617), cut after the tally: flat, outside the ratio.
                Labelled from the shared key like every other row of this cell — the
                #1637 bound holds, so the LABEL is encoded and the figure stays a
                Western numeral. */}
            {habit !== null && (
              <WorkingRow figure={`+${habit}`} label={t("card.stamp.habit")} gloss="bonus" ordinal={3} ink={CAPTION} />
            )}
          </div>
        </div>
      )}

      {/* The total, struck LAST, in the shared compass rose (#2042, #2145). The
          figure and its unit stay HTML laid over the plate rather than `<text>`
          inside its viewBox — that is what keeps the unit one replaceable node
          for the faction's script rotation. */}
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
