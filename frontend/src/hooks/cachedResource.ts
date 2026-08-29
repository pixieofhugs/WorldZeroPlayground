import { useEffect, useState } from 'react'
import { CACHE_EPOCH, type CacheEpoch } from '../utils/cacheEpoch'
import { createResourceCache } from '../utils/resourceCache'

/**
 * The React half of the shared cache machinery (#2893).
 *
 * The React-free mechanics — `createResourceCache`, `createKeyedResourceCache`,
 * `isFresh`, `dropCachesAfterWrite`, the {@link SESSION_TTL_MS} /
 * {@link AMBIENT_TTL_MS} classes and their doc — live in `utils/resourceCache.ts`
 * now, because `api/client.ts` needs `dropCachesAfterWrite` on every mutating
 * request and an api module importing a hook was the layering violation #2893
 * filed. This module re-exports all of it for existing callers and adds the one
 * thing that belongs here: {@link createCachedResource}, the `useState`/
 * `useEffect` wrapper that turns a `ResourceCache` into a hook.
 */
export {
  SESSION_TTL_MS,
  AMBIENT_TTL_MS,
  isFresh,
  createResourceCache,
  createKeyedResourceCache,
  dropCachesAfterWrite,
  type ResourceCache,
  type KeyedResourceCache,
} from '../utils/resourceCache'

/**
 * Build a hook that reads `fetchFn` once per `ttlMs` across the whole app, and
 * re-reads when the epoch drops.
 *
 * Returns `null` until the first response lands (the null-until-settled
 * contract every call site already codes against). Once a value exists it stays
 * on screen through revalidation — an expiry must not flash an empty page
 * mid-session.
 */
export function createCachedResource<T>(
  fetchFn: () => Promise<T>,
  ttlMs: number,
  epoch: CacheEpoch = CACHE_EPOCH,
): () => T | null {
  const cache = createResourceCache(fetchFn, ttlMs, epoch)

  return function useCachedResource(): T | null {
    const [value, setValue] = useState<T | null>(cache.peek)

    useEffect(() => {
      let cancelled = false
      const read = (): void => {
        void cache.load().then((fetched) => {
          if (fetched !== null && !cancelled) setValue(fetched)
        })
      }
      read()
      // A drop with nobody listening would leave whatever is on screen showing
      // the old era until the next navigation remounted it.
      const unsubscribe = epoch.onDrop(read)
      return () => {
        cancelled = true
        unsubscribe()
      }
    }, [])

    return value
  }
}
