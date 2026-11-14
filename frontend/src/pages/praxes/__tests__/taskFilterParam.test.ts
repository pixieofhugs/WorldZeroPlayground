/**
 * #1050: `/praxis?task_id=N` must filter. Pure parse/clear helpers, plus a
 * source guard on `usePraxes.ts` (the hook's effects can't run here) that it
 * reads the param and sends it.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
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

const SOURCE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url))
const read = (relativePath: string) =>
  readFileSync(path.join(SOURCE_DIRECTORY, relativePath), 'utf8')

const USE_PRAXES_SOURCE = read('../usePraxes.ts')

describe('usePraxes sends the task filter it reads', () => {
  it('reads the param', () => {
    expect(USE_PRAXES_SOURCE).toContain('readTaskIdParam')
    expect(USE_PRAXES_SOURCE).toMatch(/useSearchParams\(\)/)
  })

  it('passes it to the list request — the missing half of the round trip', () => {
    expect(USE_PRAXES_SOURCE).toMatch(/task_id: taskId \?\? undefined/)
  })

  it('rekeys the fetch on it, so clearing the filter refetches', () => {
    // First entry of the `usePagedResource` dep key.
    expect(USE_PRAXES_SOURCE).toMatch(/\[taskId, factionKey,/)
  })

  it('leaves it optional — a bare /praxis is still the whole feed', () => {
    expect(USE_PRAXES_SOURCE).not.toMatch(/if \(!taskId\) return/)
  })

  it('counts as an active filter, so an empty result reads as filtered', () => {
    // The hook must feed the task id into `narrowingFilterCount`.
    expect(USE_PRAXES_SOURCE).toMatch(/narrowingFilterCount\([\s\S]*?taskId\s*\}/)
  })
})

describe('both feed surfaces announce the filter', () => {
  it.each([
    { name: 'desktop Praxes', relativePath: '../../Praxes.tsx' },
    { name: 'MobilePraxisFeed', relativePath: '../MobilePraxisFeed.tsx' },
  ])('$name shows the notice and a way to clear it', ({ relativePath }) => {
    const source = read(relativePath)
    expect(source).toContain('listPage.taskFilter.notice')
    expect(source).toContain('clearTaskFilter')
  })
})
