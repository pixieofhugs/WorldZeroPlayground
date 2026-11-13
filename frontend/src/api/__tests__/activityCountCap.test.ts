/**
 * `ACTIVITY_COUNT_CAP` must equal the server's `SUB_QUERY_LIMIT` (#1587): a
 * total below it is exact, at or above it may be truncated ("50+"). Read from
 * the Python source so drift fails here.
 */
import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { ACTIVITY_COUNT_CAP } from '../sidebar'

const SERVICE = new URL(
  '../../../../backend/services/activity_feed.py',
  import.meta.url,
)

describe('ACTIVITY_COUNT_CAP', () => {
  it('is the SUB_QUERY_LIMIT the server actually windows each source at', () => {
    const source = readFileSync(SERVICE, 'utf8')
    const match = source.match(/^SUB_QUERY_LIMIT = (\d+)$/m)

    expect(match, 'SUB_QUERY_LIMIT vanished or was renamed in activity_feed.py').not.toBeNull()
    expect(Number(match![1])).toBe(ACTIVITY_COUNT_CAP)
  })
})
