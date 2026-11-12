/**
 * The duel fetch clears cast tallies on BOTH sides (#1239), like `getPraxis`
 * and `listPraxes` (#626): a merged-in stale tally masks later votes.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

/** Hoisted fetch stub: see `client.test.ts`. */
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
    win_multiplier: 1,
    loss_multiplier: 1,
    tie_multiplier: 1,
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
    // A forfeiter's side can have a null `praxis_id`.
    recordCastTally(MINE_PRAXIS, { points_from_votes: 4, voter_count: 1 })
    respondWith(detail({ opponent: side(null, 4) }))

    await expect(getDuelDetail(5)).resolves.toBeTruthy()
    expect(castTally(MINE_PRAXIS)).toBeNull()
  })
})
