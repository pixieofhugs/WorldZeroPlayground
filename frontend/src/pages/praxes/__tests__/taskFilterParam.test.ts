/** #1050: `/praxis?task_id=N` must filter. Pure parse/clear helpers; `usePraxesTaskFilter.test.tsx` covers the hook. */
import { describe, it, expect } from 'vitest'
import {
  readTaskIdParam,
  withoutTaskIdParam,
  TASK_FILTER_PARAM,
} from '../taskFilterParam'

const params = (search: string) => new URLSearchParams(search)

describe('readTaskIdParam', () => {
  it('reads the id the task surfaces link with', () => {
    expect(readTaskIdParam(params('?task_id=42'))).toBe(42)
  })

  it('reads it alongside the other params a feed URL carries', () => {
    expect(readTaskIdParam(params('?q=lantern&task_id=7'))).toBe(7)
  })

  it('is absent on the bare feed — the filter is optional', () => {
    expect(readTaskIdParam(params(''))).toBeNull()
    expect(readTaskIdParam(params('?q=lantern'))).toBeNull()
  })

  it('degrades junk to the unfiltered feed rather than requesting task NaN', () => {
    for (const junk of ['abc', '', '3.5', '-1', '0', '1e3', '0x2', ' ']) {
      expect(readTaskIdParam(params(`?${TASK_FILTER_PARAM}=${junk}`)), junk).toBeNull()
    }
  })
})

describe('withoutTaskIdParam', () => {
  it('drops the task filter', () => {
    expect(withoutTaskIdParam(params('?task_id=42')).has('task_id')).toBe(false)
  })

  it('keeps every other param — clearing the task must not wipe the search', () => {
    expect(withoutTaskIdParam(params('?q=lantern&task_id=42')).get('q')).toBe('lantern')
  })

  it('does not mutate the params it was handed', () => {
    const previous = params('?task_id=42')
    withoutTaskIdParam(previous)
    expect(previous.get('task_id')).toBe('42')
  })
})
