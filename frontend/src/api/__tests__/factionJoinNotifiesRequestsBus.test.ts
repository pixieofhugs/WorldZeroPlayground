/**
 * #2288 — joining a faction answers obligations, so `chooseFaction` (all four
 * join surfaces route through it) must ring the requests bus. The target
 * faction's letter stops being a request (ADR-0070) and the left faction's is
 * deleted (#2218). The sidebar's other refetch trigger keys on character id,
 * which a join doesn't move. Same defect as `archiveNotifiesRequestsBus.test.ts`.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { chooseFaction } from '../factions'
import { onRequestsChanged } from '../../utils/requestsBus'

/** Hoisted fetch stub: see `client.test.ts`. */
vi.hoisted(() => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ id: 1, character: { id: 7, faction_slug: 'ua' } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof globalThis.fetch
})

let fired = 0
let unsubscribe: () => void

beforeEach(() => {
  unsubscribe?.()
  fired = 0
  unsubscribe = onRequestsChanged(() => {
    fired += 1
  })
})

describe('joining a faction', () => {
  it('fires the requests bus, so the bell re-reads the count the join just moved', async () => {
    await chooseFaction('ua')

    expect(fired).toBe(1)
  })

  it('fires once per join, from the API module rather than per call site', async () => {
    await chooseFaction('ua')
    await chooseFaction('coven')

    expect(fired).toBe(2)
  })
})
