/**
 * The one-slot handoff from `createPraxis` to its composer (#1379). The risk
 * is a carried payload outliving its navigation and showing as fresh. Request
 * counts are pinned by `composerWaterfall.test.ts` instead (no effects here).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

/** Hoisted fetch stub: see `client.test.ts`. */
const wire = vi.hoisted(() => {
  let payload = '{}'

  globalThis.fetch = (async () =>
    new Response(payload, {
      status: 201,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof globalThis.fetch

  return {
    replyWith(next: unknown) {
      payload = JSON.stringify(next)
    },
  }
})

import { createPraxis, takeJustCreatedPraxis, type PraxisOut } from '../praxis'

function praxisRow(id: number): PraxisOut {
  return { id, title: `praxis ${id}` } as unknown as PraxisOut
}

beforeEach(() => {
  takeJustCreatedPraxis(-1)
})

describe('takeJustCreatedPraxis', () => {
  it('hands the composer the row the signup just created', async () => {
    wire.replyWith(praxisRow(7))
    const created = await createPraxis({ task_id: 1, type: 'solo' })

    expect(takeJustCreatedPraxis(7)).toBe(created)
  })

  it('is empty when nothing was created — the composer falls back to the read', () => {
    expect(takeJustCreatedPraxis(7)).toBeNull()
  })

  it('gives the row away once and only once', async () => {
    wire.replyWith(praxisRow(7))
    await createPraxis({ task_id: 1, type: 'solo' })

    expect(takeJustCreatedPraxis(7)).not.toBeNull()
    // A remount or return must re-read the server.
    expect(takeJustCreatedPraxis(7)).toBeNull()
  })

  it('refuses to hand one praxis row to a different praxis', async () => {
    wire.replyWith(praxisRow(7))
    await createPraxis({ task_id: 1, type: 'solo' })

    expect(takeJustCreatedPraxis(8)).toBeNull()
  })

  it('clears the slot on a miss, so a later id can never collect a stale row', async () => {
    wire.replyWith(praxisRow(7))
    await createPraxis({ task_id: 1, type: 'solo' })

    takeJustCreatedPraxis(8)
    expect(takeJustCreatedPraxis(7)).toBeNull()
  })

  it('keeps only the latest create — two signups in a row cannot cross', async () => {
    wire.replyWith(praxisRow(7))
    await createPraxis({ task_id: 1, type: 'solo' })
    wire.replyWith(praxisRow(9))
    await createPraxis({ task_id: 2, type: 'solo' })

    expect(takeJustCreatedPraxis(7)).toBeNull()
  })
})
