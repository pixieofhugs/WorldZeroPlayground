/**
 * A read that was already out when a cast was answered must not wipe that
 * cast's tally (#3093).
 *
 * The seam is the three reads that clear cast tallies — `getPraxis`,
 * `listPraxes`, `getDuelDetail` — with the response held open, because the
 * defect is an ORDERING: read requested, cast answered, read resolves. Since
 * #3093 the first star is POSTed at once, so on a page still loading the POST
 * routinely beats the GET home. That GET's snapshot may predate the vote, and
 * clearing on it left the star and the voter row showing a vote the score and
 * count did not, until a reload.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

/** Stubbed in `vi.hoisted` for the reason `duelCastTallies.test.ts` gives. */
const wire = vi.hoisted(() => {
  let payload = '{}'
  let gate: Promise<void> = Promise.resolve()

  globalThis.fetch = (async () => {
    await gate
    return new Response(payload, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as unknown as typeof globalThis.fetch

  return {
    replyWith(next: unknown) {
      payload = JSON.stringify(next)
    },
    /** Hold every response until the returned function is called. */
    hold(): () => void {
      let release = () => {}
      gate = new Promise((resolve) => (release = resolve))
      return release
    },
  }
})

import { getDuelDetail } from '../duel'
import { getPraxis, listPraxes } from '../praxis'
import { __resetCastTallies, castTally, recordCastTally } from '../../utils/castTallies'

const PRAXIS = 42
const FRESH = { points_from_votes: 17, voter_count: 4 }

const READS: Array<[string, unknown, () => Promise<unknown>]> = [
  ['getPraxis', { id: PRAXIS }, () => getPraxis(PRAXIS)],
  ['listPraxes', [{ id: PRAXIS }], () => listPraxes()],
  [
    'getDuelDetail',
    { challenger: { praxis_id: PRAXIS }, opponent: { praxis_id: null } },
    () => getDuelDetail(5),
  ],
]

describe.each(READS)('%s and a cast answered around it (#3093)', (_name, payload, read) => {
  beforeEach(() => {
    __resetCastTallies()
    wire.replyWith(payload)
  })

  it('keeps the tally of a cast answered while the read was out', async () => {
    const release = wire.hold()
    const reading = read()
    // The cast is sent and answered while the read is still in the air.
    recordCastTally(PRAXIS, FRESH)
    release()
    await reading

    expect(castTally(PRAXIS)).toEqual(FRESH)
  })

  it('still retires the tally of a cast answered before the read was asked for', async () => {
    recordCastTally(PRAXIS, FRESH)
    const release = wire.hold()
    const reading = read()
    release()
    await reading

    expect(castTally(PRAXIS)).toBeNull()
  })
})
