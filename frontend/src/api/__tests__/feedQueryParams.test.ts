/**
 * #1421 — the type facet's wire shape.
 *
 * `GET /activity-feed` takes `types: Optional[list[str]] = Query(None)`, which
 * FastAPI fills from REPEATED bare keys (`types=nudge&types=global_task`).
 * Axios' default serializer writes `types[]=nudge&types[]=global_task`, and
 * FastAPI reads NOTHING from that key — the request still answers 200, with a
 * completely unfiltered list. Nothing else in the app fails: the types line up,
 * tsc passes, the suite passes, and the page shows every update with type chips
 * on top of it. This file is the only thing standing between that and prod.
 */
import { describe, it, expect } from 'vitest'
import axios from 'axios'
import { FEED_PARAMS_SERIALIZER } from '../activityFeed'

const uri = (params: Record<string, unknown>) =>
  axios.getUri({
    url: '/activity-feed',
    params,
    paramsSerializer: FEED_PARAMS_SERIALIZER,
  })

describe('FEED_PARAMS_SERIALIZER', () => {
  it('writes a type selection as repeated BARE keys, never types[]', () => {
    expect(uri({ types: ['nudge', 'global_task'] })).toBe(
      '/activity-feed?types=nudge&types=global_task',
    )
  })

  it('writes a selection of one as a plain single param', () => {
    expect(uri({ types: ['nudge'] })).toBe('/activity-feed?types=nudge')
  })

  it('sends no `types` at all for an empty selection', () => {
    // An empty multi-select means "no type constraint", so it must not reach the
    // wire as `types=` — the backend treats an empty list the same way, but a
    // blank param is a lie about what was asked for.
    expect(uri({ types: [], filter: 'friends' })).toBe('/activity-feed?filter=friends')
  })

  it('leaves the scalar axes exactly as they were before the serializer', () => {
    expect(uri({ filter: 'all', archived: true, limit: 20 })).toBe(
      '/activity-feed?filter=all&archived=true&limit=20',
    )
  })
})
