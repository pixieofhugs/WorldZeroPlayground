/**
 * The duel fetch retires the overrides it just told the truth about (#1239).
 *
 * The other half of the duel merge. An override lives only until the server
 * catches up, and `DuelDetailOut` is now something a reader merges into — so if
 * this fetch did not clear, a pending cast would be added on top of a payload
 * that already contained it, and would keep masking another player's vote for as
 * long as the page stayed open. `getPraxis` and `getVotes` have cleared for the
 * same reason since #626; the duel fetch is the third and was the gap.
 *
 * Both sides, not just this page's: the duel payload carries a
 * `points_from_votes` for the rival too, and the rival is the side a spectator's
 * vote goes stale on.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

// No network — the assertion is about what the client does with the response.
vi.mock('../axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }))

import api from '../axios'
import type { DuelDetailOut, DuelSideOut } from '../duel'
import { getDuelDetail } from '../duel'
import {
  __resetVoteOverrides,
  recordVote,
  tallyDelta,
} from '../../components/vote/voteOverrides'

const MINE_PRAXIS = 7
const RIVAL_PRAXIS = 8
const UNRELATED_PRAXIS = 99

function side(praxisId: number | null, characterId: number): DuelSideOut {
  return {
    praxis_id: praxisId,
    character_id: characterId,
    display_name: 'Someone',
    faction_slug: 'coven',
    avatar_url: '',
    points_from_votes: 4,
    is_submitted: true,
  }
}

function detail(overrides: Partial<DuelDetailOut> = {}): DuelDetailOut {
  return {
    id: 5,
    task_id: 2,
    status: 'settled',
    forfeited_by_character_id: null,
    challenger: side(MINE_PRAXIS, 3),
    opponent: side(RIVAL_PRAXIS, 4),
    viewer_is_participant: false,
    winner_character_id: null,
    challenger_final_points: null,
    opponent_final_points: null,
    ...overrides,
  }
}

function respondWith(payload: DuelDetailOut): void {
  vi.mocked(api.get).mockResolvedValue({ data: payload })
}

describe('getDuelDetail clears vote overrides (#1239)', () => {
  beforeEach(() => {
    __resetVoteOverrides()
    vi.mocked(api.get).mockReset()
  })

  it('retires an override on EITHER side once the duel payload lands', async () => {
    recordVote(MINE_PRAXIS, 4, null)
    recordVote(RIVAL_PRAXIS, 5, null)
    respondWith(detail())

    await getDuelDetail(5)

    // Without this the merged card would count both casts a second time on top
    // of totals that already include them.
    expect(tallyDelta(MINE_PRAXIS)).toBeNull()
    expect(tallyDelta(RIVAL_PRAXIS)).toBeNull()
  })

  it('leaves praxes this payload says nothing about alone', async () => {
    recordVote(UNRELATED_PRAXIS, 5, null)
    respondWith(detail())

    await getDuelDetail(5)

    expect(tallyDelta(UNRELATED_PRAXIS)).toEqual({ score: 5, voters: 1 })
  })

  it('survives a side with no praxis of its own', async () => {
    // A forfeiter's thrown side is back to `in_progress` and its `praxis_id` can
    // be null; there is nothing to clear there and nothing to blow up on.
    recordVote(MINE_PRAXIS, 4, null)
    respondWith(detail({ opponent: side(null, 4) }))

    await expect(getDuelDetail(5)).resolves.toBeTruthy()
    expect(tallyDelta(MINE_PRAXIS)).toBeNull()
  })
})
