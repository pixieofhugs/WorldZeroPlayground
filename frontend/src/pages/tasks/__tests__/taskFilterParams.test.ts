/**
 * The task browse's URL param contract (#1367): enumerated axes clamp (#1537),
 * non-defaults only, repeated `faction`, and a viewer-relative eligibility
 * axis (#1972, #2025).
 */
import { describe, it, expect } from 'vitest'
import {
  CAN_SIGN_UP_OFF,
  CAN_SIGN_UP_ON,
  TASK_FILTER_PARAMS,
  TASK_SORT_DEFAULT,
  TASK_TYPE_DEFAULT,
  clearedFilterParams,
  nextFactionParams,
  nextFilterParams,
  readTaskFilters,
  type EligibilityDefault,
} from '../useTasks'

const params = (query: string) => new URLSearchParams(query)

const ONBOARDING: EligibilityDefault = 'on'
const LEVELLED: EligibilityDefault = 'off'
const NO_CHARACTER: EligibilityDefault = 'unavailable'

describe('readTaskFilters — a missing param IS the default', () => {
  it('reads a bare URL as the whole default filter set', () => {
    expect(readTaskFilters(params(''), NO_CHARACTER)).toEqual({
      taskType: 'standard',
      sort: 'level',
      status: 'All',
      factions: [],
      canSignUp: false,
    })
  })

  it('falls back when an axis is present but blank', () => {
    const filters = readTaskFilters(params('sort=&type=&status='), NO_CHARACTER)
    expect(filters.sort).toBe('level')
    expect(filters.taskType).toBe('standard')
    expect(filters.status).toBe('All')
  })

  it('hydrates a pasted link', () => {
    const filters = readTaskFilters(
      params(
        `type=metatask&sort=oldest&status=retired&faction=ua&faction=coven&can_sign_up=${CAN_SIGN_UP_ON}`,
      ),
      // Levelled on purpose: an explicit `1` must beat a default of off.
      LEVELLED,
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
    // `GET /tasks` rejects an unknown sort (#1443).
    expect(readTaskFilters(params('sort=bogus'), NO_CHARACTER).sort).toBe('level')
    expect(readTaskFilters(params('sort=most_voted'), NO_CHARACTER).sort).toBe('level')
  })

  it('clamps an unknown browse mode', () => {
    expect(readTaskFilters(params('type=metatasks'), NO_CHARACTER).taskType).toBe('standard')
  })

  it('clamps an unknown status', () => {
    expect(readTaskFilters(params('status=archived'), NO_CHARACTER).status).toBe('All')
  })

  it('clamps one axis without disturbing its neighbours', () => {
    const filters = readTaskFilters(params('sort=bogus&status=retired&faction=ua'), NO_CHARACTER)
    expect(filters.sort).toBe('level')
    expect(filters.status).toBe('retired')
    expect(filters.factions).toEqual(['ua'])
  })

  it('leaves unknown faction slugs alone — /factions is fetched separately', () => {
    expect(readTaskFilters(params('faction=not-a-faction'), NO_CHARACTER).factions).toEqual([
      'not-a-faction',
    ])
  })

  it('drops a blank faction, which would filter to no faction at all', () => {
    expect(readTaskFilters(params('faction=&faction=ua'), NO_CHARACTER).factions).toEqual(['ua'])
  })

  it('clamps an unrecognised eligibility value to the viewer default', () => {
    expect(readTaskFilters(params('can_sign_up=yes'), ONBOARDING).canSignUp).toBe(true)
    expect(readTaskFilters(params('can_sign_up=yes'), LEVELLED).canSignUp).toBe(false)
    expect(readTaskFilters(params('can_sign_up=yes'), NO_CHARACTER).canSignUp).toBe(
      false,
    )
  })
})

describe('readTaskFilters — eligibility is VIEWER-RELATIVE (#1972, #2025)', () => {
  it('defaults ON in the tutorial state, and only there', () => {
    expect(readTaskFilters(params(''), ONBOARDING).canSignUp).toBe(true)
  })

  it('defaults OFF once the player is past level 0', () => {
    expect(readTaskFilters(params(''), LEVELLED).canSignUp).toBe(false)
  })

  it('stays OFF for a viewer with no character — /tasks is the shop window', () => {
    expect(readTaskFilters(params(''), NO_CHARACTER).canSignUp).toBe(false)
  })

  it('honours an explicit OFF, so turning it off survives a paste', () => {
    expect(
      readTaskFilters(params(`can_sign_up=${CAN_SIGN_UP_OFF}`), ONBOARDING).canSignUp,
    ).toBe(false)
  })

  it('honours an explicit ON for a levelled player, so a narrowed link lands narrowed', () => {
    // The field desk's "Find a Task" link (`homeDestinations.test.ts`).
    expect(
      readTaskFilters(params(`can_sign_up=${CAN_SIGN_UP_ON}`), LEVELLED).canSignUp,
    ).toBe(true)
  })

  it('never lets a pasted ON empty the board for a viewer who has no character', () => {
    expect(
      readTaskFilters(params(`can_sign_up=${CAN_SIGN_UP_ON}`), NO_CHARACTER).canSignUp,
    ).toBe(false)
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
      NO_CHARACTER,
    )
    expect(next.toString()).toBe('')
  })

  it('leaves params this page does not own alone', () => {
    const next = clearedFilterParams(params('sort=oldest&ref=newsletter'), NO_CHARACTER)
    expect(next.toString()).toBe('ref=newsletter')
  })

  it('SPELLS OUT eligibility-off for the one viewer whose default is on', () => {
    // Deleting the param would restore this viewer's ON default.
    const next = clearedFilterParams(params('faction=ua&q=moss'), ONBOARDING)
    expect(next.toString()).toBe(`can_sign_up=${CAN_SIGN_UP_OFF}`)
    expect(readTaskFilters(next, ONBOARDING).canSignUp).toBe(false)
  })

  it('DELETES the param for a levelled player, whose default is already off', () => {
    const next = clearedFilterParams(
      params(`faction=ua&q=moss&can_sign_up=${CAN_SIGN_UP_ON}`),
      LEVELLED,
    )
    expect(next.toString()).toBe('')
    expect(readTaskFilters(next, LEVELLED).canSignUp).toBe(false)
  })

  it('clears to the same PLACE for both viewers, whatever the address says', () => {
    for (const viewer of [ONBOARDING, LEVELLED, NO_CHARACTER]) {
      const next = clearedFilterParams(params(`can_sign_up=${CAN_SIGN_UP_ON}`), viewer)
      expect(readTaskFilters(next, viewer).canSignUp, viewer).toBe(false)
    }
  })
})
