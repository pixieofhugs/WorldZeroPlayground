import { useTranslation } from "react-i18next";
import { TaskCrown } from "../../factionMarks/TaskCrown";
import {
  BRASS,
  BAND_INK,
  BAND_QUIET,
  BRASS_LIGHT,
  CAPTION,
  CompassRose,
  DECO,
  INK,
  INNER,
  OCHRE,
  QUIET,
  READING,
  SMALL_CAPS,
  WASH,
  stepClip,
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
 * THE VOTES LINE KEEPS `-plate-quiet` AND THE ISSUE SAYS `-plate-band-quiet`;
 * this is a deliberate deviation, reported on the PR rather than shipped.
 * `-band-quiet` is a DISC ink (#c2ae7e, theme-invariant, minted for the compass
 * blue) and this line sits on `-plate-inner`, the panel cell — #f2e8ce in
 * light, where it measures **1.78:1**. `-plate-quiet` is the ink minted for
 * this exact ground and gated by `factionContrast`'s "ephemerists panel cell,
 * quiet ink" row. The two names differ by one word and the grounds differ by
 * everything.
 *
 * DEVIATIONS from the vendored frame, both named in the PR:
 *  • the multiplier chip is labelled from the SHARED `card.stamp.mult` key
 *    rather than the design's "ratio", and prints `×0.80` rather than `0.80 :1`.
 *    The stamp's row vocabulary is shared across every faction showing the same
 *    number (the praxis-detail skin's note says so out loud); a faction word for
 *    it would fork one number's name between two surfaces.
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

export default function EphemeristsScoreStamp({ praxis, showCrown }: ScoreStampProps) {
  const { t } = useTranslation("praxis");
  if (praxis.score === null || praxis.score === undefined) return null;
  const { base, mult, meta, habit, votes, total } = scoreBreakdown(praxis);
  const crowned = praxis.is_top_for_task && showCrown !== false;
  const working = base !== null;

  /** The cell's label voice: incised caps, at the plate's caption gold. */
  const label = { ...SMALL_CAPS, fontSize: "var(--text-md)", color: CAPTION };

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

      {working && (
        <div
          style={{
            boxSizing: "border-box",
            background: INNER,
            border: `1px solid ${BRASS}`,
            padding: "var(--space-sm) var(--space-md)",
            clipPath: stepClip(7),
            lineHeight: 1.1,
          }}
        >
          {/* Base, with the figure set against its label across the cell. */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: "var(--space-sm)",
            }}
          >
            {/* 基 stood here, glossed "base". #1909 cut all five of this cell's
                kanji: they were the only faction-specific score-stamp labels in
                the app, on a surface the audit ruled generic. The shared gloss
                each one carried is now the visible label. */}
            <span style={label}>{t("card.stamp.base")}</span>
            <span style={{ fontFamily: DECO, fontSize: "var(--text-title)", lineHeight: 0.8, color: INK }}>
              {base}
            </span>
          </div>

          {/* The multiplier, in its own ruled chip — the design's "ratio" cell. */}
          {mult !== null && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-xs)",
                marginTop: "var(--space-sm)",
                padding: "var(--space-xs) var(--space-sm)",
                border: `1px solid ${BRASS}`,
                background: WASH,
                clipPath: stepClip(5),
              }}
            >
              <span style={{ ...label, letterSpacing: "0.2em" }}>{t("card.stamp.mult")}</span>
              <span aria-hidden style={{ width: 1, height: 11, background: BRASS_LIGHT }} />
              <span style={{ fontFamily: DECO, fontSize: "var(--text-lg)", lineHeight: 1, color: INK }}>
                {formatMult(mult)}
              </span>
            </div>
          )}

          {/* The metatask award, struck in the plate's one accent — a foreign
              award, not the task's. See the ochre measurement above. */}
          {meta !== null && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-xs)",
                marginTop: "var(--space-sm)",
                color: OCHRE,
              }}
            >
              <span
                style={{
                  ...SMALL_CAPS,
                  fontWeight: 600,
                  fontSize: "var(--text-md)",
                  letterSpacing: "0.16em",
                }}
              >
                {t("card.stamp.meta")}
              </span>
              <span style={{ fontFamily: READING, fontStyle: "italic", fontSize: "var(--text-md)" }}>
                +{meta}
              </span>
            </div>
          )}

          {/* The tally, cut only when there are votes to record (ADR-0076). The `+`
              and the figure are arithmetic, not copy, so they are set here rather
              than interpolated into a sentence: this is the one line where a label
              and a numeral sit together, and #1637's whole bound is that only the
              label is encoded. */}
          {votes !== null && (
            <div
              style={{
                fontFamily: READING,
                fontStyle: "italic",
                fontSize: "var(--text-md)",
                color: QUIET,
                marginTop: "var(--space-sm)",
              }}
            >
              + {votes} <span style={label}>{t("card.stamp.votes")}</span>
            </div>
          )}

          {/* The habit bonus (#1617), cut after the tally: flat, outside the ratio.
              Labelled from the shared key like every other row of this cell — the
              #1637 bound holds, so the LABEL is encoded and the figure stays a
              Western numeral. */}
          {habit !== null && (
            <div
              style={{
                fontFamily: READING,
                fontStyle: "italic",
                fontSize: "var(--text-md)",
                color: QUIET,
                marginTop: "var(--space-xs)",
              }}
            >
              + {habit} <span style={label}>{t("card.stamp.habit")}</span>
            </div>
          )}
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
            {t("card.stamp.points")}
          </span>
        </div>
      </div>
    </div>
  );
}
