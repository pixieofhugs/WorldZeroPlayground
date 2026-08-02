/**
 * The seam: the task browse's URL param contract (#1367, epic #1361 ruling 7).
 *
 * Every filter axis rides in the address bar, so the whole filter set survives
 * a paste or a refresh. The parts worth pinning are the ones that are pure
 * functions of a param set — the repo's harness has no DOM, so the hook itself
 * is not renderable here, and these are deliberately the hook's whole decision.
 *
 * Four decisions:
 *   1. an enumerated axis is WHITELISTED — a value the page cannot serve reads
 *      as the default rather than riding out to a route that 422s on it (#1537)
 *   2. non-default values only — a clean browse has a clean address
 *   3. faction is REPEATED (`?faction=a&faction=b`), the union B2 (#1364) reads
 *   4. "clear all" clears search too, and touches nothing it does not own
 */
import { describe, it, expect } from 'vitest'
import {
  CAN_SIGN_UP_ON,
  TASK_FILTER_PARAMS,
  TASK_SORT_DEFAULT,
  TASK_TYPE_DEFAULT,
  clearedFilterParams,
  nextFactionParams,
  nextFilterParams,
  readTaskFilters,
} from '../useTasks'

const params = (query: string) => new URLSearchParams(query)

describe('readTaskFilters — a missing param IS the default', () => {
  it('reads a bare URL as the whole default filter set', () => {
    expect(readTaskFilters(params(''))).toEqual({
      taskType: 'standard',
      sort: 'level',
      status: 'All',
      factions: [],
      canSignUp: false,
    })
  })

  it('falls back when an axis is present but blank', () => {
    const filters = readTaskFilters(params('sort=&type=&status='))
    expect(filters.sort).toBe('level')
    expect(filters.taskType).toBe('standard')
    expect(filters.status).toBe('All')
  })

  it('hydrates a pasted link', () => {
    const filters = readTaskFilters(
      params(
        `type=metatask&sort=oldest&status=retired&faction=ua&faction=coven&can_sign_up=${CAN_SIGN_UP_ON}`,
      ),
    )
    expect(filters).toEqual({
      taskType: 'metatask',
      sort: 'oldest',
      status: 'retired',
      factions: ['ua', 'coven'],
      canSignUp: true,
    })
  })
})

describe('readTaskFilters — an unrecognised value CLAMPS (#1537)', () => {
  it('clamps a sort the list route would 422 on', () => {
    // `GET /tasks` rejects an unknown sort outright (#1443). A stale bookmark is
    // not an API caller, so it gets the default browse, not the error state.
    expect(readTaskFilters(params('sort=bogus')).sort).toBe('level')
    expect(readTaskFilters(params('sort=most_voted')).sort).toBe('level')
  })

  it('clamps an unknown browse mode', () => {
    expect(readTaskFilters(params('type=metatasks')).taskType).toBe('standard')
  })

  it('clamps an unknown status', () => {
    expect(readTaskFilters(params('status=archived')).status).toBe('All')
  })

  it('clamps one axis without disturbing its neighbours', () => {
    const filters = readTaskFilters(params('sort=bogus&status=retired&faction=ua'))
    expect(filters.sort).toBe('level')
    expect(filters.status).toBe('retired')
    expect(filters.factions).toEqual(['ua'])
  })

  it('leaves unknown faction slugs alone — /factions is fetched separately', () => {
    expect(readTaskFilters(params('faction=not-a-faction')).factions).toEqual([
      'not-a-faction',
    ])
  })

  it('drops a blank faction, which would filter to no faction at all', () => {
    expect(readTaskFilters(params('faction=&faction=ua')).factions).toEqual(['ua'])
  })

  it('reads any eligibility value but the flag as OFF', () => {
    expect(readTaskFilters(params('can_sign_up=yes')).canSignUp).toBe(false)
    expect(readTaskFilters(params(`can_sign_up=${CAN_SIGN_UP_ON}`)).canSignUp).toBe(true)
  })
})

describe('nextFilterParams — non-default values only', () => {
  it('writes a non-default axis', () => {
    const next = nextFilterParams(
      params(''),
      TASK_FILTER_PARAMS.sort,
      'newest',
      TASK_SORT_DEFAULT,
    )
    expect(next.toString()).toBe('sort=newest')
  })

  it('REMOVES the axis when it returns to its default', () => {
    const next = nextFilterParams(
      params('sort=newest'),
      TASK_FILTER_PARAMS.sort,
      TASK_SORT_DEFAULT,
      TASK_SORT_DEFAULT,
    )
    expect(next.has('sort')).toBe(false)
  })

  it('carries every other param through untouched', () => {
    const next = nextFilterParams(
      params('q=moss&faction=coven'),
      TASK_FILTER_PARAMS.taskType,
      'metatask',
      TASK_TYPE_DEFAULT,
    )
    expect(next.get('q')).toBe('moss')
    expect(next.get('faction')).toBe('coven')
    expect(next.get('type')).toBe('metatask')
  })

  it('never mutates the param set it was handed', () => {
    const previous = params('sort=newest')
    nextFilterParams(previous, TASK_FILTER_PARAMS.sort, 'oldest', TASK_SORT_DEFAULT)
    expect(previous.get('sort')).toBe('newest')
  })
})

describe('nextFactionParams — the repeated union (#1364)', () => {
  it('repeats the key once per selected slug', () => {
    expect(nextFactionParams(params(''), ['everymen', 'coven']).toString()).toBe(
      'faction=everymen&faction=coven',
    )
  })

  it('replaces the previous selection rather than appending to it', () => {
    const next = nextFactionParams(params('faction=ua&faction=wow'), ['coven'])
    expect(next.getAll('faction')).toEqual(['coven'])
  })

  it('drops the param entirely when nothing is selected', () => {
    expect(nextFactionParams(params('faction=ua'), []).has('faction')).toBe(false)
  })
})

describe('clearedFilterParams — every axis home, search included', () => {
  it('clears all five axes and the search', () => {
    const next = clearedFilterParams(
      params(
        `type=metatask&sort=oldest&status=retired&faction=ua&faction=coven&can_sign_up=${CAN_SIGN_UP_ON}&q=moss`,
      ),
    )
    expect(next.toString()).toBe('')
  })

  it('leaves params this page does not own alone', () => {
    const next = clearedFilterParams(params('sort=oldest&ref=newsletter'))
    expect(next.toString()).toBe('ref=newsletter')
  })
})
