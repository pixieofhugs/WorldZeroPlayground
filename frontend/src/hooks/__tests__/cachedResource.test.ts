/**
 * #1284 — the one caching policy behind `useGameConfig` and `useFactions`.
 *
 * Seam: the extracted staleness predicate (`isFresh`) and the React-free cache
 * mechanics (`createResourceCache`). The hook wrapper is a four-line
 * `useState`/`useEffect` over these; the repo has no DOM harness, so the
 * dedupe and the revalidation are proved here, against an injected `now` and a
 * fake system clock — never by waiting.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  CACHE_TTL_MS,
  createResourceCache,
  isFresh,
} from '../cachedResource'

afterEach(() => {
  vi.useRealTimers()
})

describe('isFresh', () => {
  it('an absent entry is never fresh', () => {
    expect(isFresh(null, 0)).toBe(false)
  })

  it('is fresh right up to the TTL and stale at it', () => {
    const entry = { value: 'x', fetchedAt: 1_000 }
    expect(isFresh(entry, 1_000)).toBe(true)
    expect(isFresh(entry, 1_000 + CACHE_TTL_MS - 1)).toBe(true)
    expect(isFresh(entry, 1_000 + CACHE_TTL_MS)).toBe(false)
    expect(isFresh(entry, 1_000 + CACHE_TTL_MS * 10)).toBe(false)
  })

  it('the bound is a few minutes, not seconds — long enough that ordinary navigation is free', () => {
    expect(CACHE_TTL_MS).toBeGreaterThanOrEqual(60_000)
    expect(CACHE_TTL_MS).toBeLessThanOrEqual(15 * 60_000)
  })
})

describe('createResourceCache', () => {
  it('dedupes concurrent consumers into ONE request', async () => {
    const fetchFn = vi.fn(() => Promise.resolve(['ua', 'wow']))
    const cache = createResourceCache(fetchFn)

    // Five call sites mounting in the same paint.
    const results = await Promise.all([
      cache.load(),
      cache.load(),
      cache.load(),
      cache.load(),
      cache.load(),
    ])

    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect(results.every((r) => r?.[0] === 'ua')).toBe(true)
  })

  it('serves later mounts from the cache without a second request', async () => {
    const fetchFn = vi.fn(() => Promise.resolve('config'))
    const cache = createResourceCache(fetchFn)

    await cache.load()
    // A later navigation mounts another consumer.
    expect(await cache.load()).toBe('config')
    expect(cache.peek()).toBe('config')
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('null until settled: peek is null before the first response', () => {
    const cache = createResourceCache(() => Promise.resolve('config'))
    expect(cache.peek()).toBeNull()
  })

  it('goes stale past the TTL and the next load refetches', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-30T12:00:00Z'))

    let era = 'era_1'
    const fetchFn = vi.fn(() => Promise.resolve(era))
    const cache = createResourceCache(fetchFn)

    await cache.load()

    // A moment before the bound: zero extra requests, still the old value.
    vi.setSystemTime(Date.now() + CACHE_TTL_MS - 1)
    era = 'era_2'
    expect(await cache.load()).toBe('era_1')
    expect(fetchFn).toHaveBeenCalledTimes(1)

    // Past the bound: the era rolled over server-side and the next mount sees
    // it, with no reload.
    vi.setSystemTime(Date.now() + 1)
    expect(await cache.load()).toBe('era_2')
    expect(fetchFn).toHaveBeenCalledTimes(2)

    // ...and the refreshed entry is itself good for another full window.
    vi.setSystemTime(Date.now() + CACHE_TTL_MS - 1)
    expect(await cache.load()).toBe('era_2')
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('a failed fetch resolves null, keeps the last good value, and lets the next mount retry', async () => {
    let attempt = 0
    const fetchFn = vi.fn(() => {
      attempt += 1
      return attempt === 2
        ? Promise.reject(new Error('offline'))
        : Promise.resolve(`ok-${attempt}`)
    })
    const cache = createResourceCache(fetchFn)

    expect(await cache.load()).toBe('ok-1')

    vi.useFakeTimers()
    vi.setSystemTime(Date.now() + CACHE_TTL_MS)
    expect(await cache.load()).toBeNull()
    // The stale-but-real value survives a failed revalidation.
    expect(cache.peek()).toBe('ok-1')

    expect(await cache.load()).toBe('ok-3')
    expect(fetchFn).toHaveBeenCalledTimes(3)
  })
})
