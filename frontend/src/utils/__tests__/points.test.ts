/**
 * The faction task multiplier (ADR-0055).
 *
 * `computeFactionMultiplier` is what task cards render beside base points, so
 * the thing worth pinning is that it returns the RAW own/other factor from the
 * era config — not a reconstruction of `effective / base`, which rounds away
 * and silently reads 1.0 on small values.
 */
import { describe, it, expect } from 'vitest'
import type { FactionConfigOut } from '../../api/gameConfig'
import {
  computeDisplayPoints,
  computeFactionMultiplier,
  formatPoints,
  isNeutralMultiplier,
} from '../points'

function config(
  slug: string,
  own_task_modifier: number,
  other_task_modifier: number,
): FactionConfigOut {
  return {
    slug,
    own_task_modifier,
    other_task_modifier,
    // Irrelevant to the task multiplier; the praxis-side modifiers are a
    // separate axis (ADR-0053 retired the display one).
    collab_own_modifier: 1,
    collab_other_modifier: 1,
    duel_win_modifier: 1,
    duel_loss_modifier: 1,
    // #1869: Singularity's perk flag. Grants information, never points, so it
    // is irrelevant to every multiplier here — but part of the contract.
    reads_the_array: false,
    takes_duel_ties: false,
  }
}

// A tuned era: UA rewards its own, penalises everyone else's.
const TUNED = [config('ua', 1.5, 0.5), config('snide', 1, 1)]
// era_1's actual posture: the mechanism is live but neutralized everywhere.
const ERA_1 = [config('ua', 1, 1), config('snide', 1, 1)]

describe('computeFactionMultiplier', () => {
  it('is neutral for a viewer with no character/faction', () => {
    expect(computeFactionMultiplier(null, 'ua', TUNED)).toBe(1)
    expect(computeFactionMultiplier(undefined, 'ua', TUNED)).toBe(1)
  })

  it('is neutral when the viewer wears a faction the config does not know', () => {
    expect(computeFactionMultiplier('ua_masters', 'ua', TUNED)).toBe(1)
  })

  it('uses own_task_modifier on the viewer own faction task', () => {
    expect(computeFactionMultiplier('ua', 'ua', TUNED)).toBe(1.5)
  })

  it('uses other_task_modifier on another faction task', () => {
    expect(computeFactionMultiplier('ua', 'snide', TUNED)).toBe(0.5)
  })

  it('treats an unfactioned task and the na sentinel as own-faction', () => {
    expect(computeFactionMultiplier('ua', null, TUNED)).toBe(1.5)
    expect(computeFactionMultiplier('ua', 'na', TUNED)).toBe(1.5)
  })

  it('resolves to 1.0 for every viewer at era_1 values', () => {
    for (const viewer of ['ua', 'snide']) {
      for (const taskFaction of ['ua', 'snide', 'na', null]) {
        expect(computeFactionMultiplier(viewer, taskFaction, ERA_1)).toBe(1)
      }
    }
  })
})

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

describe('computeDisplayPoints', () => {
  it('still applies the same factor and rounds', () => {
    expect(computeDisplayPoints(10, 'ua', 'ua', TUNED)).toBe(15)
    expect(computeDisplayPoints(10, 'ua', 'snide', TUNED)).toBe(5)
    expect(computeDisplayPoints(7, 'ua', 'snide', TUNED)).toBe(4) // 3.5 → 4
  })

  it('agrees with base × computeFactionMultiplier', () => {
    const base = 18
    expect(computeDisplayPoints(base, 'ua', 'snide', TUNED)).toBe(
      Math.round(base * computeFactionMultiplier('ua', 'snide', TUNED)),
    )
  })
})
