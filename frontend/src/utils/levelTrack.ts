/**
 * The identity block's level track (#1553).
 *
 * The character card used to carry three unrelated figures — Score, Votes, Era
 * — and one of them (vote count) was an INPUT, not an achievement. In their
 * place the card reads as one sentence: era points, a track toward the next
 * level, and the two figures that bound it.
 *
 * The curve is NOT hardcoded here. `thresholds` is `EraConfig.level_thresholds`
 * as it arrives on `/game-config`, indexed the way the backend indexes it
 * (`thresholds[n]` = the era points that reach level `n`, `thresholds[0] = 0`),
 * so an era with a different curve — or a different number of levels — needs no
 * change on this side.
 *
 * THE DENOMINATOR IS THE NEXT THRESHOLD, NOT A BAND WIDTH. The design reads
 * "320 of 500" for a level-4 life whose next rung is 500: the track measures
 * the whole climb so far against where it is headed, so it does not snap back
 * to empty on every level-up. A band-relative fill ((score − previous) / (next
 * − previous)) would be a different, equally defensible widget; it is not the
 * one drawn.
 */

export interface LevelTrack {
  /** The level being climbed toward — `null` at the top of the era's curve. */
  nextLevel: number | null
  /** Era points still owed to reach it; `0` at the top of the curve. */
  pointsToNext: number
  /** The track's denominator: era points that reach `nextLevel`; `0` at the top. */
  nextThreshold: number
  /** Fill width as a percentage, clamped to 0–100. Full at the top of the curve. */
  fillPercent: number
}

/** Top of the curve: nothing left to climb, so the track reads full. */
const TOPPED_OUT: LevelTrack = {
  nextLevel: null,
  pointsToNext: 0,
  nextThreshold: 0,
  fillPercent: 100,
}

export function levelTrack(
  level: number,
  score: number,
  thresholds: readonly number[],
): LevelTrack {
  const nextThreshold = thresholds[level + 1]
  // `<= 0` guards a malformed curve as well as the end of a well-formed one:
  // dividing by a zero threshold would hand the track a NaN width.
  if (nextThreshold === undefined || nextThreshold <= 0) return TOPPED_OUT
  return {
    nextLevel: level + 1,
    pointsToNext: Math.max(0, nextThreshold - score),
    nextThreshold,
    fillPercent: Math.min(100, Math.max(0, (score / nextThreshold) * 100)),
  }
}
