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
 * THE DENOMINATOR IS THE CURRENT LEVEL'S BAND (#2127). It used to be the next
 * threshold — the whole climb so far measured against where it is headed —
 * while the character card measured the band. Both were honest and they
 * answered different questions, which is what made moving between home and
 * profile jarring. Owner ruling: within-level wins. A bar labelled *to next
 * level* that counts points banked two levels ago measures the wrong thing —
 * at level 9 it would sit near full permanently no matter how little had been
 * done lately. The cost is accepted and deliberate: the bar snaps back to
 * empty on every level-up, and the captions (`145 TO LEVEL 4`, `185 ALL-TIME`)
 * carry the climb the bar no longer draws.
 *
 * THIS IS THE ONLY PLACE A FILL FRACTION IS COMPUTED. `CharacterProfile` used
 * to derive its own from the same thresholds; that second copy was the defect.
 */

export interface LevelTrack {
  /** The level being climbed toward — `null` at the top of the era's curve. */
  nextLevel: number | null
  /** Era points still owed to reach it; `0` at the top of the curve. */
  pointsToNext: number
  /** Era points at which the current level began. */
  currentThreshold: number
  /** Era points that reach `nextLevel`; `0` at the top of the curve. */
  nextThreshold: number
  /** The bar's numerator: era points banked inside the current level. */
  pointsIntoLevel: number
  /** The bar's denominator: the width of the current level's band. */
  levelSpan: number
  /** Fill width as a percentage of the band, clamped 0–100. Full at the top. */
  fillPercent: number
}

export function levelTrack(
  level: number,
  score: number,
  thresholds: readonly number[],
): LevelTrack {
  const currentThreshold = thresholds[level] ?? 0
  const nextThreshold = thresholds[level + 1]
  // `<= currentThreshold` guards a malformed curve as well as the end of a
  // well-formed one: a zero-width band would hand the track a NaN width.
  if (nextThreshold === undefined || nextThreshold <= currentThreshold) {
    // Top of the curve: nothing left to climb, so the track reads full.
    return {
      nextLevel: null,
      pointsToNext: 0,
      currentThreshold,
      nextThreshold: 0,
      pointsIntoLevel: 0,
      levelSpan: 0,
      fillPercent: 100,
    }
  }
  const levelSpan = nextThreshold - currentThreshold
  const pointsIntoLevel = Math.max(0, Math.min(score, nextThreshold) - currentThreshold)
  return {
    nextLevel: level + 1,
    pointsToNext: Math.max(0, nextThreshold - score),
    currentThreshold,
    nextThreshold,
    pointsIntoLevel,
    levelSpan,
    fillPercent: (pointsIntoLevel / levelSpan) * 100,
  }
}
