/**
 * The seam: how `listTasks` SERIALISES its query string (#1367 / #1364).
 *
 * `GET /tasks` takes `faction: list[str] = Query(None)` — a repeated
 * `?faction=a&faction=b`. Axios's default array rendering is `faction[]=a`,
 * which FastAPI does not read at all: the request would 200 with an unfiltered
 * list while the bar showed faction chips. Nothing type-checks that gap and no
 * component test can see it, so it is pinned here, at the client.
 */
import { describe, it, expect } from 'vitest'
import api from '../axios'
import { REPEATED_QUERY_PARAMS } from '../tasks'

function uri(params: Record<string, unknown>): string {
  return api.getUri({
    url: '/tasks',
    params,
    paramsSerializer: REPEATED_QUERY_PARAMS,
  })
}

describe('listTasks query serialisation', () => {
  it('repeats the bare `faction` key for a multi-select union', () => {
    const out = uri({ faction: ['everymen', 'coven'] })
    expect(out).toContain('faction=everymen')
    expect(out).toContain('faction=coven')
  })

  it('never emits the bracketed array form FastAPI ignores', () => {
    expect(uri({ faction: ['everymen', 'coven'] })).not.toContain('faction%5B%5D')
    expect(uri({ faction: ['everymen', 'coven'] })).not.toContain('faction[]')
  })

  it('leaves single-valued axes alone', () => {
    const out = uri({ faction: ['ua'], status: 'active', sort: 'level' })
    expect(out).toContain('status=active')
    expect(out).toContain('sort=level')
    expect(out).toContain('faction=ua')
  })
})
