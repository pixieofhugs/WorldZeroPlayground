import { useTranslation } from "react-i18next";
import { TaskCrown } from "../../factionMarks/TaskCrown";
import DefaultPointsRing from "../../factionMarks/DefaultPointsRing";
import { scoreBreakdown, formatMult } from "./scoreBreakdown";
import { formatPoints } from "../../../utils/points";
import type { ScoreStampProps } from "./ScoreStamp";

/**
 * The Default / `na` score stamp — the unaffiliated SPECTRUM stamp (ADR-0039,
 * ADR-0049), and the fall-through every faction renders until its own slice
 * lands.
 *
 * Rebuilt to the Unaffiliated praxis-detail design (#1091, epic #1085). That
 * skin IS the unaffiliated one, so "restyle the default stamp" and "build the
 * design's score rail" are the same object: a total mark carrying the total
 * over a `POINTS` caption, then the working out as RULED LEADER-LINE ROWS —
 * `LABEL … hairline … value` — and, under a rule of its own, the votes tally.
 * A 2px spectrum bar is pinned across the top edge.
 *
 * THE MARK IS NO LONGER THIS DESIGN'S STRUCK DISC. #2042 found `na` drawing its
 * points mark twice and the owner ruled that the point card takes the task card's,
 * so the disc is {@link DefaultPointsRing} — the spectrum ring — and everything
 * below it is untouched. See the comment at the mount for what moved and what it
 * measures.
 *
 * ## The design's arithmetic is not built
 *
 * The design computes `mult = clamp(voteAverage / 3, 0.5, 1.6)` and
 * `total = 12 * mult + 4`, labels the result "Faction ×1.17", and prints "4
 * votes" as a COUNT. All three are wrong. The model is
 * `(base + meta) × faction_mult + votes` (ADR-0014/0047/0053): the multiplier is
 * `own_task_modifier` / `other_task_modifier` and has nothing to do with how
 * anyone voted, votes are additive POINTS (`points_from_votes`), and meta sits
 * INSIDE the multiplier, not beside it. So the presentation is the design's and
 * every number comes from `scoreBreakdown()`.
 *
 * ## Row selection is not ours
 *
 * `scoreBreakdown()` is the single row-selection authority (ADR-0053) and every
 * rule below is its call, not this file's:
 *   - the BASE row appears only when some other term has moved the figure. With
 *     no multiplier, no metatask and no votes the disc already states it, so the
 *     row would print the same number twice (#1131) — the working out drops to
 *     nothing, and under ADR-0076 the tally and its rule go with it.
 *   - the MULT row appears only when the multiplier is not ×1.0. `era_1`
 *     neutralises it to 1.0 for every faction, so the row is dark today and
 *     lights up on its own if an era ever configures one.
 *   - the META row appears only when metatask points are > 0.
 *   - the HABIT row appears only when a habit bonus was banked (#1617), and sits
 *     under the tally's rule with the votes — both are flat terms added after
 *     the multiplier, never inside it.
 *   - the VOTES tally appears only when there are votes (ADR-0076), so a
 *     base-only praxis is the disc and its caption alone.
 * Nothing is derived by subtraction; that was the bug ADR-0053 retired.
 *
 * ## Size
 *
 * ONE width everywhere (`--text-*`-scaled type, geometry in raw px per §4a).
 * The stamp is size-agnostic by contract — the same component renders in a
 * praxis card's gutter, in the mobile card, on the composer's waiting surface
 * and in the detail page's aside — so it self-constrains rather than reading its
 * container. The design's two-COLUMN arrangement (disc left, rows right) is the
 * one thing not carried over: at the ~232px it needs, the stamp starves the
 * praxis card's title column, so the same pieces stack in one column instead.
 *
 * Colours are only `--faction-default-*` tokens, so the whole stamp flips
 * through the `[data-theme="dark"]` cascade with no `dark ?` branch.
 */

/**
 * The total mark — ornament geometry, the struck disc's own 96 (§4a), kept when
 * the disc became {@link DefaultPointsRing} (#2042) so nothing around it moved.
 * `RING_INSET` left with the disc's inner hairline.
 */
const MARK = 96;
/**
 * One width in every mount. Wide enough for the 96px mark plus the stamp's
 * padding, narrow enough that a praxis card's title column still reads.
 */
const STAMP_WIDTH = 150;

