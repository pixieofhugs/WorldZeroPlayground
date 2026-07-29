/**
 * The Archived tab's wiring (#1194) — the pure parts of `useUpdates`.
 *
 * The hook itself self-fetches, and this harness has no DOM, so what is pinned
 * here is the tab vocabulary: the seventh entry, the two maps that must not be
 * confused, and the deliberate absence of a badge.
 */
import { describe, it, expect } from 'vitest'
import {
  ALL_FILTERS,
  ARCHIVED_FILTER,
  FILTER_API_MAP,
  FILTER_URL_MAP,
  ROW_1_FILTERS,
  ROW_2_FILTERS,
  getCount,
} from '../useUpdates'
import type { FeedCounts } from '../../../api/activityFeed'

const COUNTS: FeedCounts = {
  all: 9,
  friends: 4,
  foes: 2,
  your_stuff: 1,
  global_count: 1,
  requests: 1,
}

describe('Archived is the seventh tab', () => {
  it('sits alongside the existing six, not instead of any', () => {
    expect(ALL_FILTERS).toEqual([
      'All',
      'Friends',
      'Foes',
      'Your Stuff',
      'Global',
      'Requests',
      'Archived',
    ])
    expect(ROW_1_FILTERS).toHaveLength(4)
    expect(ROW_2_FILTERS).toContain('Archived')
  })

  it('every tab has both an API filter and a deep-link token', () => {
    for (const filter of ALL_FILTERS) {
      expect(FILTER_API_MAP[filter], filter).toBeTruthy()
      expect(FILTER_URL_MAP[filter], filter).toBeTruthy()
    }
  })

  it('sends the `all` type-set, because archived-ness is state not a type-set', () => {
    // `archived=true` is crossed WITH a filter and is never a member of one. The
    // archive ignores the friend/foe/global slicing entirely, so the filter it
    // crosses with is `all`.
    expect(FILTER_API_MAP[ARCHIVED_FILTER]).toBe('all')
  })

  it('keeps a deep-link token of its OWN, distinct from every other', () => {
    // The reason FILTER_URL_MAP exists: Archived and All send the same API
    // filter, so resolving `?filter=` through FILTER_API_MAP would have made
    // `?filter=archived` unreachable and `?filter=all` ambiguous.
    expect(FILTER_URL_MAP[ARCHIVED_FILTER]).toBe('archived')
    const tokens = ALL_FILTERS.map((filter) => FILTER_URL_MAP[filter])
    expect(new Set(tokens).size, 'every token unique').toBe(tokens.length)
  })

  it('leaves the six existing deep links exactly as they were', () => {
    // Links already in the wild (Sidebar → Requests) must keep working.
    expect(FILTER_URL_MAP['Requests']).toBe('requests')
    expect(FILTER_URL_MAP['Your Stuff']).toBe('your_stuff')
    expect(FILTER_URL_MAP['Global']).toBe('global')
    expect(FILTER_URL_MAP['All']).toBe('all')
  })

  it('draws no badge — FeedCounts has no archived count, by design', () => {
    // Counts describe the LIVE feed and stay truthful while the archive is on
    // screen (#1193). `0` means "no badge", not "the archive is empty".
    expect(getCount('Archived', COUNTS)).toBe(0)
    // …and the other six still read their own count.
    expect(getCount('All', COUNTS)).toBe(9)
    expect(getCount('Requests', COUNTS)).toBe(1)
  })
})
