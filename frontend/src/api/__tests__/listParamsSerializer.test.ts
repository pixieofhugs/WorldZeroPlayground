/**
 * #1366 — the faction union's wire shape.
 *
 * `GET /praxes` takes `faction: Optional[List[str]] = Query(None)`, which FastAPI
 * reads from REPEATED params (`faction=ua&faction=wow`). Axios' default
 * serializer writes `faction[]=ua&faction[]=wow` instead, and FastAPI reads
 * nothing at all from that — the filter would vanish between the click and the
 * query with no error anywhere. Nothing else in the app catches this: the types
 * line up, the request succeeds, and the feed just ignores the filter.
 */
import { describe, it, expect } from 'vitest'
import axios from 'axios'
import { LIST_PARAMS_SERIALIZER } from '../praxis'

const uri = (params: Record<string, unknown>) =>
  axios.getUri({ url: '/praxes', params, paramsSerializer: LIST_PARAMS_SERIALIZER })

describe('LIST_PARAMS_SERIALIZER', () => {
  it('writes a faction union as repeated params, not faction[]', () => {
    expect(uri({ faction: ['ua', 'wow'] })).toBe('/praxes?faction=ua&faction=wow')
  })

  it('writes a union of one exactly as the old single-slug callers did', () => {
    expect(uri({ faction: ['ua'] })).toBe('/praxes?faction=ua')
  })

  it('omits an absent filter rather than sending an empty one', () => {
    expect(uri({ faction: undefined, sort: 'newest' })).toBe('/praxes?sort=newest')
  })
})
