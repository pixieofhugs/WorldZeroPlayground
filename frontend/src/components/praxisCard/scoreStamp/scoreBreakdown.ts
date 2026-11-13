/**
 * The faction-independent half of the score stamp (ADR-0049, ADR-0053,
 * ADR-0076): which rows a stamp may show, resolved only here. Skins own the
 * drawing. Nothing derives vote points or a multiplier by subtraction.
 *
 * Canonical order (#2634), on all nine skins:
 *
 *     base × mult      the multiplier is a CHIP on the base line
 *     ──────────       the subtotal rule
 *       subtotal       base × mult
 *     + meta / + votes / + habit
 *     ━━━━━━━━━━       the separating rule (ADR-0076), gated on `base !== null`
 *     [total mark]     the faction's own device, last
 */

/** Structural, so both `PraxisCardOut` and `PraxisOut` satisfy it (ADR-0053). */
export interface ScoredPraxis {
  task_point_value: number;
  metatask_points: number;
  display_multiplier: number;
  points_from_votes: number;
  /** UA's habit bonus — flat, outside the multiplier (#1617). */
  habit_bonus_points: number;
  score: number;
}

interface ScoreBreakdown {
  /**
   * Null when it would only restate the total (#1131). Null only when every
   * other term is null too, so it doubles as "this stamp has working" — the
   * gate for each skin's separating rule (ADR-0076).
   */
  base: number | null;
  /** Null at ×1.0. */
  mult: number | null;
  /** Null at `≤ 0`. */
  meta: number | null;
  /** Null at `≤ 0` (#1617). Flat: never inside the multiplied group. */
  habit: number | null;
  /** Null at `≤ 0` (ADR-0076: no votes reads as the total alone). */
  votes: number | null;
  /**
   * `base × mult` (#2634), null exactly when `mult` is. Computed here, not per
   * skin: the multiplier applies to the base alone since #2633
   * (`base × faction × duel + meta + votes + habit`). Unrounded — print it
   * through `formatPoints` (#1866).
   */
  subtotal: number | null;
  total: number;
}

/**
 * Resolve the rows a stamp shows (ADR-0053). A row exists only when it says
 * something the total mark doesn't:
 *  - base: unless it would restate the total (#1131)
 *  - mult: `display_multiplier !== 1`
 *  - meta / habit (#1617) / votes (ADR-0076): `> 0`
 *  - subtotal: `mult !== null` (#2634)
 *  - total: formatted by `formatPoints` at the render sites (#1866)
 *
 * A duel side's multiplier is live and provisional (ADR-0052): ×0.0 is real.
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
   * #1131. `total === rawBase` too: a score drifted from its terms must stay
   * legible rather than collapse into the total mark.
   */
  const baseRestatesTotal =
    mult === null && meta === null && habit === null && votes === null && total === rawBase;

  return {
    base: baseRestatesTotal ? null : rawBase,
    mult,
    meta,
    habit,
    votes,
    /* `rawBase` is safe: a live `mult` means `baseRestatesTotal` is false. */
    subtotal: mult !== null ? rawBase * mult : null,
    total,
  };
}

/**
 * `×0.80`: a multiplier keeps its trailing zeros (ADR-0047). Totals go through
 * `formatPoints` in `utils/points` instead (#1866).
 */
export function formatMult(mult: number): string {
  return `×${mult.toFixed(2)}`;
}
