/**
 * The duel fetch retires the cast tallies it just told the truth about (#1239).
 *
 * The other half of the duel merge. A cast tally is authoritative only for the
 * instant it was minted, and `DuelDetailOut` is something a reader merges into —
 * so if this fetch did not clear, a stored tally would keep overwriting a fresher
 * payload and mask another player's vote for as long as the page stayed open.
 * `getPraxis` and `listPraxes` clear for the same reason (#626); the duel fetch
 * was the gap. (`getVotes` used to be a third clearer; #1382 deleted it.)
 *
 * Both sides, not just this page's: the duel payload carries a
 * `points_from_votes` for the rival too, and the rival is the side a spectator's
 * vote goes stale on.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * No network. The stub goes in via `vi.hoisted` rather than `beforeEach`
 * because `openapi-fetch` binds `globalThis.fetch` when the client is CREATED,
 * at `../client`'s top level — i.e. during this file's imports. A later stub is
 * never consulted and the suite quietly talks to whatever is listening on
 * localhost:8000 (see `client.test.ts`).
 */
const wire = vi.hoisted(() => {
  let payload = '{}'

  globalThis.fetch = (async () =>
    new Response(payload, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof globalThis.fetch

  return {
    replyWith(next: unknown) {
      payload = JSON.stringify(next)
    },
  }
})

import type { DuelDetailOut, DuelSideOut } from '../duel'
import { getDuelDetail } from '../duel'
import {
  __resetCastTallies,
  castTally,
  recordCastTally,
} from '../../utils/castTallies'

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
    nudged_at: null,
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
    winner_character_id: null,
    challenger_final_points: null,
    opponent_final_points: null,
    ...overrides,
  }
}

function respondWith(payload: DuelDetailOut): void {
  wire.replyWith(payload)
}

describe('getDuelDetail clears cast tallies (#1239)', () => {
  beforeEach(() => {
    __resetCastTallies()
  })

  it('retires a cast tally on EITHER side once the duel payload lands', async () => {
    recordCastTally(MINE_PRAXIS, { points_from_votes: 4, voter_count: 1 })
    recordCastTally(RIVAL_PRAXIS, { points_from_votes: 5, voter_count: 1 })
    respondWith(detail())

    await getDuelDetail(5)

    // Without this the merged card would keep printing both stored tallies over
    // a payload that already reflects them — and over anyone else's later vote.
    expect(castTally(MINE_PRAXIS)).toBeNull()
    expect(castTally(RIVAL_PRAXIS)).toBeNull()
  })

  it('leaves praxes this payload says nothing about alone', async () => {
    recordCastTally(UNRELATED_PRAXIS, { points_from_votes: 5, voter_count: 1 })
    respondWith(detail())

    await getDuelDetail(5)

    expect(castTally(UNRELATED_PRAXIS)).toEqual({ points_from_votes: 5, voter_count: 1 })
  })

  it('survives a side with no praxis of its own', async () => {
    // A forfeiter's thrown side is back to `in_progress` and its `praxis_id` can
    // be null; there is nothing to clear there and nothing to blow up on.
    recordCastTally(MINE_PRAXIS, { points_from_votes: 4, voter_count: 1 })
    respondWith(detail({ opponent: side(null, 4) }))

    await expect(getDuelDetail(5)).resolves.toBeTruthy()
    expect(castTally(MINE_PRAXIS)).toBeNull()
  })
})
