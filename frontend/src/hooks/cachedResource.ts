import { useEffect, useState } from 'react'
import { CACHE_EPOCH, type CacheEpoch } from '../utils/cacheEpoch'
import { createResourceCache } from '../utils/resourceCache'

/**
 * React wrapper over `utils/resourceCache.ts`, re-exported here for callers.
 * The mechanics live in utils so `api/client.ts` can use them without
 * importing a hook (#2893).
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
 * Hook that fetches at most once per `ttlMs` app-wide and re-fetches on epoch
 * drop. `null` until the first response; after that the last value stays up
 * through revalidation, so an expiry never blanks the page.
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
      // Otherwise an era drop shows stale data until the next remount.
      const unsubscribe = epoch.onDrop(read)
      return () => {
        cancelled = true
        unsubscribe()
      }
    }, [])

    return value
  }
}
