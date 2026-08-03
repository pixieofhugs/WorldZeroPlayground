import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { TaskCrown } from "../../factionMarks/TaskCrown";
import {
  BRASS,
  BRASS_LIGHT,
  CAPTION,
  DECO,
  DISC,
  INK,
  INNER,
  LotusSign,
  OCHRE,
  Octagon,
  QUIET,
  READING,
  SMALL_CAPS,
  WASH,
  stepClip,
} from "../../factionMarks/ephemeristsPlate";
import { scoreBreakdown, formatMult } from "./scoreBreakdown";
import type { ScoreStampProps } from "./ScoreStamp";

/**
 * The Ephemerists score stamp (#1207) — the Valley plate's TALLY CELL: a cut
 * panel of working with the total struck in a stepped octagon on a lotus base.
 *
 * It replaces the codex's rubric box (#841), which painted the retired
 * `--eph-*` illuminated-codex family onto a card that is papyrus everywhere
 * else. Every colour here is a `--faction-ephemerists-plate-*` token, so the
 * cell flips through the `[data-theme="dark"]` cascade with no ternary; `-brass`
 * stays a rule colour and never an ink, and every label takes `-caption` or
 * `-quiet`.
 *
 * The design files this faction under the shared box pattern ("Ephemerists …
 * follow the Unaffiliated mechanism exactly"), so the ROWS are
 * {@link DefaultScoreStamp}'s: base with the multiplier beside it, the metatask
 * line, the votes tally, the total. Row selection stays in `scoreBreakdown`
 * (ADR-0047/0053) — this file is presentation only, and each row is its own
 * line so the cell reads as a shorter or longer entry in all five conditional
 * states rather than as a form with gaps. The BASE line is optional too since
 * #1131: with nothing moving the figure, the octagon already carries it.
 *
 * DEVIATIONS from the vendored frame, both named in the PR:
 *  • the multiplier chip is labelled from the SHARED `card.stamp.mult` key
 *    rather than the design's "ratio", and prints `×0.80` rather than `0.80 :1`.
 *    The stamp's row vocabulary is shared across every faction showing the same
 *    number (the praxis-detail skin's note says so out loud); a faction word for
 *    it would fork one number's name between two surfaces.
 *  • the design draws no metatask row (its sample has none). One is drawn here,
 *    in the box pattern's own place, because the stamp must stay legible in all
 *    five states — its chip is ochre, the plate's one accent, since brass is
 *    never an ink and a gold chip would pay under 3:1 behind a label.
 */

/** The octagon medallion, and its inner rule. Ornament geometry (§4a). */
const MEDALLION = 104;
const MEDALLION_INSET = 6;

/**
 * The glyph's own voice, over whatever label voice it sits in (#1637).
 *
 * Three of the four properties exist to UNDO the surrounding voice rather than
 * to dress the glyph:
 *  • `textTransform` — `SMALL_CAPS` uppercases the plate's whole label tier, and
 *    uppercasing a kanji costs a `text-transform` and buys nothing. The design
 *    names this one out loud.
 *  • `fontStyle` — the tally line is set in italic Spectral, and a CJK fallback
 *    face has no italic, so the browser synthesises a slant. Undo it.
 *  • `fontSize` — the label tier is `--text-xs` (8px). A Latin label is scanned
 *    at that size; 基 is eleven strokes and simply fills in. `--text-xl` is the
 *    smallest token inside the 13-16px band the issue names as legible, and the
 *    labels are the only thing that grows: every figure keeps its own size.
 * `letterSpacing` is the design's 0.06em.
 */
const GLYPH: CSSProperties = {
  fontSize: "var(--text-xl)",
  lineHeight: 1,
  letterSpacing: "0.06em",
  textTransform: "none",
  fontStyle: "normal",
};

/**
 * A label the reader decodes (#1637): the kanji is what shows, and the English
 * is one gesture away on `title`.
 *
 * ONE attribute carries the whole reveal — a pointer opens it as a tooltip and
 * assistive tech reads it out — which is the owner's ruling and not an
 * incidental choice: a visually-hidden twin would be a second copy of the same
 * fact, free to drift from the one on screen. The gloss handed in here is
 * always the very string another faction's stamp prints, so the two cannot
 * disagree about what the row is called.
 *
 * `<abbr>` is the element for "short form, expansion available", and it is what
 * draws the native dotted underline — the only hint that there is anything to
 * look up. `tabIndex` is what makes FOCUS one of the gestures; without it the
 * glyph is pointer-only and the ruling's keyboard half is a word.
 *
 * ponytail: the reveal is the browser's own tooltip, so a sighted keyboard user
 * gets it only where focus tooltips are implemented. The upgrade is a
 * `:focus-visible` gloss reading `attr(title)` — that lives in `index.css`, is a
 * styling decision, and is not taken here.
 */
