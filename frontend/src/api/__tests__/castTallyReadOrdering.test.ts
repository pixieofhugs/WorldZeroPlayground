/**
 * #3093 — ordering bug: read requested, cast answered, read resolves. The
 * read's snapshot may predate the vote, so it must not clear that cast's tally.
 * The first star POSTs at once, so this is routine on a loading page.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

/** Hoisted fetch stub: see `client.test.ts`. */
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
