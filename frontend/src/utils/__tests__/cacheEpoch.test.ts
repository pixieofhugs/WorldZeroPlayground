/**
 * The global cache epoch (#1348, ADR-0072). Uses `createCacheEpoch()`, not the
 * singleton, so each case starts fresh.
 */
import { describe, it, expect, vi } from 'vitest'
import { createCacheEpoch } from '../cacheEpoch'

describe('the era stamp', () => {
  it('the same era NAME under a new id still drops — a same-era reset appends an Era row', () => {
    const epoch = createCacheEpoch()
    const drop = vi.fn()
    epoch.register(drop)

    epoch.noteEraStamp(1)
    epoch.noteEraStamp(2)

    expect(drop).toHaveBeenCalledTimes(1)
  })

  it('the FIRST era seen only records the stamp — there is nothing held to be wrong yet', () => {
    const epoch = createCacheEpoch()
    const drop = vi.fn()
    epoch.register(drop)

    epoch.noteEraStamp(1)

    expect(drop).not.toHaveBeenCalled()
    expect(epoch.lastSeenEra()).toBe(1)
    expect(epoch.version()).toBe(0)
  })

  it('re-reporting the same era is free — this fires on every /auth/me', () => {
    const epoch = createCacheEpoch()
    const drop = vi.fn()
    epoch.register(drop)

    epoch.noteEraStamp(1)
    epoch.noteEraStamp(1)
    epoch.noteEraStamp(1)

    expect(drop).not.toHaveBeenCalled()
    expect(epoch.version()).toBe(0)
  })

  it('a DIFFERENT era drops every registered cache at once', () => {
    const epoch = createCacheEpoch()
    const gameConfig = vi.fn()
    const factions = vi.fn()
    epoch.register(gameConfig)
    epoch.register(factions)

    epoch.noteEraStamp(1)
    epoch.noteEraStamp(2)

    expect(gameConfig).toHaveBeenCalledTimes(1)
    expect(factions).toHaveBeenCalledTimes(1)
    expect(epoch.lastSeenEra()).toBe(2)
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

    // Else a listener re-reading would get the invalidated value.
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
