import { useTranslation } from "react-i18next";
import { TaskCrown } from "../../factionMarks/TaskCrown";
import { PenCircle } from "../../factionMarks/snideAtoms";
import { scoreBreakdown, formatMult } from "./scoreBreakdown";
import { formatPoints } from "../../../utils/points";
import type { ScoreStampProps } from "./ScoreStamp";

/**
 * The S.N.I.D.E. score stamp (#842, ADR-0049) — the EVIDENCE TAG wired to the
 * slab: a black well punched into the plate, tilted -3deg, ruled in acid and
 * printed with a hard (unblurred) drop shadow.
 *
 * The faction's TOTAL MARK is the PINK PEN LOOP, and since #2042 it is the
 * faction's one drawing rather than this file's: {@link PenCircle}, the same
 * device the S.N.I.D.E. task card circles a task's worth in. It used to be
 * typographic here — Anton at the design's 30 with a 2px hot-pink offset shadow,
 * the misregistered second pass of a two-colour photocopy. Either way the mark is
 * S.N.I.D.E.'s signature and it was absent entirely until #842: #821's one generic
 * tilted plate rendered the same numeral every faction got.
 *
 * Row SELECTION stays in `scoreBreakdown` (ADR-0047) — this file is presentation
 * only. Each optional row is its own line so the tag stays legible across all
 * five conditional states; nothing here is positioned relative to a row that
 * may not exist. Since #1131 the BASE line is optional too: with nothing to
 * multiply, add or vote, the tag types the tally and the numeral says the rest.
 */
