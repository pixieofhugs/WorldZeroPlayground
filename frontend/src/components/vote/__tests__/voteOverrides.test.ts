import { beforeEach, describe, expect, it } from 'vitest'
import {
  __resetVoteOverrides,
  clearVoteOverrides,
  recordVote,
  seedViewerVote,
  tallyDelta,
  viewerVote,
} from '../voteOverrides'

const PRAXIS = 42

describe('voteOverrides', () => {
  beforeEach(() => {
    __resetVoteOverrides()
  })

  it('reports no delta for a praxis nobody voted on', () => {
    expect(tallyDelta(PRAXIS)).toBeNull()
    expect(viewerVote(PRAXIS)).toBeNull()
  })

  it('counts a first cast as +stars and +1 voter', () => {
    recordVote(PRAXIS, 4, null)
    expect(tallyDelta(PRAXIS)).toEqual({ score: 4, voters: 1 })
    expect(viewerVote(PRAXIS)).toBe(4)
  })

  it('counts a re-vote as the difference, with no new voter', () => {
    recordVote(PRAXIS, 5, 3)
    expect(tallyDelta(PRAXIS)).toEqual({ score: 2, voters: 0 })
  })

  it('measures a second cast from server truth, not from my own last cast', () => {
    // Vote 4, then change my mind to 2 before any refetch lands. The tally must
    // move by 2 total (0 -> 2), not 4 then -2 compounding off my own guess.
    recordVote(PRAXIS, 4, null)
    recordVote(PRAXIS, 2, null)
    expect(tallyDelta(PRAXIS)).toEqual({ score: 2, voters: 1 })
  })

  it('retires the override once the server has caught up', () => {
    recordVote(PRAXIS, 4, null)
    clearVoteOverrides([PRAXIS])
    // Without this the refetched score — which already includes the vote —
    // would get the delta added on top of it a second time.
    expect(tallyDelta(PRAXIS)).toBeNull()
  })

  it('leaves other praxes alone when clearing', () => {
    recordVote(PRAXIS, 4, null)
    recordVote(99, 5, null)
    clearVoteOverrides([PRAXIS])
    expect(tallyDelta(PRAXIS)).toBeNull()
    expect(tallyDelta(99)).toEqual({ score: 5, voters: 1 })
  })

  it('seeds the viewer vote without moving the tally', () => {
    seedViewerVote(PRAXIS, 3)
    expect(viewerVote(PRAXIS)).toBe(3)
    expect(tallyDelta(PRAXIS)).toBeNull()
  })

  it('treats a cast after a seed as a re-vote off the seeded value', () => {
    // The praxis-detail path: no viewer_vote prop, prior comes from the seed.
    seedViewerVote(PRAXIS, 3)
    recordVote(PRAXIS, 5, null)
    expect(tallyDelta(PRAXIS)).toEqual({ score: 2, voters: 0 })
  })

  it('does not let a later seed clobber a cast', () => {
    recordVote(PRAXIS, 5, null)
    seedViewerVote(PRAXIS, 5)
    expect(tallyDelta(PRAXIS)).toEqual({ score: 5, voters: 1 })
  })
})
