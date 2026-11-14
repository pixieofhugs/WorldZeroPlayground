/** Direct seam on the pure cache; `hooks/__tests__/cachedResource.test.ts` covers it through the re-export. */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createCacheEpoch } from '../cacheEpoch'
import {
  AMBIENT_TTL_MS,
  SESSION_TTL_MS,
  createKeyedResourceCache,
  createResourceCache,
  dropCachesAfterWrite,
} from '../resourceCache'

afterEach(() => vi.useRealTimers())

describe('createResourceCache', () => {
  it('peek keeps serving the stale value after the TTL (an expiry must not blank the page)', async () => {
    vi.useFakeTimers()
    const cache = createResourceCache(() => Promise.resolve('v'), AMBIENT_TTL_MS, createCacheEpoch())
    await cache.load()
    vi.advanceTimersByTime(AMBIENT_TTL_MS + 1)
    expect(cache.peek()).toBe('v')
  })

  it('drop() empties peek and forces a re-read', async () => {
    const fetchFn = vi.fn().mockResolvedValue('v')
    const cache = createResourceCache(fetchFn, SESSION_TTL_MS, createCacheEpoch())
    await cache.load()
    cache.drop()
    expect(cache.peek()).toBeNull()
    await cache.load()
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('a write does NOT evict a session-scoped (class A) cache', async () => {
    const fetchFn = vi.fn().mockResolvedValue('v')
    const cache = createResourceCache(fetchFn, SESSION_TTL_MS, createCacheEpoch())
    await cache.load()
    dropCachesAfterWrite()
    await cache.load()
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })
})

describe('createKeyedResourceCache', () => {
  it('keys are independent: one key going stale or dropping by key does not serve another', async () => {
    const cache = createKeyedResourceCache<string>(AMBIENT_TTL_MS, createCacheEpoch())
    const a = vi.fn().mockResolvedValue('a')
    const b = vi.fn().mockResolvedValue('b')
    expect(await cache.read('a', a)).toBe('a')
    expect(await cache.read('b', b)).toBe('b')
    expect(await cache.read('a', a)).toBe('a')
    expect(a).toHaveBeenCalledTimes(1)
  })

  it('a session-scoped keyed cache is emptied by a write all the same', async () => {
    const cache = createKeyedResourceCache<string>(SESSION_TTL_MS, createCacheEpoch())
    const fetchFn = vi.fn().mockResolvedValue('x')
    await cache.read('k', fetchFn)
    dropCachesAfterWrite()
    await cache.read('k', fetchFn)
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('an era drop empties it too, even though no write happened', async () => {
    const epoch = createCacheEpoch()
    const cache = createKeyedResourceCache<string>(SESSION_TTL_MS, epoch)
    const fetchFn = vi.fn().mockResolvedValue('x')
    await cache.read('k', fetchFn)
    epoch.dropAll()
    await cache.read('k', fetchFn)
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })
})
