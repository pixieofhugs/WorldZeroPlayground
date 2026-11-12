import { beforeEach, describe, expect, it } from 'vitest'
import {
  __resetCastTallies,
  castTally,
  castTallyClock,
  clearCastTallies,
  recordCastTally,
} from '../../../utils/castTallies'

const PRAXIS = 42

/**
 * #1382: the store holds the POST's tally, not a client delta, so only
 * supersession is tested; the arithmetic is in `test_votes.py`.
 */
describe('castTallies', () => {
  beforeEach(() => {
    __resetCastTallies()
  })

  it('reports nothing for a praxis nobody has voted on this session', () => {
    expect(castTally(PRAXIS)).toBeNull()
  })

  it('hands back exactly what the cast returned', () => {
    recordCastTally(PRAXIS, { points_from_votes: 17, voter_count: 4 })
    expect(castTally(PRAXIS)).toEqual({ points_from_votes: 17, voter_count: 4 })
  })

  it('lets the newer cast win outright rather than compounding', () => {
    recordCastTally(PRAXIS, { points_from_votes: 4, voter_count: 1 })
    recordCastTally(PRAXIS, { points_from_votes: 2, voter_count: 1 })
    expect(castTally(PRAXIS)).toEqual({ points_from_votes: 2, voter_count: 1 })
  })

  it('retires the entry once the server has caught up', () => {
    recordCastTally(PRAXIS, { points_from_votes: 4, voter_count: 1 })
    clearCastTallies([PRAXIS], castTallyClock())
    // Keeping it would mask another player's later vote.
    expect(castTally(PRAXIS)).toBeNull()
  })

  it('keeps a tally the read cannot have known about', () => {
    // #3093: a read retires nothing newer than its own asking.
    const asked = castTallyClock()
    recordCastTally(PRAXIS, { points_from_votes: 4, voter_count: 1 })
    clearCastTallies([PRAXIS], asked)
    expect(castTally(PRAXIS)).toEqual({ points_from_votes: 4, voter_count: 1 })
  })

  it('leaves other praxes alone when clearing', () => {
    recordCastTally(PRAXIS, { points_from_votes: 4, voter_count: 1 })
    recordCastTally(99, { points_from_votes: 5, voter_count: 1 })
    clearCastTallies([PRAXIS], castTallyClock())
    expect(castTally(PRAXIS)).toBeNull()
    expect(castTally(99)).toEqual({ points_from_votes: 5, voter_count: 1 })
  })
})