export default function SnideScoreStamp({ praxis, showCrown }: ScoreStampProps) {
  const { t } = useTranslation("praxis");
  if (praxis.score === null || praxis.score === undefined) return null;
  const { base, mult, meta, habit, votes, total } = scoreBreakdown(praxis);
  const crowned = praxis.is_top_for_task && showCrown !== false;

  /* THE FIGURE STEPS DOWN WHEN IT IS LONG; THE LOOP NEVER MOVES (#2638, owner
     ruling 2026-08-27). #2554 mounted this stamp on the S.N.I.D.E. TASK DETAIL,
     whose figure is `modifiedPoints` and runs to four glyphs, on a loop drawn at
     96 for the praxis card's two-glyph `22`. Of the three shapes the issue drew,
     the ruling took the third: one width across both surfaces, and the TYPE
     gives. So there is deliberately no size on `ScoreStampProps` — the other
     eight archetypes see no diff — and nothing new on the atom either, because
     `PenCircle` has taken `valueSize` since #2035 for exactly this.

     One rung down the ramp, not an invented number: `--text-title` is 24px and
     `index.css` defines it as "titles, scores".

     THE COUNT IS OF DIGITS, NOT GLYPHS, AND THAT IS THE RULING SHARPENED RATHER
     THAN BENT (owner, 2026-08-28). The ruling says "four or more glyphs", which
     was drawn at `1080` and reads the same either way for an integer. It parts
     company on a DECIMAL: `21.6` is four glyphs and three digits. `PenCircle`'s
     own docblock has already measured that case — at `--text-heading` a
     four-glyph `13.6` is ~47px against the loop's ~77px of inner span — so
     stepping it down would shrink a figure the atom documents as fitting, and
     leave the code contradicting its own measurement. Counting digits keeps
     `1080` stepping and `21.6` at the headline rung.

     This is not a per-character width model: `formatPoints` is
     `Number(v.toFixed(1)).toString()`, so the only characters it can emit are
     digits and one decimal point. One character class, checkable by reading it.

     It matters from era 2 rather than today. Era 1 sets every faction's
     `own_task_modifier` and `other_task_modifier` to 1.0, so `modifiedPoints` is
     always integral and no figure here has ever had a decimal point in it.
     Era 2 ships 1.2 and 0.8 (`backend/eras/era_2.py`), which is what makes the
     decimal case real and this distinction worth drawing now.

     It is resolved HERE rather than inside `PenCircle` so the atom stays dumb
     and the S.N.I.D.E. TASK CARD, which draws base points through the same atom,
     keeps the rung it was measured at. `DefaultPointsRing` and
     `SingularityReadout` are the same shape with the same `--text-heading`
     default, so the same crowding is latent on their surfaces — deliberately out
     of scope (#2638 scopes to S.N.I.D.E.; #2626's sweep looks). The fix shape is
     proven, so generalising it later is a move, not a re-derivation. */
  const figure = formatPoints(total);
  const digits = figure.replace(/\D/g, "").length;
  const figureSize = digits >= 4 ? "var(--text-title)" : "var(--text-heading)";

  /** The tag's typed working line — meta, the tally, and the habit bonus. */
  const typedLine = {
    fontFamily: "var(--font-body)",
    fontWeight: 700,
    // eslint-disable-next-line local/no-raw-style-values -- ornament: typewriter working on the tag, the design's 11 (§4a)
    fontSize: 11,
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
    color: "var(--faction-snide-acid)",
    marginTop: "var(--space-xs)",
  };

  return (
    <div
      style={{
        position: "relative",
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

      {/* Base, with the pink multiplier chip stuck on at the right. The line is
          typed only when something moved the figure (#1131) — the Anton total
          below the perforation is already saying it — and the chip leaves with
          the line, which is safe: a live multiplier keeps the line. */}
      {base !== null && (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)", whiteSpace: "nowrap" }}>
          <span
            style={{
              fontFamily: "var(--font-body)",
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
      )}

      {meta !== null && <div style={typedLine}>{t("card.stamp.meta")} +{meta}</div>}

      {/* The tally, typed only when somebody voted (ADR-0076). */}
      {votes !== null && (
        <div
          style={{
            ...typedLine,
            // The lead is between typed LINES: none when the tally is the first
            // one on the tag (#1131).
            marginTop: base !== null ? typedLine.marginTop : undefined,
          }}
        >
          {t("card.stamp.fromVotes", { votes })}
        </div>
      )}

      {/* The habit bonus, typed after the tally: flat, outside the multiplier
          (#1617). It always has a line above it, so it always keeps its lead. */}
      {habit !== null && (
        <div style={typedLine}>
          {t("card.stamp.habit")} +{habit}
        </div>
      )}

      {/* Torn-off perforation, then the total mark. The perforation tears the
          typed working off the total, so a tag with no working has nothing to
          tear (ADR-0076); `base !== null` is the resolver's own test for "some
          working survived". */}
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
      {/* THE TOTAL IS CIRCLED IN PINK PEN (#2042). It was a bare Anton numeral
          over a misregistered pink offset here and a drawn pen loop on the task
          card — one faction, two devices — and the owner's ruling is that the
          point card reflects the card's total look. {@link PenCircle} is the
          drawing now; the pink shadow goes, because the pink IS the loop.

          THE INKS ARE THIS SURFACE'S, NOT THE ATOM'S DEFAULTS, and the difference
          is not cosmetic: the card's `-note-ink` figure measures 1.05:1 on this
          plate in LIGHT and its `-note-pink-ink` caption 3.27:1. The figure keeps
          the acid it always printed (16.31:1 light / 16.81:1 dark).

          THE CAPTION LEFT `-card-muted` IN #2177. The card around this tag wears
          the flyposted wall now, and the frame re-points `-card-muted` at the
          wall's family for the shared slots that cannot take an ink prop — which
          would have put the wall's dark grey on this black plate. So the caption
          joins `-vote-off`, the typed-label ink the BASE line above it already
          uses on this same tag (6.46:1 on the plate, invariant like the plate).
          The plate itself is opaque since that issue; see `-stamp-bg`.

          The loop is drawn at 96, which is the desktop task card's own width, so
          the tag's `minWidth: 116` grows to fit it rather than clipping it. It
          stays 96 on the task detail too, and the figure steps down instead —
          see `figureSize` above (#2638). */}
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
