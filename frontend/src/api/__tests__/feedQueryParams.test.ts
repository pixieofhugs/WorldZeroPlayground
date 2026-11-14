/**
 * #1421 — the feed's `types` must be repeated bare keys; `types[]=` makes
 * FastAPI read nothing and 200 an unfiltered list, with tsc and the UI none
 * the wiser. Asserted on the real `Request` URL; `client.test.ts` covers
 * `/tasks`, a different query object.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { getActivityFeed } from '../activityFeed'

/** Hoisted fetch stub: see `client.test.ts`. */
const wire = vi.hoisted(() => {
  const EMPTY_FEED = JSON.stringify({
    items: [],
    counts: { all: 0, friends: 0, foes: 0, your_stuff: 0, global_count: 0, requests: 0, by_type: {} },
    next_cursor: null,
  })

  const sent: Request[] = []

  globalThis.fetch = (async (input: Request) => {
    sent.push(input)
    return new Response(EMPTY_FEED, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as unknown as typeof globalThis.fetch

  return { sent }
})

const sent = wire.sent

beforeEach(() => {
  sent.length = 0
})

const sentUrl = () => new URL(sent[0].url)

describe('the query string getActivityFeed puts on the wire', () => {
  it('leaves the scalar axes exactly as they were', async () => {
    // Per key: param order is the caller's object order, not a contract.
    await getActivityFeed({ filter: 'all', archived: true, limit: 20 })

    const query = sentUrl().searchParams
    expect(query.get('filter')).toBe('all')
    expect(query.get('archived')).toBe('true')
    expect(query.get('limit')).toBe('20')
    expect([...query.keys()]).toHaveLength(3)
  })

  it('sends no query string at all when asked for the default feed', async () => {
    await getActivityFeed()

    expect(sentUrl().search).toBe('')
  })
})
