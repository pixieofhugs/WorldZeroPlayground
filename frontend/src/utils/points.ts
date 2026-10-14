/**
 * The identity multiplier. `era_1` neutralizes every faction's own/other task
 * modifier to this, which is why no card shows a modifier badge today — the
 * mechanism is live infrastructure, merely turned off (ADR-0055).
 */
const NEUTRAL_MULTIPLIER = 1

/** Float slop tolerance — `0.1 + 0.2` arithmetic must not light up a badge. */
const MULTIPLIER_EPSILON = 1e-9

/**
 * True when a multiplier is the identity and so carries no information — the
 * gate every card's `×n` badge hides behind (ADR-0055). Shared so nine skins
 * cannot drift into nine different float comparisons.
 */
export function isNeutralMultiplier(multiplier: number): boolean {
  return Math.abs(multiplier - NEUTRAL_MULTIPLIER) < MULTIPLIER_EPSILON
}

/**
 * A points figure for a one-line stamp: whole numbers stay whole, anything else
 * takes one decimal — never a raw float with fifteen digits of arithmetic noise
 * on it. A praxis score is a weighted sum, so that noise is the normal case.
 *
 * Lives here rather than beside any one surface because the duel stakes tiles,
 * the desktop FieldDesk's "continue" rows, all eight mobile field desks, the
 * duel card on praxis detail and all eight praxis-card score stamps print the
 * same kind of figure, and private copies of one `toFixed` are how the rounding
 * rule drifts (#1834, #1866 — one stamp had already drifted to two decimals).
 *
 * Round FIRST, then strip: `Number.isInteger` is not the test, because
 * `compute_praxis_score` does no rounding and puts the raw product on the wire.
 * Coven's `collab_own_modifier=1.1` on 50 points is `55.00000000000001`, which
 * is not an integer and would print as `55.0` on a score that is whole (#1866).
 */
export function formatPoints(value: number): string {
  return Number(value.toFixed(1)).toString()
}
