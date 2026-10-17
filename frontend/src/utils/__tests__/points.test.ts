/**
 * Multiplier badge gate + points formatter. The own/other branch itself lives
 * on the server (#2865); the client formats what `viewer_faction_multiplier` says.
 */
import { describe, it, expect } from 'vitest'
import {
  formatPoints,
  isNeutralMultiplier,
} from '../points'

describe('isNeutralMultiplier', () => {
  it('is true at exactly 1 and at float slop around it', () => {
    expect(isNeutralMultiplier(1)).toBe(true)
    expect(isNeutralMultiplier(0.1 + 0.9)).toBe(true)
  })

  it('is false for a tuned modifier', () => {
    expect(isNeutralMultiplier(1.5)).toBe(false)
    expect(isNeutralMultiplier(0.5)).toBe(false)
  })
})

/**
 * The one formatter every points figure on the site goes through (#1866).
 *
 * The rule is "no decimal unless it is relevant", and the values below are the
 * ones `era_1` actually produces — a `.5` from any faction's duel modifiers and
 * Coven's `collab_own_modifier=1.1`. `compute_praxis_score` does no rounding, so
 * the raw IEEE product reaches the wire and the last two cases are live.
 */
describe('formatPoints', () => {
  it('drops the decimal on a whole figure', () => {
    expect(formatPoints(10)).toBe('10')
    expect(formatPoints(0)).toBe('0')
  })

  it('keeps a fractional figure — era_1 duels halve a base', () => {
    // duel_loss_modifier=0.5 on a 15-point task.
    expect(formatPoints(7.5)).toBe('7.5')
  })

  it('keeps a Coven collab tenth without its arithmetic noise', () => {
    // collab_own_modifier=1.1 on a 13-point task: 14.300000000000001 in JS.
    expect(formatPoints(13 * 1.1)).toBe('14.3')
  })

  it('drops the decimal when the noise is all that makes it fractional', () => {
    // The same modifier on 50 points: 55.00000000000001, which `Number.isInteger`
    // rejects. Rounding must come BEFORE the trailing zero is stripped, or the
    // stamp reads `55.0` on a whole score.
    expect(formatPoints(50 * 1.1)).toBe('55')
  })
})