export default function DefaultScoreStamp({ praxis, showCrown }: ScoreStampProps) {
  const { t } = useTranslation("praxis");
  if (praxis.score === null || praxis.score === undefined) return null;
  const { base, mult, meta, habit, votes, total } = scoreBreakdown(praxis);
  const crowned = praxis.is_top_for_task && showCrown !== false;

  /** The working out, in reading order. Selection belongs to scoreBreakdown. */
  const rows: { key: string; label: string; value: string }[] = [];
  if (base !== null) {
    rows.push({ key: "base", label: t("card.stamp.base"), value: `${base}` });
  }
  if (mult !== null) {
    rows.push({ key: "mult", label: t("card.stamp.mult"), value: formatMult(mult) });
  }
  if (meta !== null) {
    rows.push({ key: "meta", label: t("card.stamp.meta"), value: `+${meta}` });
  }

  /**
   * The flat terms — the only thing that can follow the leader-line rows, and
   * the sole predicate for the block that draws them. Named once so the disc's
   * margin below can reuse it without restating it (#1894).
   */
  const hasFlatTerms = votes !== null || habit !== null;
  /**
   * Is there anything BELOW the disc at all? Both halves are needed: rows alone
   * (a sealed metatask nobody has voted on) and flat terms alone are each
   * reachable, so neither predicate implies the other.
   */
  const hasWorking = rows.length > 0 || hasFlatTerms;

  return (
    <div
      style={{
        position: "relative",
        boxSizing: "border-box",
        width: "100%",
        maxWidth: STAMP_WIDTH,
        border: "1px solid var(--faction-default-card-line)",
        borderRadius: 10,
        background: "var(--faction-default-stamp-bg)",
        color: "var(--faction-default-card-text)",
        boxShadow: "0 2px 6px var(--color-cast-shadow-soft)",
        padding: "var(--space-md)",
      }}
    >
      {/* The spectrum bar across the top edge — the na tell, and the rainbow's
          one structural appearance on this object (the total below is the
          other, clipped to type). */}
      <span
        aria-hidden
        className="spectrum-rule"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          borderRadius: "10px 10px 0 0",
        }}
      />

      {crowned && (
        <TaskCrown
          size={26}
          ringInset={3}
          rotate="8deg"
          style={{ position: "absolute", top: -13, right: -12, zIndex: 3 }}
        />
      )}

      {/* THE TOTAL SITS IN THE SPECTRUM RING (#2042).

          A STRUCK DISC stood here — a double hairline circle tilted -7deg holding
          a rainbow-clipped numeral over a `--faction-default-gold` caption, from
          the unaffiliated praxis-detail design (#1091). `na` was drawing its points
          mark twice, because the task card rings the same figure in a conic
          rainbow, and the owner's ruling on #2042 is that the point card reflects
          the card's total look. {@link DefaultPointsRing} is the one drawing now.

          THE RAINBOW IS STILL ON THIS OBJECT TWICE, and both appearances are
          structural rather than clipped to type: the 2px spectrum bar across the
          top edge, and the ring's annulus. What goes is the four-stop
          `-total-rainbow` fill on the figure and the gold caption under it — the
          ring letters its unit in `-card-muted`, which measures 6.15:1 light and
          4.82:1 dark on this plate against the gold's 5.00:1 / 8.23:1. Both clear
          AA_NORMAL; dark has less room than it did, which is the trade the ruling
          asks for. The figure reads 18.51:1 light / 12.20:1 dark.

          `ground` is this surface's plate rather than the ring's default card
          sheet, so the disc inside the annulus IS the plate and the mark reads as
          struck into it. The ring is drawn at the disc's own 96, so the stamp's
          `STAMP_WIDTH` still holds it with the padding it always had.

          The margin separates the mark from the working; with no working there is
          nothing to separate it FROM, and it became trailing dead space inside a
          symmetrically padded box (#1894). The box shrinks to padding + mark +
          padding rather than holding a `min-height` — a number pinned to whatever
          a one-row stamp measures today would rot the moment MARK or the padding
          moved. */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: hasWorking ? "var(--space-md)" : undefined,
        }}
      >
        <DefaultPointsRing
          value={formatPoints(total)}
          unit={t("card.stamp.points", { count: total })}
          size={MARK}
          ground="var(--faction-default-stamp-bg)"
        />
      </div>

      {/* Ruled leader-line rows — label, a hairline running out to fill the gap,
          then the figure. */}
      {rows.map((row) => (
        <div
          key={row.key}
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "var(--space-xs)",
            padding: "var(--space-xs) 0",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-base)",
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              color: "var(--faction-default-card-muted)",
              whiteSpace: "nowrap",
            }}
          >
            {row.label}
          </span>
          <span
            aria-hidden
            style={{
              flex: "1 1 auto",
              minWidth: 6,
              height: 1,
              background: "var(--faction-default-card-line)",
            }}
          />
          <span
            style={{
              fontFamily: "var(--faction-default-card-font)",
              fontSize: "var(--text-lg)",
              whiteSpace: "nowrap",
            }}
          >
            {row.value}
          </span>
        </div>
      ))}

      {/* The flat terms, under a rule of their own — the rule is the multiplier's
          edge: everything over it is inside `(base + meta) × mult` and everything
          under it is flat (#1617). Both leave at 0: the habit bonus always did,
          and the tally does since ADR-0076. With neither, the block goes rather
          than hanging an empty rule under the disc.

          `rows.length > 0` whenever this block is drawn — votes or habit both
          un-suppress the base row — so the rule is only ever conditional in the
          direction the compiler cannot see.

          The guard is `hasFlatTerms`, NOT `hasWorking`: the implication runs one
          way only. A sealed metatask nobody has voted on has rows and no flat
          terms, and widening this to `hasWorking` would draw the block's rule
          under it with nothing beneath — the orphan ADR-0076 exists to stop. */}
      {hasFlatTerms && (
        <div
          style={{
            borderTop: rows.length > 0 ? "1px solid var(--faction-default-card-line)" : undefined,
            marginTop: "var(--space-xs)",
            paddingTop: rows.length > 0 ? "var(--space-sm)" : undefined,
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-base)",
            letterSpacing: "0.06em",
            color: "var(--faction-default-card-muted)",
          }}
        >
          {votes !== null && <div>{t("card.stamp.fromVotes", { votes })}</div>}
          {habit !== null && <div>{t("card.stamp.habitBonus", { points: habit })}</div>}
        </div>
      )}
    </div>
  );
}
