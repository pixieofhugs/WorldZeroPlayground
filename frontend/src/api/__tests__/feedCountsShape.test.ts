/**
 * The Updates page went white once updates arrived: an older backend omits
 * `by_type` (#1420), `useUpdates` replaces its seeded counts wholesale, and
 * `Object.keys(undefined)` throws in render. Normalised at the boundary; a
 * wrong zero beats a lost page.
 */
import { describe, it, expect } from 'vitest'
import { normalizeFeedCounts } from '../activityFeed'

describe('normalizeFeedCounts', () => {
  it('fills by_type when the server omits it, instead of letting Object.keys throw', () => {
    const fromOlderBackend = {
      all: 4,
      friends: 1,
      foes: 0,
      your_stuff: 2,
      global_count: 1,
      requests: 3,
    }

    const counts = normalizeFeedCounts(fromOlderBackend)

    expect(counts.by_type).toEqual({})
    expect(() => Object.keys(counts.by_type)).not.toThrow()
  })

  it('keeps every number the server did send', () => {
    const counts = normalizeFeedCounts({
      all: 4,
      friends: 1,
      foes: 0,
      your_stuff: 2,
      global_count: 1,
      requests: 3,
      by_type: { nudge: 2, global_task: 2 },
    })

    expect(counts).toEqual({
      all: 4,
      friends: 1,
      foes: 0,
      your_stuff: 2,
      global_count: 1,
      requests: 3,
      by_type: { nudge: 2, global_task: 2 },
    })
  })

  it('survives a counts object that is missing entirely', () => {
    const counts = normalizeFeedCounts(undefined)

    expect(counts.by_type).toEqual({})
    expect(counts.all).toBe(0)
    expect(counts.requests).toBe(0)
  })

  it('does not invent counts for a type the server said nothing about', () => {
    // Zero rows the facet hides must come from the SERVER (decision 20).
    const counts = normalizeFeedCounts({ all: 1, by_type: { nudge: 0 } })

    expect(counts.by_type).toEqual({ nudge: 0 })
  })
})
