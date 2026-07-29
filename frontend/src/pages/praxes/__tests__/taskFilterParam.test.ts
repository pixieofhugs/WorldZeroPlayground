/**
 * #1050 — `/praxes?task_id=N` showed the whole feed. The link was built by every
 * task surface, the API accepted the param, and `usePraxes` read no params at
 * all, so the filter died on arrival.
 *
 * Three halves, because the pure helpers alone would all pass while the bug was
 * live:
 *  1. the parse (`readTaskIdParam`) and the clear (`withoutTaskIdParam`);
 *  2. an adoption guard on `usePraxes.ts` — the parse could be perfect and the
 *     hook could still never call it, or never pass the result to the fetch;
 *  3. that the filter stays optional and gets announced by both feed surfaces.
 *
 * The hook itself can't be rendered: this repo's harness is
 * `renderToStaticMarkup` only (no jsdom), so effects never run and a
 * self-fetching feed can't be driven. Asserting against the source is the
 * available check — same posture as
 * `hooks/__tests__/searchQueryParamAdoption.test.ts`.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  readTaskIdParam,
  withoutTaskIdParam,
  TASK_FILTER_PARAM,
  TASK_FILTER_NAV_OPTIONS,
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

  it('replaces rather than pushes, so Back returns to the task', () => {
    expect(TASK_FILTER_NAV_OPTIONS.replace).toBe(true)
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
    expect(USE_PRAXES_SOURCE).toMatch(/\[taskId, type, faction, voted, sort, trimmedQuery\]/)
  })

  it('leaves it optional — a bare /praxes is still the whole feed', () => {
    // `?? undefined` (above) rather than a required argument, and nothing
    // bails out early when the param is missing.
    expect(USE_PRAXES_SOURCE).not.toMatch(/if \(!taskId\) return/)
  })

  it('counts as an active filter, so an empty result reads as filtered', () => {
    expect(USE_PRAXES_SOURCE).toMatch(/hasActiveFilters\s*=\s*\n?\s*taskId !== null/)
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
