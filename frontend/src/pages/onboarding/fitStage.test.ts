import { describe, expect, it } from 'vitest'
import { fitFloor } from './fitStage'

describe('fitFloor', () => {
  it('lets a decorative scene shrink to the base floor', () => {
    expect(fitFloor(null)).toBe(0.3)
  })
  it('keeps a live control at 24px or more', () => {
    expect(fitFloor(32) * 32).toBeGreaterThanOrEqual(24)
    expect(fitFloor(10)).toBe(1)
  })
  it('never goes below the base floor for a big control', () => {
    expect(fitFloor(400)).toBe(0.3)
  })
})
