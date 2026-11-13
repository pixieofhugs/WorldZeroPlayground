import { useEffect, useState, type DependencyList } from 'react'
import { useResource } from './useResource'
import type { KeyedResourceCache } from './cachedResource'
import { CACHE_EPOCH } from '../utils/cacheEpoch'
import type { CurrentUser } from '../api/auth'

// Test-only exports are deliberate (#2693): no DOM in tests, so these pure seams
// are the only way to assert the load-more and cache-key contracts.

export const DEFAULT_PAGE_SIZE = 50

/** Load more iff the page came back full — no total count needed. */
export function pageHasMore(pageLength: number | null | undefined, limit: number): boolean {
  return pageLength === limit
}

export function growLimit(current: number, pageSize: number): number {
  return current + pageSize
}

/**
 * Opt a paged list into the Class B cache (#2432, ADR-0072). The cache is the
 * caller's (module scope, one per list); the key is built here from deps + viewer.
 */
export interface PagedCache<T> {
  /** `createKeyedResourceCache<T[]>(AMBIENT_TTL_MS)` at the caller's module scope. */
  cache: KeyedResourceCache<T[]>
  /** {@link viewerCacheKey}. Rows are viewer-relative (`can_sign_up` etc.). */
  viewer: string
}

/**
 * Account + character (eligibility is per life); 'anon' is a real cacheable
 * board. In-memory only, never sent anywhere.
 */
export function viewerCacheKey(user: CurrentUser | null): string {
  if (user === null) return 'anon'
  return `${user.account_id}:${user.character?.id ?? '-'}`
}

/** `JSON.stringify`, not a separator: one axis is free-text search. */
export function pageCacheKey(viewer: string, deps: DependencyList): string {
  return JSON.stringify([viewer, ...deps])
}

/**
 * One page read; caches the FIRST page only (repeat views are first-page events).
 *
 * ponytail: grown windows always refetch; upgrade: key on `[...deps, limit]`
 * with a bounded map in `createKeyedResourceCache`.
 */
export function loadPage<T>(
  fetchPage: (limit: number) => Promise<T[]>,
  limit: number,
  pageSize: number,
  deps: DependencyList,
  cached: PagedCache<T> | undefined,
): Promise<T[]> {
  if (cached === undefined || limit !== pageSize) return fetchPage(limit)
  return cached.cache.read(pageCacheKey(cached.viewer, deps), () => fetchPage(limit))
}

interface PagedResource<T> {
  data: T[] | null
  loading: boolean
  error: Error | null
  hasMore: boolean
  /** Grow the window by one page (refetches; does not append). */
  loadMore: () => void
  /** Call on filter/sort change so a grown window isn't stranded. */
  resetWindow: () => void
}

/**
 * Growing-window pagination over {@link useResource} (#644): `limit` rides in the
 * dep key, so "load more" refetches a wider window. `deps` is the caller's filter
 * key; wrap filter setters with `resetWindow()`. `cached` opts the first page
 * into Class B (see {@link loadPage}). Offset accumulation is the upgrade path
 * if a list outgrows the refetch.
 */
export function usePagedResource<T>(
  fetchPage: (limit: number) => Promise<T[]>,
  deps: DependencyList,
  pageSize: number = DEFAULT_PAGE_SIZE,
  cached?: PagedCache<T>,
): PagedResource<T> {
  const [limit, setLimit] = useState(pageSize)

  const { data, loading, error, refetch } = useResource(
    () => loadPage(fetchPage, limit, pageSize, deps, cached),
    [...deps, limit],
  )

  // Re-read on era rollover (epoch outranks TTL, ADR-0072).
  const isCached = cached !== undefined
  useEffect(
    () => (isCached ? CACHE_EPOCH.onDrop(refetch) : undefined),
    [isCached, refetch],
  )

  return {
    data,
    loading,
    error,
    hasMore: pageHasMore(data?.length, limit),
    loadMore: () => setLimit((current) => growLimit(current, pageSize)),
    resetWindow: () => setLimit(pageSize),
  }
}
