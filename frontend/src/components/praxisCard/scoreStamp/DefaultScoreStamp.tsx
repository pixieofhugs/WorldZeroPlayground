import { useTranslation } from "react-i18next";
import { TaskCrown } from "../../factionMarks/TaskCrown";
import DefaultPointsRing from "../../factionMarks/DefaultPointsRing";
import { scoreBreakdown, formatMult } from "./scoreBreakdown";
import { formatPoints } from "../../../utils/points";
import { factionRoleVars } from "../../../utils/factionRoles";
import type { ScoreStampProps } from "./ScoreStamp";

/**
 * The Default / `na` score stamp — the unaffiliated SPECTRUM stamp (ADR-0039,
 * ADR-0049), and the fall-through every faction renders until its own slice
 * lands.
 *
 * Rebuilt to the Unaffiliated praxis-detail design (#1091, epic #1085). That
 * skin IS the unaffiliated one, so "restyle the default stamp" and "build the
 * design's score rail" are the same object: a total mark carrying the total
 * over a `POINTS` caption, then the working out as `LABEL … value` rows, then
 * ONE 2px spectrum rule, then the votes tally. A 2px spectrum bar was pinned
 * across the top edge until #2559 took it off — see the note at its old mount.
 *
 * THE GREY LINES ARE GONE (#2520, epic #2496). `Score-Stamp.dc.html` gives the
 * na stamp the spectrum treatment so that Albescent's delta can be MOTION alone
 * — the society was animating a rule the unaffiliated stamp did not have. The
 * rows' grey leader hairlines go (the figures keep their column on
 * `margin-left: auto`), the tally's grey `border-top` divider goes, and one
 * spectrum rule stands in for both wherever the working ends.
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
 * Colours are roles (#2672) — `--score-stamp-ink` / `-quiet` / `-face`, spread
 * on the plate and each falling back to the `--faction-default-*` token it read
 * before — so the whole stamp still flips through the `[data-theme="dark"]`
 * cascade with no `dark ?` branch.
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
        // The role map (#2672). Only the three CORE roles this plate reads move
        // here. `--faction-default-stamp-bg` and `-card-line` stay named: the
        // stamp has a ground of its own, and its hairline is `-card-line`, not
        // the `line` role's `-card-border`. Decision 07 — a surface's extras are
        // the surface's business, and repointing either would be a repaint.
        ...factionRoleVars(praxis.task_faction_slug, "score-stamp"),
        position: "relative",
        boxSizing: "border-box",
        width: "100%",
        maxWidth: STAMP_WIDTH,
        border: "1px solid var(--faction-default-card-line)",
        borderRadius: 10,
        background: "var(--faction-default-stamp-bg)",
        color: "var(--score-stamp-ink, var(--faction-default-card-text))",
        boxShadow: "0 2px 6px var(--color-cast-shadow-soft)",
        padding: "var(--space-md)",
      }}
    >
      {/* A 2px `spectrum-rule` band was pinned across this top edge until #2559.
          It called itself "the rainbow's one structural appearance on this
          object", and that stopped being true inside its own epic: #2042 made
          the disc below {@link DefaultPointsRing}, a spectrum RING, so the plate
          carried a structural spectrum twice. ADR-0083 §3b — one carrier per
          object, and whatever bar or hairline was doing that job comes off. The
          ring is the carrier; the rule over the working (below) is furniture
          inside the working out, not a second mark on the plate. */}

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

          THE RAINBOW IS STRUCTURAL ON THIS OBJECT, never clipped to type: the
          ring's annulus, and — since #2520 — the one rule over the working. (The
          2px bar across the top edge was the third until #2559; this mount is
          why it went.) What goes is the four-stop
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

      {/* THE STAMP'S ONE RULE (#2520, epic #2496) — a 2px spectrum, inset from
          the plate's edges by the plate's own padding, run to the width of the
          breakdown column. It replaces the 1px grey line the flat-terms block
          used to hang off its own `border-top`.

          IT SITS UNDER THE TOTAL, ABOVE THE WORKING, and that position is a
          ruling rather than a layout preference (owner, 2026-08-23). The board
          says the rule "prints under BASE — the row directly after the total —
          so the geometry matches the votes case", and anchoring it here is what
          makes "one spectrum rule per stamp, in every state" true WITHOUT ever
          leaving it orphaned. Anchored below the working instead, a sealed
          metatask nobody has voted on has rows and no flat terms, so the rule
          would be the last thing on the sheet with nothing beneath it — the
          orphan ADR-0076 exists to stop, and the exact reversal the old comment
          on this file warned against by name.

          `hasWorking`, not `hasFlatTerms`: base-only draws no breakdown at all
          (#1131 / ADR-0076) and so prints no rule, which is the one state the
          board also leaves bare. Every other state has rows or a tally beneath
          this line, so it always parts something from something.

          `position: relative` is the mount Albescent's travelling child needs.
          `.alb-moves .spectrum-rule:empty::before` is absolutely positioned, so
          without a containing block here it would resolve against the plate and
          paint the ramp straight over the working out. That the class reaches
          this rule is the point of #2520: the two stamps are one stamp, and the
          society's delta is that na's OWN spectra move (index.css owns the
          resting paint, motion.ornament.css the travel). The class reached the
          top-edge band too until #2559 removed it; the ring's `.spectrum-dial`
          is the other mount the marker still dresses. */}
      {hasWorking && (
        <span
          aria-hidden
          className="spectrum-rule"
          style={{
            display: "block",
            position: "relative",
            height: 2,
            borderRadius: 2,
            marginBottom: "var(--space-xs)",
          }}
        />
      )}

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
              color: "var(--score-stamp-quiet, var(--faction-default-card-muted))",
              whiteSpace: "nowrap",
            }}
          >
            {row.label}
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontFamily: "var(--score-stamp-face, var(--faction-default-card-font))",
              fontSize: "var(--text-lg)",
              whiteSpace: "nowrap",
            }}
          >
            {row.value}
          </span>
        </div>
      ))}

      {/* The flat terms — everything over the rule is inside
          `(base + meta) × mult` and everything under it is flat (#1617). Both
          leave at 0: the habit bonus always did, and the tally does since
          ADR-0076, and with neither the block goes.

          THE RULE IS NO LONGER THIS BLOCK'S `border-top`. It was, which is why
          it had to be conditional on `rows.length` from in here; it is now the
          stamp's own element under the total, drawn once for the whole sheet,
          so this block carries nothing but its ink and its own space. */}
      {hasFlatTerms && (
        <div
          style={{
            marginTop: "var(--space-sm)",
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-base)",
            letterSpacing: "0.06em",
            color: "var(--score-stamp-quiet, var(--faction-default-card-muted))",
          }}
        >
          {votes !== null && <div>{t("card.stamp.fromVotes", { votes })}</div>}
          {habit !== null && <div>{t("card.stamp.habitBonus", { points: habit })}</div>}
        </div>
      )}
    </div>
  );
}
