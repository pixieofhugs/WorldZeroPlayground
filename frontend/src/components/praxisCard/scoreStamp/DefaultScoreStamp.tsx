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
 * design's score rail" are the same object: the working out as `LABEL … value`
 * rows, ONE 2px spectrum rule, and a total mark carrying the total over a
 * `POINTS` caption. A 2px spectrum bar was pinned across the top edge until
 * #2559 took it off — see the note at its old mount.
 *
 * ## THE SHEET WAS TURNED THE RIGHT WAY UP BY #2634
 *
 * It used to read mark, rows, then two PROSE lines — "+ 4 from votes", "+ 5
 * habit bonus" — hanging outside the working in a block of their own. That made
 * this the one stamp of nine whose total came first, and the one whose last two
 * terms spoke in a second copy register and a second arrangement. Three things
 * moved, all of them the owner's ruling of 2026-08-24 and none of them a repaint:
 *
 *   1. the ring goes LAST, like every other faction's total mark;
 *   2. `votes` and `habit` become rows inside the working, labelled `votes` and
 *      `habit` from the shared keys — the two sentence keys are deleted;
 *   3. the spectrum rule moves from above the working to below it, which
 *      reverses an owner ruling of 2026-08-23 rather than drifting from it. The
 *      old reasoning is kept at the mount, with what dissolved it.
 *
 * The multiplier also leaves its own row and rides the base line as a chip, and
 * a SUBTOTAL row arrives under a hairline of the plate's own `-card-line`. Both
 * are the canonical stamp all nine now draw; the figure is
 * `ScoreBreakdown.subtotal` and nothing here computes it.
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
 * `base × faction_mult × duel_mult + meta + votes + habit` (ADR-0014/0047/0053,
 * as #2633 left it): the multiplier is `own_task_modifier` /
 * `other_task_modifier` and has nothing to do with how anyone voted, and votes
 * are additive POINTS (`points_from_votes`). This paragraph used to end "meta
 * sits INSIDE the multiplier, not beside it", which was true of the model
 * ADR-0014 described and stopped being true when #2633 moved it out; it is
 * beside it now, which is exactly why the subtotal below is `base × mult` and
 * not `base + meta`. So the presentation is the design's and every number comes
 * from `scoreBreakdown()`.
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
 *   - the SUBTOTAL row appears only when the multiplier does (#2634), and it is
 *     the resolver's figure, `base × mult`. Nothing is summed here.
 *   - the HABIT row appears only when a habit bonus was banked (#1617), and sits
 *     with the votes BELOW the subtotal's rule — both are flat terms added after
 *     the multiplier, never inside it.
 *   - the VOTES row appears only when there are votes (ADR-0076), so a
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
 * Colours are roles (#2672) — `--na-score-stamp-ink` / `-quiet` / `-face`, spread
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
  const { base, mult, meta, habit, votes, subtotal, total } = scoreBreakdown(praxis);
  const crowned = praxis.is_top_for_task && showCrown !== false;

  /**
   * The working out, in the canonical order (#2634): base with the multiplier
   * chipped onto it, the subtotal under its own rule, then the three additive
   * terms. Selection belongs to `scoreBreakdown` and so, since #2634, does the
   * sequence.
   *
   * `chip` rides the base row; `ruled` draws the subtotal's hairline above a row.
   */
  const rows: {
    key: string;
    label: string;
    value: string;
    chip?: string;
    ruled?: boolean;
  }[] = [];
  if (base !== null) {
    rows.push({
      key: "base",
      label: t("card.stamp.base"),
      value: `${base}`,
      // The multiplier was a leader-line row of its own until #2634. Under
      // #2633's formula it applies to the base and to nothing else, so it rides
      // that row as a chip — the operation next to the figure, with its result
      // on the line beneath.
      chip: mult !== null ? formatMult(mult) : undefined,
    });
  }
  // `formatPoints`, as for the figure in the ring: `12 × 0.8` is
  // `9.600000000000001` in doubles and this sheet does not invent its own
  // rounding (#1866).
  if (subtotal !== null) {
    rows.push({
      key: "subtotal",
      label: t("card.stamp.subtotal"),
      value: formatPoints(subtotal),
      ruled: true,
    });
  }
  if (meta !== null) {
    rows.push({ key: "meta", label: t("card.stamp.meta"), value: `+${meta}` });
  }
  /*
   * THE FLAT TERMS ARE ROWS NOW (#2634). They were two prose lines —
   * "+ 4 from votes", "+ 5 habit bonus" — in a block of their own OUTSIDE the
   * leader-line rows, which made this the one stamp of nine printing the same
   * two terms in a second copy register and a second arrangement. They take the
   * bare labels and the ledger the other three rows already use; the two
   * sentence keys are deleted from `praxis.json`.
   *
   * They stay flat and OUTSIDE the multiplier (#1617) — which the order says on
   * its own now that the subtotal's rule is above them rather than the block's
   * own `border-top` being below.
   */
  if (votes !== null) {
    rows.push({ key: "votes", label: t("card.stamp.votes"), value: `+${votes}` });
  }
  if (habit !== null) {
    rows.push({ key: "habit", label: t("card.stamp.habit"), value: `+${habit}` });
  }

  /**
   * Is there any working at all? `base !== null` is `scoreBreakdown`'s own
   * predicate for it — the resolver nulls the base exactly when no other term is
   * in play — and it is what ADR-0076 gates a separating rule on across all nine
   * skins. It is equivalent to `rows.length > 0` here and says WHY rather than
   * counting, which is what the old `hasWorking` could not.
   */
  const hasWorking = base !== null;

  return (
    <div
      style={{
        // The role map (#2672). Only the three CORE roles this plate reads move
        // here. `--faction-default-stamp-bg` and `-card-line` stay named: the
        // stamp has a ground of its own, and its hairline is `-card-line`, not
        // the `line` role's `-card-border`. Decision 07 — a surface's extras are
        // the surface's business, and repointing either would be a repaint.
        // Pinned to na for the reason the other Default archetypes are: the
        // plate's ground is `--faction-default-stamp-bg`, which takes no slug.
        ...factionRoleVars("na", "na-score-stamp"),
        position: "relative",
        boxSizing: "border-box",
        width: "100%",
        maxWidth: STAMP_WIDTH,
        border: "1px solid var(--faction-default-card-line)",
        borderRadius: 10,
        background: "var(--faction-default-stamp-bg)",
        color: "var(--na-score-stamp-ink)",
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

      {/* Ruled leader-line rows — label, a hairline running out to fill the gap,
          then the figure. Since #2634 this block is the WHOLE working: the two
          flat terms used to be prose in a block of their own beneath the disc,
          and they are rows here like everything else. */}
      {rows.map((row) => (
        <div key={row.key}>
          {/* THE SUBTOTAL'S RULE — the plate's own hairline, `-card-line`, the
              same material as its border.

              IT IS NOT A SECOND SPECTRUM AND MUST NOT BECOME ONE. ADR-0083 §3b
              gives an object one structural carrier; on this plate that is the
              ring, and `.spectrum-rule` below is furniture inside the working
              rather than a second mark. A rainbow here would be a third.

              #2520 DID TAKE GREY LINES OFF THIS SHEET and this is not their
              return. What went were the rows' LEADER hairlines and the flat
              block's `border-top` — two lines that stood in for a rule and said
              nothing arithmetic. This one says the multiplier has been applied,
              which is the same thing Coven draws dashed, Everymen strike in red
              and UA rule in the plate's own line. */}
          {row.ruled && (
            <div
              aria-hidden
              style={{
                height: 1,
                background: "var(--faction-default-card-line)",
                margin: "var(--space-xs) 0 0",
              }}
            />
          )}
          <div
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
                color: "var(--na-score-stamp-quiet)",
                whiteSpace: "nowrap",
              }}
            >
              {row.label}
            </span>
            <span
              style={{
                marginLeft: "auto",
                fontFamily: "var(--na-score-stamp-face)",
                fontSize: "var(--text-lg)",
                whiteSpace: "nowrap",
              }}
            >
              {row.value}
            </span>
            {/* The multiplier chip, outboard of the figure column rather than in
                it. The figures keep the column `margin-left: auto` gives them,
                and the chip hangs off the base row's right end — so the
                operation reads left-to-right off the number it applies to, and
                the subtotal beneath still lines up with the terms it is summed
                with. */}
            {row.chip && (
              <span
                style={{
                  fontFamily: "var(--na-score-stamp-face)",
                  fontSize: "var(--text-base)",
                  color: "var(--na-score-stamp-quiet)",
                  whiteSpace: "nowrap",
                }}
              >
                {row.chip}
              </span>
            )}
          </div>
        </div>
      ))}

      {/* THE STAMP'S ONE SPECTRUM RULE (#2520, epic #2496) — a 2px spectrum,
          inset from the plate's edges by the plate's own padding, run to the
          width of the breakdown column.

          IT SITS UNDER THE WORKING, ABOVE THE TOTAL, AND THAT REVERSES AN OWNER
          RULING RATHER THAN DRIFTING FROM ONE. The reasoning it reverses is kept
          here because it was sound about the sheet it was written for: on
          2026-08-23 the owner anchored it under the TOTAL and above the working,
          on the grounds that "one spectrum rule per stamp, in every state" could
          only be kept true WITHOUT orphaning it if it hung off something always
          drawn — and with the total on TOP, a rule anchored below the working
          would be the last thing on the sheet whenever a sealed metatask nobody
          has voted on left rows and no flat terms.

          #2634 dissolved the worry rather than overruling it. Totals now sit at
          the bottom on all nine stamps, so a rule above the total always has the
          total beneath it, in every state; and the flat terms are rows inside
          the working now, so the shape that would have orphaned it no longer
          exists. The rule ends up where the other eight put their separating
          rule, which is what ADR-0076 describes and what this sheet was the one
          exception to.

          `base !== null` is the resolver's own predicate for "there is working
          to rule off" — the same gate S.N.I.D.E.'s perforation, WOW's hairline
          and the Everymen plate use. Base-only draws no breakdown at all (#1131
          / ADR-0076) and so prints no rule, which is the one state the board
          also leaves bare.

          `position: relative` is the mount Albescent's travelling child needs,
          and THE SPAN MUST STAY CHILDLESS: `.alb-moves .spectrum-rule:empty` is
          what matches it, and `::before` is absolutely positioned, so without a
          containing block here the ramp would resolve against the plate and
          paint straight over the working out. #2543 is why that is asserted at
          two seams rather than assumed — `albescentSpectraMove` reads it out of
          this source and `albescentDriftStopsAtMedia` reads it off the render.
          That the class reaches this rule is the point of #2520: the two stamps
          are one stamp, and the society's delta is that na's OWN spectra move
          (index.css owns the resting paint, motion.ornament.css the travel). The
          class reached the top-edge band too until #2559 removed it; the ring's
          `.spectrum-dial` is the other mount the marker still dresses. */}
      {hasWorking && (
        <span
          aria-hidden
          className="spectrum-rule"
          style={{
            display: "block",
            position: "relative",
            height: 2,
            borderRadius: 2,
            margin: "var(--space-sm) 0 var(--space-md)",
          }}
        />
      )}

      {/* THE TOTAL SITS IN THE SPECTRUM RING (#2042), AND THE RING SITS LAST
          (#2634).

          IT USED TO SIT FIRST. The owner's ruling of 2026-08-24 is that totals
          sit at the bottom on all nine stamps, and na was the only violator: the
          disc led the plate, the leader-line rows followed it, and two prose
          lines hung below them — so the one sheet that read total-then-working
          also spoke its last two terms in a different voice. Nothing about the
          ring itself moved: same drawing, same size, same ground, same inks.

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

          #1894's trailing dead space cannot recur. The margin that separated the
          mark from the working belonged to the DISC and is the spectrum rule's
          now, so with no working there is no rule and no margin, and the box
          shrinks to padding + mark + padding on its own rather than holding a
          `min-height` that would rot the moment MARK or the padding moved. */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <DefaultPointsRing
          value={formatPoints(total)}
          unit={t("card.stamp.points", { count: total })}
          size={MARK}
          ground="var(--faction-default-stamp-bg)"
        />
      </div>
    </div>
  );
}
