/**
 * #2432 — Class B's first consumers: the task browse and the praxis feed read
 * through a keyed, TTL'd cache instead of a bare fetch per filter change.
 *
 * SEAM: `loadPage` — the pure first-page-only cache decision `usePagedResource`
 * makes inside its `useResource` closure — over `createKeyedResourceCache`. The
 * repo has no DOM harness (SPEC-testing.md), so the acceptance test the issue
 * names ("toggle a faction off, toggle it back on, and the second read is a
 * cache hit with no network request") is driven here by counting fetch
 * invocations across a params round trip, not in a Network panel.
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

/** A viewer id shaped like `viewerCacheKey` builds them. */
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

    // The board as it opens.
    await read(['standard', 'level', 'All', '', false, '', false])
    expect(fetchPage).toHaveBeenCalledTimes(1)

    // Toggle a faction on — a filter combination never seen, so a real request.
    await read(['standard', 'level', 'All', 'coven', false, '', false])
    expect(fetchPage).toHaveBeenCalledTimes(2)

    // Clear it again. THIS is the reported symptom ("clearing factions also has
    // a delay"): the same query as the opening read, so no request at all.
    await read(['standard', 'level', 'All', '', false, '', false])
    expect(fetchPage).toHaveBeenCalledTimes(2)

    // ...and back to the faction view, also free.
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

    // Every one of them is a hit on the way back.
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

    // "Load more" — a wider window is never cached (#2432, the named ceiling).
    await read(deps, DEFAULT_PAGE_SIZE * 2)
    await read(deps, DEFAULT_PAGE_SIZE * 2)
    expect(fetchPage).toHaveBeenCalledTimes(3)

    // ...and the first page it grew out of is still held.
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
    // `can_sign_up` / `signup_reason` / `allowed_modes` are computed for the
    // authenticated caller — serving one viewer's row to another is the
    // correctness failure, not a stale number.
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })

  it('viewerCacheKey separates anonymous, account and carried character', () => {
    expect(viewerCacheKey(null)).toBe('anon')
    const user = { account_id: 7, character: { id: 12 } }
    // Two characters on one account see different eligibility.
    expect(viewerCacheKey(user as never)).not.toBe(
      viewerCacheKey({ account_id: 7, character: { id: 13 } } as never),
    )
    // ...and an account carrying no life is neither of them, nor anonymous.
    const lifeless = viewerCacheKey({ account_id: 7, character: null } as never)
    expect(lifeless).not.toBe(viewerCacheKey(user as never))
    expect(lifeless).not.toBe('anon')
  })

  it('pageCacheKey cannot collide across an axis boundary', () => {
    // Two dep lists whose naive concatenation would be the same string.
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

    // The era rolls over: the board retires, scores reset. A five-minute bound
    // would have shown tasks from a world that no longer exists.
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

    // The pre-drop answer must not have become the post-drop cache entry: the
    // next read issues a fresh request rather than being served the old world.
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

    // Signing up for a task posts a praxis: `in_progress_count` moves and, with
    // the eligibility filter on, the row leaves the list (gate 5, #2264).
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

    // A slow board read goes out under some filter...
    const inFlight = loadPage(fetchPage, 50, 50, ['standard'], cached)
    // ...and the player signs up for a row still on screen before it lands.
    dropCachesAfterWrite()
    release(['task-still-claimable'])
    await inFlight

    // The pre-write answer must NOT have become the cache entry. Unlike the era
    // rollover this drop does not advance the epoch, so the guard has to be the
    // cache's own generation.
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

    // Unlike the Class A singleton, which resolves null and keeps the last good
    // value: `useResource` owns this page's error state, and swallowing here
    // would render a failed read as an empty board.
    await expect(cache.read('k', fetchPage)).rejects.toThrow('offline')
    expect(await cache.read('k', fetchPage)).toEqual(['task'])
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })
})
