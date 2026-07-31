/**
 * The Updates page went blank the moment its updates arrived.
 *
 * `FeedCounts.by_type` (#1420) is typed as required, and `typeFacetOptions`
 * spreads `Object.keys(byType)` to build the facet's row list. `Object.keys`
 * throws on `undefined` — so a response without the field takes React's render
 * down and unmounts the tree, which is a WHITE PAGE rather than a broken
 * widget.
 *
 * The timing is the tell, and it is why this was reported as "fine while
 * loading, blank once loaded": `useUpdates` seeds its state with `EMPTY_COUNTS`
 * (which has `by_type: {}`), then does `setCounts(response.counts)` — replacing
 * the whole object with whatever the wire sent. The safe default only ever
 * covers the loading frame.
 *
 * A frontend built after #1420 talking to a backend from before it is the
 * ordinary way this happens — a `uvicorn` that was not restarted is enough.
 * That is not an exotic state and it must degrade, not detonate: a stale count
 * is a wrong number, and a wrong number is worth vastly less than a lost page.
 *
 * So the wire shape is normalised once, at the boundary, and `FeedCounts` stops
 * being a promise the server has not actually made.
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
    // The actual crash, pinned: this is what `typeFacetOptions` does first.
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
    // Defended because the alternative is the same white page. A badge reading
    // zero is a wrong number; a blank page is no page.
    const counts = normalizeFeedCounts(undefined)

    expect(counts.by_type).toEqual({})
    expect(counts.all).toBe(0)
    expect(counts.requests).toBe(0)
  })

  it('does not invent counts for a type the server said nothing about', () => {
    // The zero rows the facet hides must come from the SERVER (decision 20 —
    // "this view has no nudges" is a different claim from "this view cannot
    // have any"). Normalising must not manufacture that distinction.
    const counts = normalizeFeedCounts({ all: 1, by_type: { nudge: 0 } })

    expect(counts.by_type).toEqual({ nudge: 0 })
  })
})
