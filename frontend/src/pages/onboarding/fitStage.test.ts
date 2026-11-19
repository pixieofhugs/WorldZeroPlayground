import { describe, expect, it } from 'vitest'
import { scrollNeeded } from './fitStage'

describe('scrollNeeded', () => {
  it('is 0 when the control already sits above the box', () => {
    expect(scrollNeeded(300, 500)).toBe(0)
  })
  it('scrolls by the overlap plus the gap when the box covers the control', () => {
    expect(scrollNeeded(520, 500)).toBe(32)
  })
})
