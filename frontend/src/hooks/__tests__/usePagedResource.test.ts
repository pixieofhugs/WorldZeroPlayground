/**
 * #645 — the growing-window paging math extracted from `usePagedResource`
 * (mirrors the `runResource` precedent: hooks are tested via their pure core,
 * the repo has no DOM/renderHook). Covers the two decisions the hook encodes:
 * "load more iff the page came back full" and "one load-more grows by a page".
 */
import { describe, it, expect } from 'vitest'
import { pageHasMore, growLimit, DEFAULT_PAGE_SIZE } from '../usePagedResource'

describe('pageHasMore — load more iff the page came back full', () => {
  it('is true when the page fills the window exactly', () => {
    expect(pageHasMore(50, 50)).toBe(true)
    expect(pageHasMore(100, 100)).toBe(true)
  })

  it('is false when a short page signals the end', () => {
    expect(pageHasMore(37, 50)).toBe(false)
    expect(pageHasMore(0, 50)).toBe(false)
  })

  it('is false before the first page settles (null / undefined length)', () => {
    expect(pageHasMore(null, 50)).toBe(false)
    expect(pageHasMore(undefined, 50)).toBe(false)
  })
})

describe('growLimit — one load-more grows the window by a page', () => {
  it('adds exactly one page step', () => {
    expect(growLimit(50, 50)).toBe(100)
    expect(growLimit(100, 50)).toBe(150)
  })

  it('walks a full sequence: full page → grow → still full → grow → short page ends', () => {
    let limit = DEFAULT_PAGE_SIZE
    // First page comes back full → hasMore, so grow.
    expect(pageHasMore(limit, limit)).toBe(true)
    limit = growLimit(limit, DEFAULT_PAGE_SIZE)
    expect(limit).toBe(100)
    // Second window still full → grow again.
    expect(pageHasMore(limit, limit)).toBe(true)
    limit = growLimit(limit, DEFAULT_PAGE_SIZE)
    expect(limit).toBe(150)
    // Third window short (only 128 rows exist) → end, no more growing.
    expect(pageHasMore(128, limit)).toBe(false)
  })
})
