import { useState, type DependencyList } from 'react'
import { useResource } from './useResource'

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

export interface PagedResource<T> {
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
 * Deliberately a growing window, not offset accumulation: growing is what the
 * praxis feed proved, needs no total count, and none of the current lists are
 * large enough to feel the refetch. Offset accumulation is the named upgrade
 * path if a real list outgrows that.
 */
export function usePagedResource<T>(
  fetchPage: (limit: number) => Promise<T[]>,
  deps: DependencyList,
  pageSize: number = DEFAULT_PAGE_SIZE,
): PagedResource<T> {
  const [limit, setLimit] = useState(pageSize)

  const { data, loading, error } = useResource(() => fetchPage(limit), [...deps, limit])

  return {
    data,
    loading,
    error,
    hasMore: pageHasMore(data?.length, limit),
    loadMore: () => setLimit((current) => growLimit(current, pageSize)),
    resetWindow: () => setLimit(pageSize),
  }
}
