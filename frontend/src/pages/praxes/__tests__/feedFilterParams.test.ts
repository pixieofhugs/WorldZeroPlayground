/**
 * #1366 — the praxis feed's filter axes move into the URL (#1361 ruling 7).
 *
 * The seam under test is the URL ⇄ filter-state derivation: `usePraxes` itself
 * cannot be driven here (the harness is `renderToStaticMarkup` only — no jsdom,
 * effects never run), so the pure half carries the guarantees, exactly as
 * `taskFilterParam.ts` and `useSearchQueryParam.ts` already do.
 *
 * Two things this pins that a green build would not:
 *  1. junk in the URL degrades to the landing value. The backend 422s on an
 *     unknown `sort`/`era_scope`/`voted`, so forwarding `?sort=banana` would
 *     turn a hand-edited link into a broken feed.
 *  2. what counts as *narrowing*. Sort and era scope can never empty a list, so
 *     they must not stop `selectEmptyState` reaching "All caught up".
 */
import { describe, it, expect } from 'vitest'
import {
  LANDING_FILTERS,
  UNFILTERED_ERA_SCOPE,
  readFeedFilters,
  nextFeedFilterParams,
  clearedFeedParams,
  narrowingFilterCount,
  FEED_FILTER_NAV_OPTIONS,
} from '../feedFilterParams'

const params = (search: string) => new URLSearchParams(search)

describe('readFeedFilters', () => {
  it('lands on the documented defaults for a bare /praxis', () => {
    expect(readFeedFilters(params(''))).toEqual(LANDING_FILTERS)
  })

  it('defaults the era rail to this era — the feed is era-scoped (#1361 ruling 6)', () => {
    expect(LANDING_FILTERS.eraScope).toBe('this_era')
  })

  it('reads every axis back out of a shared link', () => {
    expect(
      readFeedFilters(params('?faction=ua&faction=wow&voted=no&sort=most_voted&era_scope=all_eras')),
    ).toEqual({
      factions: ['ua', 'wow'],
      voted: 'no',
      sort: 'most_voted',
      eraScope: 'all_eras',
    })
  })

  it('degrades junk to the landing value rather than 422-ing the feed', () => {
    const junk = readFeedFilters(params('?voted=maybe&sort=banana&era_scope=era_7'))
    expect(junk.voted).toBe(LANDING_FILTERS.voted)
    expect(junk.sort).toBe(LANDING_FILTERS.sort)
    expect(junk.eraScope).toBe(LANDING_FILTERS.eraScope)
  })

  it('drops empty faction values instead of asking for the faction ""', () => {
    expect(readFeedFilters(params('?faction=&faction=ua')).factions).toEqual(['ua'])
  })
})

describe('nextFeedFilterParams', () => {
  it('writes a non-landing value', () => {
    expect(nextFeedFilterParams(params(''), { sort: 'least_voted' }).get('sort')).toBe('least_voted')
  })

  it('removes a param that is back on its landing value — no ?voted= noise', () => {
    expect(nextFeedFilterParams(params('?voted=yes'), { voted: 'all' }).has('voted')).toBe(false)
  })

  it('writes the faction union as repeated params, matching what B1 accepts', () => {
    const next = nextFeedFilterParams(params('?faction=ua'), { factions: ['wow', 'na'] })
    expect(next.getAll('faction')).toEqual(['wow', 'na'])
  })

  it('carries every untouched param through, including ?q= and ?task_id=', () => {
    const next = nextFeedFilterParams(params('?q=lantern&task_id=7&voted=no'), { sort: 'oldest' })
    expect(next.get('q')).toBe('lantern')
    expect(next.get('task_id')).toBe('7')
    expect(next.get('voted')).toBe('no')
  })

  it('does not mutate the params it was handed', () => {
    const previous = params('?voted=no')
    nextFeedFilterParams(previous, { voted: 'yes' })
    expect(previous.get('voted')).toBe('no')
  })

  it('replaces rather than pushes — a rail tap is not a page in history', () => {
    expect(FEED_FILTER_NAV_OPTIONS.replace).toBe(true)
  })
})

describe('clearedFeedParams', () => {
  const cleared = clearedFeedParams(
    params('?faction=ua&voted=no&sort=oldest&q=lantern&task_id=7&keep=me'),
  )

  it('drops every filter the bar owns', () => {
    for (const key of ['faction', 'voted', 'sort', 'q']) {
      expect(cleared.has(key), key).toBe(false)
    }
  })

  it('drops the task filter too, so "clear all" can always un-empty a feed', () => {
    expect(cleared.has('task_id')).toBe(false)
  })

  it('widens the era rail rather than restoring the narrowed landing scope', () => {
    expect(cleared.get('era_scope')).toBe(UNFILTERED_ERA_SCOPE)
    expect(UNFILTERED_ERA_SCOPE).toBe('all_eras')
  })

  it('leaves params it does not own alone', () => {
    expect(cleared.get('keep')).toBe('me')
  })
})

describe('narrowingFilterCount', () => {
  const count = (
    filters: Partial<typeof LANDING_FILTERS>,
    extras: { query?: string; taskId?: number | null } = {},
  ) =>
    narrowingFilterCount(
      { ...LANDING_FILTERS, ...filters },
      { query: extras.query ?? '', taskId: extras.taskId ?? null },
    )

  it('is zero on the landing feed, so an empty register reads as empty', () => {
    expect(count({})).toBe(0)
  })

  it('counts one per selected faction', () => {
    expect(count({ factions: ['ua', 'wow'] })).toBe(2)
  })

  it('counts the vote filter, the search and the task filter', () => {
    expect(count({ voted: 'no' })).toBe(1)
    expect(count({}, { query: 'lantern' })).toBe(1)
    expect(count({}, { taskId: 7 })).toBe(1)
  })

  it('ignores sort and era — neither can be the reason a list is empty', () => {
    expect(count({ sort: 'least_voted' })).toBe(0)
    expect(count({ eraScope: 'all_eras' })).toBe(0)
  })

  it('leaves "needs my vote" alone as the sole filter, so "All caught up" is reachable', () => {
    expect(count({ voted: 'no', sort: 'oldest' })).toBe(1)
  })
})
