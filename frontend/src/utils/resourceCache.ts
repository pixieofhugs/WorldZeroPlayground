import { CACHE_EPOCH, type CacheEpoch } from './cacheEpoch'

/**
 * React-free cache mechanics for every app-wide read-once endpoint: one shared
 * in-flight promise per entry, then stale-while-revalidate. In `utils/` so the
 * api layer can call `dropCachesAfterWrite` (#2893); `hooks/cachedResource.ts`
 * is the React wrapper.
 *
 * Policy is per resource (ADR-0072); `ttlMs` is required so you name the class:
 * - A, deploy-scoped (`/game-config`, `/factions`): {@link SESSION_TTL_MS}.
 * - B, social/ambient (browse lists, feeds, rankings): {@link AMBIENT_TTL_MS},
 *   keyed per query, emptied by any write.
 * - C, obligations (invites, challenges): never cached here; a stale Accept
 *   button is an actionable lie. Invalidate via `utils/requestsBus`.
 * `utils/cacheEpoch` drops everything on a new era, which a TTL cannot express.
 *
 * Kept over a query library (#1347, wontfix; #2892). Revisit past ~10 consumers,
 * or when a score-derived Class B resource needs `Era.id` as the epoch key.
 */

/**
 * Class A: cannot change within a session without a deploy. The viewer can
 * change (joining reveals Albescent), so the join flow calls `dropAllCaches`.
 */
export const SESSION_TTL_MS = Number.POSITIVE_INFINITY

/**
 * Class B: smallest bound keeping ordinary browsing at zero requests. Writes
 * empty these caches, so only rows nobody here acted on can age. Never for
 * obligations.
 */
export const AMBIENT_TTL_MS = 5 * 60 * 1000

interface CacheEntry<T> {
  readonly value: T
  /** `Date.now()` when the fetch RESOLVED. */
  readonly fetchedAt: number
}

/** Clock-free so a bound is testable. */
export function isFresh(entry: CacheEntry<unknown> | null, now: number, ttlMs: number): boolean {
  return entry !== null && now - entry.fetchedAt < ttlMs
}

export interface ResourceCache<T> {
  /** Fresh or stale; `null` before the first response. */
  peek: () => T | null
  /** Concurrent callers share one in-flight request. */
  load: () => Promise<T | null>
  /** The epoch calls this; call sites should not. */
  drop: () => void
}

/** `ttlMs` has no default: naming the class is the point (ADR-0072). */
export function createResourceCache<T>(
  fetchFn: () => Promise<T>,
  ttlMs: number,
  epoch: CacheEpoch = CACHE_EPOCH,
): ResourceCache<T> {
  let entry: CacheEntry<T> | null = null
  let inFlight: Promise<T | null> | null = null

  const drop = (): void => {
    entry = null
    inFlight = null
  }
  epoch.register(drop)

  return {
    peek: () => entry?.value ?? null,
    drop,
    load: () => {
      // Freshness is gated here, not in callers.
      if (entry && isFresh(entry, Date.now(), ttlMs)) return Promise.resolve(entry.value)
      // Stamped at issue: an answer from before a drop must not be written back.
      const issuedAtVersion = epoch.version()
      // Only the current generation may clear `inFlight`, or a late pre-drop
      // request would null out its replacement.
      const releaseIfCurrent = (): boolean => {
        const current = epoch.version() === issuedAtVersion
        if (current) inFlight = null
        return current
      }
      inFlight ??= fetchFn()
        .then((value) => {
          if (!releaseIfCurrent()) return null
          entry = { value, fetchedAt: Date.now() }
          return value
        })
        .catch(() => {
          // Keep the previous entry; the next consumer retries.
          releaseIfCurrent()
          return null
        })
      return inFlight
    },
  }
}

/** Keyed (Class B) caches, auto-registered so a write empties them all. */
const writeSensitiveCaches = new Set<() => void>()

/**
 * Called by `api/client.ts` on every mutating request, so none can forget it.
 * Over-invalidates on purpose: cheaper than an enumeration that rots.
 */
export function dropCachesAfterWrite(): void {
  for (const drop of writeSensitiveCaches) drop()
}

/** Class B shape: one endpoint under many filter combinations (#2432). */
export interface KeyedResourceCache<T> {
  /** Rejections PROPAGATE (unlike the singleton): `useResource` owns the error state. */
  read: (key: string, fetchFn: () => Promise<T>) => Promise<T>
  /** Called by the epoch and {@link dropCachesAfterWrite}. */
  drop: () => void
}

/**
 * ponytail: no per-entry eviction; bounded by filter combos visited per window.
 * Keying on something unbounded needs an LRU bound here.
 */
export function createKeyedResourceCache<T>(
  ttlMs: number,
  epoch: CacheEpoch = CACHE_EPOCH,
): KeyedResourceCache<T> {
  const entries = new Map<string, CacheEntry<T>>()
  const inFlight = new Map<string, Promise<T>>()
  // Bumped by every drop: write drops skip the epoch (that would evict Class A),
  // so without this an in-flight GET would file PRE-write rows after the drop.
  let generation = 0

  const drop = (): void => {
    generation += 1
    entries.clear()
    inFlight.clear()
  }
  epoch.register(drop)
  writeSensitiveCaches.add(drop)

  return {
    drop,
    read: (key, fetchFn) => {
      const entry = entries.get(key) ?? null
      if (entry !== null && isFresh(entry, Date.now(), ttlMs)) {
        return Promise.resolve(entry.value)
      }
      const existing = inFlight.get(key)
      if (existing !== undefined) return existing

      // Epoch stamp for era rollover, generation stamp for writes.
      const issuedAtVersion = epoch.version()
      const issuedAtGeneration = generation
      const isCurrent = (): boolean =>
        epoch.version() === issuedAtVersion && generation === issuedAtGeneration
      const promise = fetchFn().then(
        (value) => {
          if (isCurrent()) {
            inFlight.delete(key)
            entries.set(key, { value, fetchedAt: Date.now() })
          }
          return value
        },
        (cause: unknown) => {
          if (isCurrent()) inFlight.delete(key)
          throw cause
        },
      )
      inFlight.set(key, promise)
      return promise
    },
  }
}
