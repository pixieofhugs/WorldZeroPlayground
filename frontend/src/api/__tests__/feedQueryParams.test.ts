/**
 * #1421 / #1400 — the type facet's wire shape, at the transport seam.
 *
 * `GET /activity-feed` takes `types: Optional[list[str]] = Query(None)`, which
 * FastAPI fills from REPEATED bare keys (`types=nudge&types=global_task`). Send
 * `types[]=nudge` instead — axios' default, and the reason this module used to
 * carry a `paramsSerializer` — and FastAPI reads NOTHING from that key: the
 * request still answers 200, with a completely unfiltered list. Nothing else in
 * the app fails: the types line up, tsc passes, the suite passes, and the page
 * shows every update with type chips sitting on top of it. This file is the only
 * thing standing between that and prod.
 *
 * It asserts the URL of the real `Request` `getActivityFeed` hands to `fetch`,
 * not a serializer's output, because after #1400 there is no serializer to
 * inspect — the guarantee now belongs to `client.ts` and is only observable at
 * the wire. `client.test.ts` proves the same rule for `/tasks`; these are the
 * FEED's params, a different route with a different query object, so the two do
 * not cover each other.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { getActivityFeed } from '../activityFeed'

/**
 * The stub goes in via `vi.hoisted`, not `beforeEach`, because `openapi-fetch`
 * binds `globalThis.fetch` when the client is CREATED — at `../client`'s top
 * level, i.e. during this file's imports. A later `vi.stubGlobal('fetch', …)` is
 * simply not consulted, and the failure is not a failure: the suite issues REAL
 * requests to whatever is listening on localhost:8000 and asserts against its
 * answers.
 */
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

/** The URL of the single request the last call made. */
const sentUrl = () => new URL(sent[0].url)

describe('the query string getActivityFeed puts on the wire', () => {
  it('writes a type selection as repeated BARE keys, never types[]', async () => {
    await getActivityFeed({ types: ['nudge', 'global_task'] })

    expect(sentUrl().pathname).toBe('/activity-feed')
    expect(sentUrl().search).toBe('?types=nudge&types=global_task')
    expect(sentUrl().searchParams.getAll('types')).toEqual(['nudge', 'global_task'])
    // The exact shape FastAPI ignores, in both its raw and encoded spellings.
    expect(sent[0].url).not.toContain('types%5B%5D')
    expect(sent[0].url).not.toContain('types[]')
  })

  it('writes a selection of one as a plain single param', async () => {
    await getActivityFeed({ types: ['nudge'] })

    expect(sentUrl().search).toBe('?types=nudge')
  })

  it('sends no `types` at all for an empty selection', async () => {
    // An empty multi-select means "no type constraint", so it must not reach the
    // wire as `types=` — the backend treats an empty list the same way, but a
    // blank param is a lie about what was asked for, and `?types=` is a slug
    // that matches nothing rather than a filter that is off.
    await getActivityFeed({ types: [], filter: 'friends' })

    expect(sentUrl().search).toBe('?filter=friends')
    expect(sentUrl().searchParams.has('types')).toBe(false)
  })

  it('leaves the scalar axes exactly as they were', async () => {
    // Per key, not as one pinned string: the order is whatever the CALLER's
    // object literal had, which is not a promise anyone should be able to break
    // this test by keeping.
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
