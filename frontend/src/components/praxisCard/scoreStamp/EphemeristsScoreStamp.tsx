import { useTranslation } from "react-i18next";
import { TaskCrown } from "../../factionMarks/TaskCrown";
import {
  BRASS,
  BAND_QUIET,
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
import { formatPoints } from "../../../utils/points";
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
 * (ADR-0047/0053/0076) — this file is presentation only, and each row is its own
 * line so the cell reads as a shorter or longer entry in all five conditional
 * states rather than as a form with gaps. The BASE line is optional since #1131
 * and the TALLY since ADR-0076: with nothing moving the figure, the cell is the
 * octagon alone, and it needs no rule above it to say so.
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
 *
 * THE FIVE KANJI ARE GONE (#1909). Four rows were labelled 基 / 票 / 習 / 点 as
 * {@link GlossedGlyph}s with the shared English on `title`. The copy audit ruled
 * all five strings CUT — they were the only faction-specific score-stamp labels
 * in the app, on a surface it ruled generic — so every row now prints the SHARED
 * label it was already glossed with, in the same incised small caps. The tally's
 * `+ N` still sets its figure outside the label, so #1637's bound holds.
 */

/** The octagon medallion, and its inner rule. Ornament geometry (§4a). */
const MEDALLION = 104;
const MEDALLION_INSET = 6;

export default function EphemeristsScoreStamp({ praxis, showCrown }: ScoreStampProps) {
  const { t } = useTranslation("praxis");
  if (praxis.score === null || praxis.score === undefined) return null;
  const { base, mult, meta, habit, votes, total } = scoreBreakdown(praxis);
  const crowned = praxis.is_top_for_task && showCrown !== false;

  /** The cell's label voice: incised caps, at the plate's caption gold. */
  const label = { ...SMALL_CAPS, fontSize: "var(--text-md)", color: CAPTION };

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
          {/* 基 stood here, glossed "base". #1909 cut all five of this cell's
              kanji: they were the only faction-specific score-stamp labels in
              the app, on a surface the audit ruled generic. The shared gloss
              each one carried is now the visible label. */}
          <span style={label}>{t("card.stamp.base")}</span>
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
              fontSize: "var(--text-md)",
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
        {/* The lotus itself, closing the cell. */}
        <LotusSign width={18} color={BRASS_LIGHT} />
      </div>
    </div>
  );
}