function GlossedGlyph({
  glyph,
  gloss,
  style,
}: {
  glyph: string;
  gloss: string;
  style?: CSSProperties;
}) {
  return (
    <abbr title={gloss} tabIndex={0} style={{ ...style, ...GLYPH }}>
      {glyph}
    </abbr>
  );
}

export default function EphemeristsScoreStamp({ praxis, showCrown }: ScoreStampProps) {
  const { t } = useTranslation("praxis");
  if (praxis.score === null || praxis.score === undefined) return null;
  const { base, mult, meta, votes, total } = scoreBreakdown(praxis);
  const crowned = praxis.is_top_for_task && showCrown !== false;

  /** The cell's label voice: incised caps, at the plate's caption gold. */
  const label = { ...SMALL_CAPS, fontSize: "var(--text-xs)", color: CAPTION };

  return (
    <div
      style={{
        position: "relative",
        flexShrink: 0,
        width: "100%",
        maxWidth: MEDALLION + 24,
        boxSizing: "border-box",
        background: INNER,
        border: `1px solid ${BRASS}`,
        padding: "var(--space-sm) var(--space-md)",
        clipPath: stepClip(7),
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

      {/* Base, with the figure set against its label across the cell. */}
      {base !== null && (
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: "var(--space-sm)",
          }}
        >
          <GlossedGlyph
            glyph={t("card.stamp.ephemerists.base")}
            gloss={t("card.stamp.base")}
            style={label}
          />
          <span style={{ fontFamily: DECO, fontSize: "var(--text-title)", lineHeight: 0.8, color: INK }}>
            {base}
          </span>
        </div>
      )}

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

      {meta !== null && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-xs)",
            marginTop: "var(--space-sm)",
          }}
        >
          <span
            style={{
              ...SMALL_CAPS,
              fontWeight: 600,
              fontSize: "var(--text-xs)",
              letterSpacing: "0.16em",
              color: DISC,
              background: OCHRE,
              padding: "0 var(--space-xs)",
            }}
          >
            {t("card.stamp.meta")}
          </span>
          <span style={{ fontFamily: READING, fontStyle: "italic", fontSize: "var(--text-md)", color: QUIET }}>
            +{meta}
          </span>
        </div>
      )}

      {/* The tally, always drawn — `+ 0 票` is a fact, not a gap. The `+` and
          the figure are arithmetic, not copy, so they are set here rather than
          interpolated into a sentence: this is the one line where a label and a
          numeral sit together, and #1637's whole bound is that only the label
          is encoded. */}
      <div
        style={{
          fontFamily: READING,
          fontStyle: "italic",
          fontSize: "var(--text-md)",
          color: QUIET,
          marginTop: "var(--space-sm)",
        }}
      >
        + {votes}{" "}
        <GlossedGlyph
          glyph={t("card.stamp.ephemerists.fromVotes")}
          gloss={t("card.stamp.ephemerists.fromVotesGloss")}
        />
      </div>

      {/* The total, struck in the stepped octagon on its lotus base. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--space-xs)",
          marginTop: "var(--space-sm)",
        }}
      >
        <div
          style={{
            position: "relative",
            width: MEDALLION,
            height: MEDALLION,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width={MEDALLION}
            height={MEDALLION}
            viewBox="0 0 100 100"
            aria-hidden="true"
            style={{ position: "absolute", inset: 0 }}
          >
            <Octagon inset={0} stroke={BRASS} width={1.6} fill={DISC} />
            <Octagon inset={MEDALLION_INSET} stroke={BRASS_LIGHT} width={0.7} />
            <circle cx={50} cy={50} r={34} fill="none" stroke={BRASS_LIGHT} strokeWidth={0.7} opacity={0.55} />
            {/* The lotus base the medallion rests on. */}
            <path d="M18 74 H82" stroke={BRASS_LIGHT} strokeWidth={0.7} opacity={0.5} />
          </svg>
          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              lineHeight: 0.82,
            }}
          >
            <span style={{ fontFamily: DECO, fontSize: "var(--text-title)", color: OCHRE }}>
              {total.toFixed(1)}
            </span>
            <GlossedGlyph
              glyph={t("card.stamp.ephemerists.points")}
              gloss={t("card.stamp.points")}
              style={{ ...SMALL_CAPS, color: CAPTION, marginTop: "var(--space-xs)" }}
            />
          </div>
        </div>
        {/* The lotus itself, closing the cell. */}
        <LotusSign width={18} color={BRASS_LIGHT} />
      </div>
    </div>
  );
}
