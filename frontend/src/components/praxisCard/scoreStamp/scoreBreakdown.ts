/**
 * The shared, faction-INDEPENDENT half of the score stamp (ADR-0049, ADR-0053).
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
   * A null `base` always coincides with `mult === null`, `meta === null` and
   * `votes === 0` — it is hidden precisely when no other term is in play — so a
   * skin that hangs its multiplier chip off the base row may drop the whole row
   * as one unit without orphaning the chip.
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
  votes: number;
  total: number;
}

/**
 * Resolve the rows a stamp should show (ADR-0053).
 *
 * One policy, four clauses: a row exists when it tells the viewer something the
 * total mark does not already say, with the votes row as the single declared
 * exception.
 *  - base row only when some other term has moved it — hidden when it would
 *    print the total a second time (#1131)
 *  - mult row only when `display_multiplier !== 1` (×1.0 moves nothing)
 *  - meta row only when `metatask_points > 0` (`+0` moves nothing)
 *  - habit row only when `habit_bonus_points > 0`, by the same rule (#1617). It
 *    is 0 for every faction but UA and for every character's FIRST praxis, so a
 *    row drawn at 0 would print "+0 habit" on nearly every card on the site and
 *    tell the viewer nothing the total does not already say.
 *  - votes row ALWAYS, `+0` included — the exception, re-affirmed in ADR-0047:
 *    an absent row cannot say "nobody has voted yet"
 *  - total to 1 decimal at the render sites
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
  const votes = praxis.points_from_votes ?? 0;
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
    mult === null && meta === null && habit === null && votes === 0 && total === rawBase;

  return {
    base: baseRestatesTotal ? null : rawBase,
    mult,
    meta,
    habit,
    votes,
    total,
  };
}

/** `×0.80` — two decimals, matching the ADR-0047 sample. */
export function formatMult(mult: number): string {
  return `×${mult.toFixed(2)}`;
}
