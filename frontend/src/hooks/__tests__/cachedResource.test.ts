/** #1284 — shared cache behind `useGameConfig`/`useFactions` and its staleness classes (ADR-0072). */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createCacheEpoch } from '../../utils/cacheEpoch'
import {
  AMBIENT_TTL_MS,
  SESSION_TTL_MS,
  createResourceCache,
  isFresh,
} from '../cachedResource'

afterEach(() => {
  vi.useRealTimers()
})

describe('isFresh', () => {
  it('an absent entry is never fresh', () => {
    expect(isFresh(null, 0, AMBIENT_TTL_MS)).toBe(false)
  })

  it('is fresh right up to the bound and stale at it', () => {
    const entry = { value: 'x', fetchedAt: 1_000 }
    expect(isFresh(entry, 1_000, AMBIENT_TTL_MS)).toBe(true)
    expect(isFresh(entry, 1_000 + AMBIENT_TTL_MS - 1, AMBIENT_TTL_MS)).toBe(true)
    expect(isFresh(entry, 1_000 + AMBIENT_TTL_MS, AMBIENT_TTL_MS)).toBe(false)
    expect(isFresh(entry, 1_000 + AMBIENT_TTL_MS * 10, AMBIENT_TTL_MS)).toBe(false)
  })

  it('a session-scoped entry never goes stale — the bound IS the session', () => {
    const entry = { value: 'x', fetchedAt: 0 }
    expect(isFresh(entry, 7 * 24 * 60 * 60 * 1000, SESSION_TTL_MS)).toBe(true)
    expect(isFresh(entry, Number.MAX_SAFE_INTEGER, SESSION_TTL_MS)).toBe(true)
    expect(isFresh(null, 0, SESSION_TTL_MS)).toBe(false)
  })

  it('the ambient bound is a few minutes, not seconds — ordinary navigation stays free', () => {
    expect(AMBIENT_TTL_MS).toBeGreaterThanOrEqual(60_000)
    expect(AMBIENT_TTL_MS).toBeLessThanOrEqual(15 * 60_000)
  })
})

describe('createResourceCache', () => {
  it('dedupes concurrent consumers into ONE request', async () => {
    const fetchFn = vi.fn(() => Promise.resolve(['ua', 'wow']))
    const cache = createResourceCache(fetchFn, AMBIENT_TTL_MS, createCacheEpoch())

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
    const cache = createResourceCache(fetchFn, AMBIENT_TTL_MS, createCacheEpoch())

    await cache.load()
    expect(await cache.load()).toBe('config')
    expect(cache.peek()).toBe('config')
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('null until settled: peek is null before the first response', () => {
    const cache = createResourceCache(() => Promise.resolve('config'), AMBIENT_TTL_MS, createCacheEpoch())
    expect(cache.peek()).toBeNull()
  })

  it('goes stale past an ambient bound and the next load refetches', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-30T12:00:00Z'))

    let ranking = 'first'
    const fetchFn = vi.fn(() => Promise.resolve(ranking))
    const cache = createResourceCache(fetchFn, AMBIENT_TTL_MS, createCacheEpoch())

    await cache.load()

    vi.setSystemTime(Date.now() + AMBIENT_TTL_MS - 1)
    ranking = 'second'
    expect(await cache.load()).toBe('first')
    expect(fetchFn).toHaveBeenCalledTimes(1)

    vi.setSystemTime(Date.now() + 1)
    expect(await cache.load()).toBe('second')
    expect(fetchFn).toHaveBeenCalledTimes(2)

    vi.setSystemTime(Date.now() + AMBIENT_TTL_MS - 1)
    expect(await cache.load()).toBe('second')
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('a session-scoped resource is never re-read on a timer', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-30T12:00:00Z'))

    const fetchFn = vi.fn(() => Promise.resolve('rules'))
    const cache = createResourceCache(fetchFn, SESSION_TTL_MS, createCacheEpoch())

    await cache.load()
    vi.setSystemTime(Date.now() + 24 * 60 * 60 * 1000)
    expect(await cache.load()).toBe('rules')
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('a failed fetch resolves null, keeps the last good value, and lets the next mount retry', async () => {
    let attempt = 0
    const fetchFn = vi.fn(() => {
      attempt += 1
      return attempt === 2
        ? Promise.reject(new Error('offline'))
        : Promise.resolve(`ok-${attempt}`)
    })
    const cache = createResourceCache(fetchFn, AMBIENT_TTL_MS, createCacheEpoch())

    expect(await cache.load()).toBe('ok-1')

    vi.useFakeTimers()
    vi.setSystemTime(Date.now() + AMBIENT_TTL_MS)
    expect(await cache.load()).toBeNull()
    expect(cache.peek()).toBe('ok-1')

    expect(await cache.load()).toBe('ok-3')
    expect(fetchFn).toHaveBeenCalledTimes(3)
  })
})

describe('the epoch drops what no bound could', () => {
  it('an era rollover re-reads a session-scoped resource that would otherwise never expire', async () => {
    const epoch = createCacheEpoch()
    let era = 'TestEra'
    const fetchFn = vi.fn(() => Promise.resolve(era))
    const cache = createResourceCache(fetchFn, SESSION_TTL_MS, epoch)

    epoch.noteEraStamp(era)
    expect(await cache.load()).toBe('TestEra')

    era = 'SecondEra'
    epoch.noteEraStamp('SecondEra')

    expect(cache.peek()).toBeNull()
    expect(await cache.load()).toBe('SecondEra')
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('a request already in flight when the era turns cannot write the old world back in', async () => {
    const epoch = createCacheEpoch()
    let release: (value: string) => void = () => {}
    const fetchFn = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          release = resolve
        }),
    )
    const cache = createResourceCache(fetchFn, SESSION_TTL_MS, epoch)

    const pending = cache.load()
    epoch.noteEraStamp('TestEra')
    epoch.noteEraStamp('SecondEra')
    release('rules-from-the-old-era')

    expect(await pending).toBeNull()
    expect(cache.peek()).toBeNull()
  })

  it('a stale response landing late does not steal the replacement request', async () => {
    const epoch = createCacheEpoch()
    const releases: ((value: string) => void)[] = []
    const fetchFn = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          releases.push(resolve)
        }),
    )
    const cache = createResourceCache(fetchFn, SESSION_TTL_MS, epoch)

    void cache.load()
    epoch.dropAll()
    const replacement = cache.load()
    expect(fetchFn).toHaveBeenCalledTimes(2)

    // Must not clear the shared in-flight slot the replacement owns.
    releases[0]('old')
    releases[1]('new')
    expect(await replacement).toBe('new')
    void (await cache.load())
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('drops EVERY cache, not only the one whose response noticed', async () => {
    const epoch = createCacheEpoch()
    const gameConfig = createResourceCache(() => Promise.resolve('rules'), SESSION_TTL_MS, epoch)
    const factions = createResourceCache(() => Promise.resolve(['ua']), SESSION_TTL_MS, epoch)

    await gameConfig.load()
    await factions.load()
    expect(factions.peek()).toEqual(['ua'])

    // Usually `/auth/me` reports the era, feeding neither cache.
    epoch.noteEraStamp('TestEra')
    epoch.noteEraStamp('SecondEra')

    expect(gameConfig.peek()).toBeNull()
    expect(factions.peek()).toBeNull()
  })
})
