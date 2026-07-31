/**
 * The seam: the task browse's URL param contract (#1367, epic #1361 ruling 7).
 *
 * Every filter axis rides in the address bar, so the whole filter set survives
 * a paste or a refresh. The parts worth pinning are the ones that are pure
 * functions of a param set — the repo's harness has no DOM, so the hook itself
 * is not renderable here, and these are deliberately the hook's whole decision.
 *
 * Three decisions:
 *   1. non-default values only — a clean browse has a clean address
 *   2. faction is REPEATED (`?faction=a&faction=b`), the union B2 (#1364) reads
 *   3. "clear all" clears search too, and touches nothing it does not own
 */
import { describe, it, expect } from 'vitest'
import {
  CAN_SIGN_UP_ON,
  TASK_FILTER_PARAMS,
  TASK_SORT_DEFAULT,
  TASK_STATUS_DEFAULT,
  TASK_TYPE_DEFAULT,
  clearedFilterParams,
  nextFactionParams,
  nextFilterParams,
  readFilterParam,
} from '../useTasks'

const params = (query: string) => new URLSearchParams(query)

describe('readFilterParam — a missing param IS the default', () => {
  it('falls back when the axis is absent', () => {
    expect(
      readFilterParam(params(''), TASK_FILTER_PARAMS.sort, TASK_SORT_DEFAULT),
    ).toBe('level')
  })

  it('falls back when the axis is present but blank', () => {
    expect(
      readFilterParam(params('sort='), TASK_FILTER_PARAMS.sort, TASK_SORT_DEFAULT),
    ).toBe('level')
  })

  it('hydrates a pasted link', () => {
    expect(
      readFilterParam(
        params('sort=oldest&status=retired'),
        TASK_FILTER_PARAMS.status,
        TASK_STATUS_DEFAULT,
      ),
    ).toBe('retired')
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
