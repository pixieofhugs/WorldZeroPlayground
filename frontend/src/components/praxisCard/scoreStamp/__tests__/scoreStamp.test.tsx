/**
 * The score stamp's two halves (ADR-0047, ADR-0049).
 *
 * `scoreBreakdown` is the SHARED half: one selector deciding which rows any
 * faction's stamp may show. It had no test before #839 — the row rules lived
 * only in a docstring, which is exactly how #821 shipped nine skins that each
 * re-decided them. These cases pin the rules so a faction slice cannot quietly
 * drop a row.
 *
 * The dispatch cases pin the other half: the stamp resolves per faction with
 * `Default*` fall-through, like every other surface (ADR-0039).
 */
import { describe, it, expect } from 'vitest'
import type { PraxisCardOut } from '../../../../api/praxis'
import { pickVariant } from '../../../../utils/factionDispatch'
import { surfaceMap } from '../../../../factions'
import { scoreBreakdown, formatMult } from '../scoreBreakdown'
import DefaultScoreStamp from '../DefaultScoreStamp'

/**
 * Overrides are loosely typed on purpose: several cases below feed `null` into
 * fields the API declares non-nullable, which is exactly the defensive `?? 0`
 * path in `scoreBreakdown` that a wire-shape drift would otherwise hit unseen.
 */
function praxis(overrides: Record<string, unknown>): PraxisCardOut {
  return {
    base_points: 12,
    display_multiplier: 0.8,
    metatask_points: 0,
    points_from_votes: 4,
    total: 13.6,
    ...overrides,
  } as PraxisCardOut
}

describe('scoreBreakdown row selection (ADR-0047)', () => {
  it('reads the #819 breakdown fields straight through', () => {
    expect(scoreBreakdown(praxis({}))).toEqual({
      base: 12,
      mult: 0.8,
      meta: null,
      votes: 4,
      total: 13.6,
    })
  })

  it('hides the mult row at ×1.0 and when absent (collab)', () => {
    expect(scoreBreakdown(praxis({ display_multiplier: 1 })).mult).toBeNull()
    expect(scoreBreakdown(praxis({ display_multiplier: null })).mult).toBeNull()
  })

  it('hides the meta row at 0 or below, shows it above', () => {
    expect(scoreBreakdown(praxis({ metatask_points: 0 })).meta).toBeNull()
    expect(scoreBreakdown(praxis({ metatask_points: null })).meta).toBeNull()
    expect(scoreBreakdown(praxis({ metatask_points: 3 })).meta).toBe(3)
  })

  it('always keeps the votes row — +0 is a real value, not an absent one', () => {
    expect(scoreBreakdown(praxis({ points_from_votes: 0 })).votes).toBe(0)
  })

  it('never derives vote points by subtraction (the old Merit assumption)', () => {
    // total is authoritative and unrelated to base/votes arithmetic here.
    const rows = scoreBreakdown(praxis({ base_points: 12, points_from_votes: 4, total: 99 }))
    expect(rows.votes).toBe(4)
    expect(rows.total).toBe(99)
  })

  it('treats missing numerics as zero rather than NaN', () => {
    expect(
      scoreBreakdown(
        praxis({ base_points: null, points_from_votes: null, total: null }),
      ),
    ).toEqual({ base: 0, mult: 0.8, meta: null, votes: 0, total: 0 })
  })

  it('formats the multiplier to two decimals', () => {
    expect(formatMult(0.8)).toBe('×0.80')
    expect(formatMult(2)).toBe('×2.00')
  })
})

describe('scoreStamp surface dispatch (ADR-0049)', () => {
  it('falls through to the Default stamp for every slug until a faction claims it', () => {
    for (const slug of ['ua', 'snide', 'everymen', 'ephemerists', 'singularity', 'coven', 'wow', 'albescent', 'na', null]) {
      expect(pickVariant(surfaceMap('scoreStamp'), slug, DefaultScoreStamp)).toBe(DefaultScoreStamp)
    }
  })
})
