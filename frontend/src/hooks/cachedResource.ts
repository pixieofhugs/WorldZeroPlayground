import { useEffect, useState } from 'react'

/**
 * The one caching policy shared by every app-wide read-once endpoint
 * (`/game-config`, `/factions`). A single implementation rather than a pair of
 * hand-rolled module caches, because two copies drift into two policies — and
 * the second copy would also trip `sonarjs/no-identical-functions`.
 *
 * Policy: module-level entry + a shared in-flight promise, so N consumers
 * mounting in the same paint cost ONE request; then stale-while-revalidate past
 * {@link CACHE_TTL_MS}. A hard reload always refetches — the cache lives in
 * module scope, not storage.
 */

/**
 * Staleness bound: **5 minutes**.
 *
 * There is no push channel from the server, so the client cannot be told that
 * the era rolled over or that an admin flipped a faction's visibility; it can
 * only decide when to stop trusting what it holds. Five minutes is the smallest
 * number that keeps ordinary browsing at zero requests — a player crossing
 * /tasks → /factions → a faction page → /praxes does that in well under five
 * minutes, and pays nothing for it — while bounding staleness to something a
 * player would not sit through: an era transition or a visibility flip surfaces
 * on the next navigation after the window closes, without a reload. It also
 * caps the worst case at ~12 requests/hour/endpoint for someone who idles on a
 * page and navigates once every five minutes, against one request per
 * navigation before this existed.
 */
export const CACHE_TTL_MS = 5 * 60 * 1000

export interface CacheEntry<T> {
  readonly value: T
  /** `Date.now()` at the moment the fetch RESOLVED, not when it was issued. */
  readonly fetchedAt: number
}

/**
 * The staleness predicate, extracted so the TTL is provable without waiting on
 * a clock: pass an entry and a `now`, get an answer. An absent entry is never
 * fresh.
 */
export function isFresh(
  entry: CacheEntry<unknown> | null,
  now: number,
  ttlMs: number = CACHE_TTL_MS,
): boolean {
  return entry !== null && now - entry.fetchedAt < ttlMs
}

export interface ResourceCache<T> {
  /** The held value, fresh or stale; `null` before the first response. */
  peek: () => T | null
  /**
   * The cached value if it is still fresh; otherwise a fetch. Concurrent
   * callers share one in-flight request, so N consumers mounting in the same
   * paint cost one round trip.
   */
  load: () => Promise<T | null>
}

/**
 * The cache itself, with no React in it — exported so the dedupe and the
 * revalidation are testable directly (the repo has no DOM harness, so hooks are
 * tested through their extracted mechanics).
 */
export function createResourceCache<T>(fetchFn: () => Promise<T>): ResourceCache<T> {
  let entry: CacheEntry<T> | null = null
  let inFlight: Promise<T | null> | null = null

  return {
    peek: () => entry?.value ?? null,
    load: () => {
      // The freshness gate lives HERE, not in the caller: a consumer that
      // forgot to ask would otherwise refetch on every mount, which is the bug
      // this issue is about.
      if (entry && isFresh(entry, Date.now())) return Promise.resolve(entry.value)
      inFlight ??= fetchFn()
        .then((value) => {
          entry = { value, fetchedAt: Date.now() }
          inFlight = null
          return value
        })
        .catch(() => {
          // Leave the previous entry in place and drop the promise, so the next
          // consumer to mount retries instead of inheriting the failure.
          inFlight = null
          return null
        })
      return inFlight
    },
  }
}

/**
 * Build a hook that reads `fetchFn` once per {@link CACHE_TTL_MS} across the
 * whole app.
 *
 * Returns `null` until the first response lands (the null-until-settled
 * contract every call site already codes against). Once a value exists it stays
 * on screen through revalidation — a TTL expiry must not flash an empty page
 * mid-session.
 */
export function createCachedResource<T>(fetchFn: () => Promise<T>): () => T | null {
  const cache = createResourceCache(fetchFn)

  return function useCachedResource(): T | null {
    const [value, setValue] = useState<T | null>(cache.peek)

    useEffect(() => {
      let cancelled = false
      void cache.load().then((fetched) => {
        if (fetched !== null && !cancelled) setValue(fetched)
      })
      return () => {
        cancelled = true
      }
    }, [])

    return value
  }
}
