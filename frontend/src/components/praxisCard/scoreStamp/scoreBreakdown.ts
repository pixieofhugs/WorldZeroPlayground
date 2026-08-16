/**
 * The shared, faction-INDEPENDENT half of the score stamp (ADR-0049, ADR-0053,
 * ADR-0076).
 *
 * ADR-0049 splits the stamp on the logic/presentation seam: this module owns the
 * row SELECTION — which of base / mult / meta / votes / total a card may show —
 * and every faction owns what those rows look like. One selector keeps all nine
 * skins honest; a faction that disagrees with the rows here is wrong, not
 * different.
 *
 * ADR-0053 made this the ONLY place the breakdown is resolved. A praxis has one
 * number, `score`, and carries the terms behind it; nothing anywhere derives
 * vote-points or a multiplier by subtraction (the old Merit assumption).
 */

/**
 * The score fields every praxis payload carries — structural, so both
 * `PraxisCardOut` (cards) and `PraxisOut` (detail) satisfy it (ADR-0053).
 */
export interface ScoredPraxis {
  task_point_value: number;
  metatask_points: number;
  display_multiplier: number;
  points_from_votes: number;
  /** UA's habit bonus — flat, OUTSIDE the multiplier (#1617). See below. */
  habit_bonus_points: number;
  score: number;
}

export interface ScoreBreakdown {
  /**
   * The task's base points, or null when the base row is hidden because it
   * would only restate the total (#1131).
   *
   * A null `base` always coincides with `mult`, `meta`, `habit` and `votes` all
   * being null — it is hidden precisely when no other term is in play — so a
   * skin that hangs its multiplier chip off the base row may drop the whole row
   * as one unit without orphaning the chip. It is therefore also the predicate
   * for "this stamp has any working at all", which is what each skin gates its
   * separating rule on: with no working, a braid, hairline, perforation or
   * ruled plate would rule off an empty block (ADR-0076).
   */
  base: number | null;
  /** The display multiplier, or null when the mult row is hidden (×1.0). */
  mult: number | null;
  /** Metatask points, or null when the meta row is hidden (`≤ 0`). */
  meta: number | null;
  /**
   * The habit bonus, or null when the row is hidden (`≤ 0`) — #1617.
   *
   * It is a FLAT term outside the multiplier, so a skin adds it beside `votes`
   * and never inside the `(base + meta) × mult` group. Multiplying it would make
   * the same faction ability worth more under an era with a non-neutral modifier
   * than under Era 1's 1.0, which is the owner ruling this null carries.
   */
  habit: number | null;
  /**
   * Points from votes, or null when the votes row is hidden (`≤ 0`) —
   * ADR-0076. It used to be the one term that printed at its neutral value; the
   * owner ruled that a score with no votes reads as the total alone.
   */
  votes: number | null;
  total: number;
}

/**
 * Resolve the rows a stamp should show (ADR-0053).
 *
 * One policy, no exceptions: a row exists when it tells the viewer something the
 * total mark does not already say. ADR-0076 folded the last exception in.
 *  - base row only when some other term has moved it — hidden when it would
 *    print the total a second time (#1131)
 *  - mult row only when `display_multiplier !== 1` (×1.0 moves nothing)
 *  - meta row only when `metatask_points > 0` (`+0` moves nothing)
 *  - habit row only when `habit_bonus_points > 0`, by the same rule (#1617). It
 *    is 0 for every faction but UA and for every character's FIRST praxis, so a
 *    row drawn at 0 would print "+0 habit" on nearly every card on the site and
 *    tell the viewer nothing the total does not already say.
 *  - votes row only when `points_from_votes > 0` (ADR-0076). This row was the
 *    declared exception until 2026-08-15 — ADR-0047 kept `+0` on the grounds
 *    that an absent row cannot say "nobody has voted yet" — and the owner ruled
 *    the other way: a score with no votes reads as the total alone.
 *  - total through `formatPoints` at the render sites — one decimal only when
 *    the score has one (#1866)
 *
 * A duel side's multiplier is live and provisional (ADR-0052) — a side that is
 * currently behind legitimately shows a loss modifier, ×0.0 for Snide.
 */
export function scoreBreakdown(praxis: ScoredPraxis): ScoreBreakdown {
  const rawBase = praxis.task_point_value ?? 0;
  const rawMult = praxis.display_multiplier ?? 1;
  const rawMeta = praxis.metatask_points ?? 0;
  const rawHabit = praxis.habit_bonus_points ?? 0;
  const mult = rawMult !== 1 ? rawMult : null;
  const meta = rawMeta > 0 ? rawMeta : null;
  const habit = rawHabit > 0 ? rawHabit : null;
  const rawVotes = praxis.points_from_votes ?? 0;
  const votes = rawVotes > 0 ? rawVotes : null;
  const total = praxis.score ?? 0;

  /**
   * #1131 — the empty state said `10.0 POINTS` and then `BASE 10`. Both halves
   * of this test are load-bearing: the terms decide whether any row could
   * explain a difference between base and total, and `total === rawBase` refuses
   * to hide a figure the payload itself disagrees with — a `score` that has
   * drifted from its terms must stay legible, not collapse silently into the
   * faction's total mark.
   */
  const baseRestatesTotal =
    mult === null && meta === null && habit === null && votes === null && total === rawBase;

  return {
    base: baseRestatesTotal ? null : rawBase,
    mult,
    meta,
    habit,
    votes,
    total,
  };
}

/**
 * `×0.80` — two decimals, matching the ADR-0047 sample. A multiplier is the one
 * figure that keeps its trailing zeros: `×0.8` reads as a typo, `×0.80` as a
 * rate. The TOTAL is the opposite and does NOT belong here — it goes through
 * `formatPoints` in `utils/points`, shared with the duel tiles and field desks,
 * because eight private `toFixed` calls are how Singularity drifted to two
 * decimals on a figure that should have had none (#1866).
 */
export function formatMult(mult: number): string {
  return `×${mult.toFixed(2)}`;
}
