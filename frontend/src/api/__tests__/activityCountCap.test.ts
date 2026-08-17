/**
 * `ACTIVITY_COUNT_CAP` is the server's `SUB_QUERY_LIMIT`, across a language
 * boundary (#1587).
 *
 * THE SEAM
 * --------
 * The constant itself. The number decides whether the mobile pending row says
 * "37 notifications" or "50+ notifications", and it is only honest because it
 * equals the row cap every feed source stops at: a total below it cannot have
 * come from a truncated source, so it is exact; a total at or above it may be
 * short. Move the Python constant and leave this one, and the pill starts
 * printing an exact-looking number over a truncated fetch — a lie no typecheck
 * or vitest run would notice, because both halves compile fine apart.
 *
 * A comment saying "keep these in sync" is the version of this that rots. This
 * reads the Python source, which is the only thing that cannot.
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
