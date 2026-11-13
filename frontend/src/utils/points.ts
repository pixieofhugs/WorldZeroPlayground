/** `era_1` neutralizes every faction modifier to this, so no badge shows (ADR-0055). */
const NEUTRAL_MULTIPLIER = 1

/** So `0.1 + 0.2` arithmetic cannot light up a badge. */
const MULTIPLIER_EPSILON = 1e-9

/** Gate for every card's `×n` badge; shared so nine skins cannot drift. */
export function isNeutralMultiplier(multiplier: number): boolean {
  return Math.abs(multiplier - NEUTRAL_MULTIPLIER) < MULTIPLIER_EPSILON
}

/**
 * Whole numbers stay whole, else one decimal; the one shared rounding rule
 * (#1834). Round FIRST: the wire carries raw products like `55.00000000000001` (#1866).
 */
export function formatPoints(value: number): string {
  return Number(value.toFixed(1)).toString()
}
