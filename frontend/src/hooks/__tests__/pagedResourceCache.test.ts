/**
 * #2432 — Class B keyed cache for task browse / praxis feed, via `loadPage`
 * (the first-page-only cache decision); hits are counted as fetch calls.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createCacheEpoch } from '../../utils/cacheEpoch'
import {
  AMBIENT_TTL_MS,
  createKeyedResourceCache,
  dropCachesAfterWrite,
} from '../cachedResource'
import {
  DEFAULT_PAGE_SIZE,
  loadPage,
  pageCacheKey,
  viewerCacheKey,
  type PagedCache,
} from '../usePagedResource'

afterEach(() => {
  vi.useRealTimers()
})

const VIEWER = '7:12'

function harness(): {
  fetchPage: ReturnType<typeof vi.fn>
  cached: PagedCache<string>
  read: (deps: unknown[], limit?: number) => Promise<string[]>
} {
  const fetchPage = vi.fn((limit: number) => Promise.resolve([`rows-${limit}`]))
  const cached: PagedCache<string> = {
    cache: createKeyedResourceCache<string[]>(AMBIENT_TTL_MS, createCacheEpoch()),
    viewer: VIEWER,
  }
  return {
    fetchPage,
    cached,
    read: (deps, limit = DEFAULT_PAGE_SIZE) =>
      loadPage(fetchPage, limit, DEFAULT_PAGE_SIZE, deps, cached),
  }
}

describe('the acceptance test: a filter round trip is one request, not two', () => {
  it('toggling a faction off and back on serves the second read from cache', async () => {
    const { fetchPage, read } = harness()

    await read(['standard', 'level', 'All', '', false, '', false])
    expect(fetchPage).toHaveBeenCalledTimes(1)

    await read(['standard', 'level', 'All', 'coven', false, '', false])
    expect(fetchPage).toHaveBeenCalledTimes(2)

    await read(['standard', 'level', 'All', '', false, '', false])
    expect(fetchPage).toHaveBeenCalledTimes(2)

    await read(['standard', 'level', 'All', 'coven', false, '', false])
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })

  it('keys on EVERY axis that rides in the URL, not just the factions', async () => {
    const { fetchPage, read } = harness()
    const base = ['standard', 'level', 'All', '', false, '', false]

    await read(base)
    // One axis moved per read: type, sort, status, eligibility, search.
    await read(['metatask', 'level', 'All', '', false, '', false])
    await read(['standard', 'newest', 'All', '', false, '', false])
    await read(['standard', 'level', 'active', '', false, '', false])
    await read(['standard', 'level', 'All', '', true, '', false])
    await read(['standard', 'level', 'All', '', false, 'bread', false])
    expect(fetchPage).toHaveBeenCalledTimes(6)

    await read(base)
    expect(fetchPage).toHaveBeenCalledTimes(6)
  })
})

describe('loadPage — first page only', () => {
  it('caches the first page and refetches every grown window', async () => {
    const { fetchPage, read } = harness()
    const deps = ['standard']

    await read(deps)
    expect(fetchPage).toHaveBeenCalledTimes(1)

    await read(deps, DEFAULT_PAGE_SIZE * 2)
    await read(deps, DEFAULT_PAGE_SIZE * 2)
    expect(fetchPage).toHaveBeenCalledTimes(3)

    await read(deps)
    expect(fetchPage).toHaveBeenCalledTimes(3)
  })

  it('an uncached caller (no PagedCache) is exactly the old bare fetch', async () => {
    const fetchPage = vi.fn((limit: number) => Promise.resolve([`rows-${limit}`]))
    await loadPage(fetchPage, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE, ['standard'], undefined)
    await loadPage(fetchPage, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE, ['standard'], undefined)
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })
})

describe('the rows are viewer-relative', () => {
  it('two viewers on the same query never share an entry', async () => {
    const cache = createKeyedResourceCache<string[]>(AMBIENT_TTL_MS, createCacheEpoch())
    const fetchPage = vi.fn(() => Promise.resolve(['eligible-for-me']))
    const deps = ['standard', 'level', 'All', '', true, '', false]

    await loadPage(fetchPage, 50, 50, deps, { cache, viewer: '7:12' })
    await loadPage(fetchPage, 50, 50, deps, { cache, viewer: '9:31' })
    // `can_sign_up` etc. are computed per caller.
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })

  it('viewerCacheKey separates anonymous, account and carried character', () => {
    expect(viewerCacheKey(null)).toBe('anon')
    const user = { account_id: 7, character: { id: 12 } }
    expect(viewerCacheKey(user as never)).not.toBe(
      viewerCacheKey({ account_id: 7, character: { id: 13 } } as never),
    )
    const lifeless = viewerCacheKey({ account_id: 7, character: null } as never)
    expect(lifeless).not.toBe(viewerCacheKey(user as never))
    expect(lifeless).not.toBe('anon')
  })

  it('pageCacheKey cannot collide across an axis boundary', () => {
    expect(pageCacheKey(VIEWER, ['a', 'bc'])).not.toBe(pageCacheKey(VIEWER, ['ab', 'c']))
  })
})

describe('the era epoch outranks the TTL', () => {
  it('an era rollover drops every held page, mid-window', async () => {
    const epoch = createCacheEpoch()
    const cache = createKeyedResourceCache<string[]>(AMBIENT_TTL_MS, epoch)
    const fetchPage = vi.fn(() => Promise.resolve(['task']))

    epoch.noteEraStamp('Era One')
    await loadPage(fetchPage, 50, 50, ['standard'], { cache, viewer: VIEWER })
    expect(fetchPage).toHaveBeenCalledTimes(1)

    epoch.noteEraStamp('Era Two')
    await loadPage(fetchPage, 50, 50, ['standard'], { cache, viewer: VIEWER })
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })

  it('a request in flight when the era rolls is not written back in behind the drop', async () => {
    const epoch = createCacheEpoch()
    const cache = createKeyedResourceCache<string[]>(AMBIENT_TTL_MS, epoch)
    let release: (rows: string[]) => void = () => {}
    const fetchPage = vi.fn(
      () => new Promise<string[]>((resolve) => { release = resolve }),
    )

    epoch.noteEraStamp('Era One')
    const inFlight = loadPage(fetchPage, 50, 50, ['standard'], { cache, viewer: VIEWER })
    epoch.noteEraStamp('Era Two')
    release(['old-era-task'])
    await inFlight

    const afterRollover = loadPage(fetchPage, 50, 50, ['standard'], {
      cache,
      viewer: VIEWER,
    })
    expect(fetchPage).toHaveBeenCalledTimes(2)
    release(['new-era-task'])
    expect(await afterRollover).toEqual(['new-era-task'])
  })
})

describe('a write invalidates — no five-minute wait on your own action', () => {
  it('dropCachesAfterWrite empties every keyed cache', async () => {
    const cache = createKeyedResourceCache<string[]>(AMBIENT_TTL_MS, createCacheEpoch())
    const fetchPage = vi.fn(() => Promise.resolve(['task']))
    const cached: PagedCache<string> = { cache, viewer: VIEWER }

    await loadPage(fetchPage, 50, 50, ['standard'], cached)
    await loadPage(fetchPage, 50, 50, ['standard'], cached)
    expect(fetchPage).toHaveBeenCalledTimes(1)

    dropCachesAfterWrite()

    await loadPage(fetchPage, 50, 50, ['standard'], cached)
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })

  it('a read in flight when the write lands does not file its pre-write rows', async () => {
    const cache = createKeyedResourceCache<string[]>(AMBIENT_TTL_MS, createCacheEpoch())
    const cached: PagedCache<string> = { cache, viewer: VIEWER }
    let release: (rows: string[]) => void = () => {}
    const fetchPage = vi.fn(
      () => new Promise<string[]>((resolve) => { release = resolve }),
    )

    const inFlight = loadPage(fetchPage, 50, 50, ['standard'], cached)
    dropCachesAfterWrite()
    release(['task-still-claimable'])
    await inFlight

    // No epoch advance here, so the cache's own generation is the guard.
    const afterWrite = loadPage(fetchPage, 50, 50, ['standard'], cached)
    expect(fetchPage).toHaveBeenCalledTimes(2)
    release(['task-now-claimed'])
    expect(await afterWrite).toEqual(['task-now-claimed'])
  })
})

describe('createKeyedResourceCache — the mechanics the singleton cache does not cover', () => {
  it('dedupes concurrent readers of ONE key into one request', async () => {
    const cache = createKeyedResourceCache<string[]>(AMBIENT_TTL_MS, createCacheEpoch())
    const fetchPage = vi.fn(() => Promise.resolve(['task']))

    await Promise.all([
      cache.read('k', fetchPage),
      cache.read('k', fetchPage),
      cache.read('k', fetchPage),
    ])
    expect(fetchPage).toHaveBeenCalledTimes(1)
  })

  it('goes stale at the ambient bound', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-24T12:00:00Z'))
    const cache = createKeyedResourceCache<string[]>(AMBIENT_TTL_MS, createCacheEpoch())
    const fetchPage = vi.fn(() => Promise.resolve(['task']))

    await cache.read('k', fetchPage)
    vi.setSystemTime(Date.now() + AMBIENT_TTL_MS - 1)
    await cache.read('k', fetchPage)
    expect(fetchPage).toHaveBeenCalledTimes(1)

    vi.setSystemTime(Date.now() + 1)
    await cache.read('k', fetchPage)
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })

  it('RETHROWS a failure and caches nothing — the page still shows its error', async () => {
    const cache = createKeyedResourceCache<string[]>(AMBIENT_TTL_MS, createCacheEpoch())
    let attempt = 0
    const fetchPage = vi.fn(() => {
      attempt += 1
      return attempt === 1 ? Promise.reject(new Error('offline')) : Promise.resolve(['task'])
    })

    // Unlike Class A: swallowing would render a failed read as an empty board.
    await expect(cache.read('k', fetchPage)).rejects.toThrow('offline')
    expect(await cache.read('k', fetchPage)).toEqual(['task'])
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })
})
