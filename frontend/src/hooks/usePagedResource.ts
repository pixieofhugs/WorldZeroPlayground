import { useEffect, useState, type DependencyList } from 'react'
import { useResource } from './useResource'
import type { KeyedResourceCache } from './cachedResource'
import { CACHE_EPOCH } from '../utils/cacheEpoch'
import type { CurrentUser } from '../api/auth'

/** Default page size — one "load more" grows the window by this step. */
export const DEFAULT_PAGE_SIZE = 50

/**
 * "Load more iff the page came back full." A full page (`length === limit`)
 * implies the backend may be holding more rows behind the current window; a
 * short page is the end. Needs no total count from the backend (the growing
 * window's whole point — see {@link usePagedResource}). Pure, so the load-more
 * contract is testable without a DOM (mirrors `runResource`).
 */
export function pageHasMore(pageLength: number | null | undefined, limit: number): boolean {
  return pageLength === limit
}

/** Grow the window by one page. Pure, extracted alongside {@link pageHasMore}. */
export function growLimit(current: number, pageSize: number): number {
  return current + pageSize
}

/**
 * Opt one paged list into the Class B cache (#2432, ADR-0072).
 *
 * The cache is the caller's, built once at module scope beside its own hook, so
 * the two lists cannot serve each other's rows; the KEY is built here, from the
 * dep list the caller already passes plus the viewer, so it cannot drift out of
 * step with what triggers a refetch.
 */
export interface PagedCache<T> {
  /** `createKeyedResourceCache<T[]>(AMBIENT_TTL_MS)` at the caller's module scope. */
  cache: KeyedResourceCache<T[]>
  /**
   * Who is asking — {@link viewerCacheKey}. These rows are VIEWER-RELATIVE
   * (`TaskOut.can_sign_up`, `signup_reason`, `allowed_modes` and
   * `eligible_for_current_user` are all computed for the authenticated caller),
   * so a key without the viewer would serve one player's eligibility to
   * another after a sign-in. Correctness, not tidiness.
   */
  viewer: string
}

/**
 * The viewer half of a page key.
 *
 * `account_id` alone is not enough: one account can carry more than one life
 * and eligibility is the CHARACTER's. Anonymous is its own key rather than a
 * missing one — `/tasks` is public, and a stranger's board (all rows, no
 * eligibility) is a real answer worth caching.
 *
 * Stays in memory, never in a URL or a request — the "don't expose account_id"
 * rule is about what leaves the client.
 */
export function viewerCacheKey(user: CurrentUser | null): string {
  if (user === null) return 'anon'
  return `${user.account_id}:${user.character?.id ?? '-'}`
}

/**
 * The full cache key: the viewer, then every axis the caller re-fetches on.
 *
 * `JSON.stringify` rather than a joined separator: one axis is a free-text
 * search box, so any separator a player could type is a real collision —
 * `['a','bc']` and `['ab','c']` must not be one key. Every dep is a string,
 * boolean or number (arrays travel as a joined key already), so the encoding is
 * total and stable.
 */
export function pageCacheKey(viewer: string, deps: DependencyList): string {
  return JSON.stringify([viewer, ...deps])
}

/**
 * One page read, cached or not — the decision `usePagedResource` makes inside
 * its fetch closure, extracted so the round trip is provable without a DOM.
 *
 * **First page only.** A grown window ("load more") always refetches. Caching
 * every page of a deep scroll is a memory question nobody has asked, and the
 * first page is where the repeat views are: a filter toggle collapses the
 * window back to one page (`resetWindow`), so the reported symptom — leaving a
 * view and coming back — is entirely a first-page event.
 *
 * ponytail: the ceiling is that a player who loads three pages, filters, and
 * comes back pays for pages 2 and 3 again. The upgrade path is to key on the
 * limit as well (`[...deps, limit]`), which is one line here and a bounded-map
 * question in `createKeyedResourceCache` — do it if a real list ever gets deep
 * enough for anyone to notice.
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
  /** The current page's rows (null before the first settle). */
  data: T[] | null
  loading: boolean
  error: Error | null
  /** True when the page came back full — there may be more behind the window. */
  hasMore: boolean
  /** Grow the window by one page (refetches; does not append). */
  loadMore: () => void
  /** Collapse the window back to one page — call when a filter/sort changes so
   *  "load more" can't strand a grown page against a freshly-narrowed result. */
  resetWindow: () => void
}

/**
 * Growing-window pagination over {@link useResource} (extracted from `usePraxes`,
 * #644/#645). Owns a `limit` that starts at `pageSize` and grows by `pageSize`
 * per "load more"; `limit` rides in the `useResource` dep key, so growing it
 * refetches the wider window rather than appending. `hasMore` is true exactly
 * when the last page came back full — no `COUNT(*)` needed.
 *
 * `fetchPage(limit)` receives the current window size; the caller closes its
 * own filter/search state over it. `deps` is the caller's filter key (limit is
 * appended automatically). Callers wrap their filter setters with
 * `resetWindow()` so narrowing the feed collapses the window (see `usePraxes`).
 *
 * Pass `cached` to opt the FIRST page into the Class B cache (#2432, ADR-0072)
 * — this is the seam, not the call sites, so both list pages inherit one
 * policy. See {@link PagedCache} for what the key carries and {@link loadPage}
 * for why page 2 is not cached.
 *
 * Deliberately a growing window, not offset accumulation: growing is what the
 * praxis feed proved, needs no total count, and none of the current lists are
 * large enough to feel the refetch. Offset accumulation is the named upgrade
 * path if a real list outgrows that.
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

  // The epoch outranks the TTL (ADR-0072), so a cached list re-reads the moment
  // an era rollover empties the cache — the same `onDrop` subscription the
  // Class A hooks take, and for the same reason: without it whatever is on
  // screen sits there showing the retired world until the next navigation.
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
