/**
 * #1348 — the global cache epoch (ADR-0072).
 *
 * The epoch is the answer to the one case a TTL cannot express: an era rollover
 * means *everything held is wrong*, and there is no push channel to say so. The
 * client watches the `era_name` every `/auth/me` and `/game-config` response
 * already carries, and drops the whole cache when it disagrees.
 *
 * Tested through `createCacheEpoch()` rather than the `CACHE_EPOCH` singleton so
 * each case starts from a virgin epoch — module state would otherwise carry the
 * previous test's era into the next one.
 */
import { describe, it, expect, vi } from 'vitest'
import { createCacheEpoch } from '../cacheEpoch'

describe('the era stamp', () => {
  it('the FIRST era seen only records the stamp — there is nothing held to be wrong yet', () => {
    const epoch = createCacheEpoch()
    const drop = vi.fn()
    epoch.register(drop)

    epoch.noteEraStamp('TestEra')

    expect(drop).not.toHaveBeenCalled()
    expect(epoch.lastSeenEra()).toBe('TestEra')
    expect(epoch.version()).toBe(0)
  })

  it('re-reporting the same era is free — this fires on every /auth/me', () => {
    const epoch = createCacheEpoch()
    const drop = vi.fn()
    epoch.register(drop)

    epoch.noteEraStamp('TestEra')
    epoch.noteEraStamp('TestEra')
    epoch.noteEraStamp('TestEra')

    expect(drop).not.toHaveBeenCalled()
    expect(epoch.version()).toBe(0)
  })

  it('a DIFFERENT era drops every registered cache at once', () => {
    const epoch = createCacheEpoch()
    const gameConfig = vi.fn()
    const factions = vi.fn()
    epoch.register(gameConfig)
    epoch.register(factions)

    epoch.noteEraStamp('TestEra')
    epoch.noteEraStamp('SecondEra')

    // Not "the one that noticed" — the whole cache. That is the point of a
    // version key over a per-entry bound.
    expect(gameConfig).toHaveBeenCalledTimes(1)
    expect(factions).toHaveBeenCalledTimes(1)
    expect(epoch.lastSeenEra()).toBe('SecondEra')
  })

  it('advances the version on every drop, so an in-flight request can tell it is stale', () => {
    const epoch = createCacheEpoch()
    expect(epoch.version()).toBe(0)
    epoch.dropAll()
    expect(epoch.version()).toBe(1)
    epoch.dropAll()
    expect(epoch.version()).toBe(2)
  })

  it('notifies subscribers AFTER the caches are emptied, never before', () => {
    const epoch = createCacheEpoch()
    const order: string[] = []
    epoch.register(() => order.push('drop'))
    epoch.onDrop(() => order.push('notify'))

    epoch.dropAll()

    // A listener that re-read first would be served the value just invalidated.
    expect(order).toEqual(['drop', 'notify'])
  })

  it('unregisters and unsubscribes', () => {
    const epoch = createCacheEpoch()
    const drop = vi.fn()
    const listener = vi.fn()
    epoch.register(drop)()
    epoch.onDrop(listener)()

    epoch.dropAll()

    expect(drop).not.toHaveBeenCalled()
    expect(listener).not.toHaveBeenCalled()
  })
})
