/**
 * #660 — the three decisions `useSearchQueryParam` encodes, tested through its
 * pure core (the repo has no DOM/renderHook; same posture as
 * `usePagedResource.test.ts`):
 *
 *   1. hydrate from the URL on mount,
 *   2. non-default values only — clearing REMOVES `?q=`,
 *   3. `replace`, never `push` — no history entry per keystroke.
 */
import { describe, it, expect, vi } from 'vitest'
import {
  SEARCH_QUERY_PARAM,
  SEARCH_QUERY_NAV_OPTIONS,
  readSearchQuery,
  nextSearchQueryParams,
  writeSearchQuery,
  type SearchParamsSetter,
} from '../useSearchQueryParam'

describe('readSearchQuery — a shared or refreshed link hydrates the box', () => {
  it('restores the search from the URL', () => {
    expect(readSearchQuery(new URLSearchParams('?q=compost'))).toBe('compost')
  })

  it('decodes a multi-word search', () => {
    expect(readSearchQuery(new URLSearchParams('?q=river+clean+up'))).toBe('river clean up')
  })

  it('is an empty box, not null, when the param is absent', () => {
    expect(readSearchQuery(new URLSearchParams(''))).toBe('')
  })

  it('treats an empty param as an empty box', () => {
    expect(readSearchQuery(new URLSearchParams('?q='))).toBe('')
  })

  it('ignores params it does not own (only search rides in the URL)', () => {
    expect(readSearchQuery(new URLSearchParams('?faction=everymen&level=3'))).toBe('')
  })
})

describe('nextSearchQueryParams — non-default values only', () => {
  it('writes a non-empty search', () => {
    const next = nextSearchQueryParams(new URLSearchParams(''), 'compost')
    expect(next.get(SEARCH_QUERY_PARAM)).toBe('compost')
    expect(next.toString()).toBe('q=compost')
  })

  it('REMOVES the param when the search is cleared — no `?q=` noise', () => {
    const next = nextSearchQueryParams(new URLSearchParams('?q=compost'), '')
    expect(next.has(SEARCH_QUERY_PARAM)).toBe(false)
    expect(next.toString()).toBe('')
  })

  it('leaves no param behind when a search is typed then cleared', () => {
    let params = new URLSearchParams('')
    params = nextSearchQueryParams(params, 'c')
    params = nextSearchQueryParams(params, 'co')
    params = nextSearchQueryParams(params, 'compost')
    expect(params.toString()).toBe('q=compost')
    params = nextSearchQueryParams(params, '')
    expect(params.toString()).toBe('')
  })

  it('replaces rather than appends a second value for the same param', () => {
    const next = nextSearchQueryParams(new URLSearchParams('?q=old'), 'new')
    expect(next.getAll(SEARCH_QUERY_PARAM)).toEqual(['new'])
  })

  it('carries other params through untouched', () => {
    const next = nextSearchQueryParams(new URLSearchParams('?tab=mine'), 'compost')
    expect(next.get('tab')).toBe('mine')
    expect(next.get(SEARCH_QUERY_PARAM)).toBe('compost')
  })

  it('does not mutate the previous params', () => {
    const previous = new URLSearchParams('?q=compost')
    nextSearchQueryParams(previous, 'river')
    expect(previous.get(SEARCH_QUERY_PARAM)).toBe('compost')
  })

  it('round-trips through readSearchQuery', () => {
    const next = nextSearchQueryParams(new URLSearchParams(''), 'river clean up')
    expect(readSearchQuery(next)).toBe('river clean up')
  })
})

describe('writeSearchQuery — replace, never push', () => {
  it('always writes with replace semantics', () => {
    const setSearchParams = vi.fn() as unknown as SearchParamsSetter
    writeSearchQuery(setSearchParams, 'compost')
    expect(setSearchParams).toHaveBeenCalledWith(expect.any(Function), { replace: true })
    expect(SEARCH_QUERY_NAV_OPTIONS.replace).toBe(true)
  })

  it('never writes a history entry per keystroke — 7 keystrokes, 0 pushes', () => {
    const setSearchParams = vi.fn()
    for (const value of ['c', 'co', 'com', 'comp', 'compo', 'compos', 'compost']) {
      writeSearchQuery(setSearchParams as unknown as SearchParamsSetter, value)
    }
    expect(setSearchParams).toHaveBeenCalledTimes(7)
    for (const call of setSearchParams.mock.calls) {
      expect(call[1]).toEqual({ replace: true })
    }
  })

  it('uses the functional updater form so concurrent params are not clobbered', () => {
    const setSearchParams = vi.fn()
    writeSearchQuery(setSearchParams as unknown as SearchParamsSetter, 'compost')
    const updater = setSearchParams.mock.calls[0][0] as (p: URLSearchParams) => URLSearchParams
    // The updater is applied to whatever the params are AT WRITE TIME, so a
    // param set between renders survives.
    expect(updater(new URLSearchParams('?tab=mine')).toString()).toBe('tab=mine&q=compost')
  })

  it('clearing the box removes the param through the same write path', () => {
    const setSearchParams = vi.fn()
    writeSearchQuery(setSearchParams as unknown as SearchParamsSetter, '')
    const updater = setSearchParams.mock.calls[0][0] as (p: URLSearchParams) => URLSearchParams
    expect(updater(new URLSearchParams('?q=compost')).toString()).toBe('')
  })
})
