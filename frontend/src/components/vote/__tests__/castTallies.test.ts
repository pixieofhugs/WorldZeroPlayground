import { beforeEach, describe, expect, it } from 'vitest'
import {
  __resetCastTallies,
  castTally,
  clearCastTallies,
  recordCastTally,
} from '../../../utils/castTallies'

const PRAXIS = 42

/**
 * #1382 — the store holds the tally the vote POST returned, not a delta the
 * client computed. Every test here is about *supersession*, because that is all
 * an authoritative value can get wrong. The arithmetic these used to pin (first
 * cast vs re-vote, measuring from server truth rather than my own last guess)
 * is now the server's, asserted in `backend/tests/integration/test_votes.py`.
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
    // Vote, then change my mind before any refetch lands. Each response is the
    // server's post-write truth, so the second REPLACES the first — the delta
    // store had to reason about priors here to avoid counting my own guess twice.
    recordCastTally(PRAXIS, { points_from_votes: 4, voter_count: 1 })
    recordCastTally(PRAXIS, { points_from_votes: 2, voter_count: 1 })
    expect(castTally(PRAXIS)).toEqual({ points_from_votes: 2, voter_count: 1 })
  })

  it('retires the entry once the server has caught up', () => {
    recordCastTally(PRAXIS, { points_from_votes: 4, voter_count: 1 })
    clearCastTallies([PRAXIS])
    // A stored tally is authoritative only for the instant it was minted.
    // Keeping it would mask another player's later vote indefinitely.
    expect(castTally(PRAXIS)).toBeNull()
  })

  it('leaves other praxes alone when clearing', () => {
    recordCastTally(PRAXIS, { points_from_votes: 4, voter_count: 1 })
    recordCastTally(99, { points_from_votes: 5, voter_count: 1 })
    clearCastTallies([PRAXIS])
    expect(castTally(PRAXIS)).toBeNull()
    expect(castTally(99)).toEqual({ points_from_votes: 5, voter_count: 1 })
  })
})
