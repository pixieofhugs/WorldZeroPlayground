/**
 * The level track measures the CURRENT LEVEL'S span (#2127; owner ruling: one
 * within-level derivation everywhere). Worked example: level 3 spans 170 → 330.
 */
import { describe, it, expect } from 'vitest'
import { levelTrack } from '../levelTrack'

/** A curve shaped like the era's, but owned by the test — never era values. */
const THRESHOLDS = [0, 20, 70, 170, 330, 550]

describe('levelTrack', () => {
  it('fills against the current level band, not the whole climb', () => {
    const track = levelTrack(3, 185, THRESHOLDS)
    expect(track.currentThreshold).toBe(170)
    expect(track.nextThreshold).toBe(330)
    expect(track.pointsIntoLevel).toBe(15)
    expect(track.levelSpan).toBe(160)
    // 15/160, NOT 185/330 (which would be 56%).
    expect(track.fillPercent).toBeCloseTo(9.375, 3)
  })

  it('keeps the captions cumulative — they answer the other question', () => {
    const track = levelTrack(3, 185, THRESHOLDS)
    expect(track.nextLevel).toBe(4)
    expect(track.pointsToNext).toBe(145)
  })

  it('reads empty the moment a level is reached', () => {
    expect(levelTrack(3, 170, THRESHOLDS).fillPercent).toBe(0)
  })

  it('reads full at the top of the era curve', () => {
    const track = levelTrack(5, 900, THRESHOLDS)
    expect(track.nextLevel).toBeNull()
    expect(track.fillPercent).toBe(100)
    expect(track.currentThreshold).toBe(550)
  })

  it('clamps a score that has outrun its recorded level', () => {
    // A stale row (score banked, level not yet applied).
    expect(levelTrack(3, 9999, THRESHOLDS).fillPercent).toBe(100)
    expect(levelTrack(3, 0, THRESHOLDS).fillPercent).toBe(0)
  })
})
