/**
 * The identity block's level track (#1553). `thresholds` is
 * `EraConfig.level_thresholds` from `/game-config` (`thresholds[n]` = era points
 * reaching level `n`), never hardcoded. The bar measures the CURRENT level's
 * band (#2127, owner ruling), so it empties on every level-up. The only place a
 * fill fraction is computed.
 */

export interface LevelTrack {
  /** `null` at the top of the era's curve. */
  nextLevel: number | null
  /** `0` at the top of the curve. */
  pointsToNext: number
  currentThreshold: number
  /** `0` at the top of the curve. */
  nextThreshold: number
  pointsIntoLevel: number
  levelSpan: number
  /** Clamped 0–100; full at the top. */
  fillPercent: number
}

export function levelTrack(
  level: number,
  score: number,
  thresholds: readonly number[],
): LevelTrack {
  const currentThreshold = thresholds[level] ?? 0
  const nextThreshold = thresholds[level + 1]
  // `<=` also guards a malformed curve (a zero-width band gives NaN).
  if (nextThreshold === undefined || nextThreshold <= currentThreshold) {
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
