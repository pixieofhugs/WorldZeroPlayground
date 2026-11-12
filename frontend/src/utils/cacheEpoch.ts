/**
 * The global cache epoch: a version key, orthogonal to staleness (ADR-0072).
 * When `/auth/me` or `/game-config` reports a different `era_name`, the whole
 * cache drops.
 *
 * Gap: a same-era reset keeps the same `era_name` and is invisible here. Safe
 * only while score-derived data stays uncached; then the key must be `Era.id`
 * (ADR-0072, "Consequences").
 */

/** A cache that can be emptied when the epoch turns over. */
type Droppable = () => void

export interface CacheEpoch {
  /** Enrol a cache; returns an unregister function. */
  register: (drop: Droppable) => () => void
  /** The first era seen only records; any later disagreement drops everything. */
  noteEraStamp: (eraName: string) => void
  /** Empty every cache and bump the version, so in-flight fetches can't write back. */
  dropAll: () => void
  onDrop: (listener: () => void) => () => void
  /** Only meaningful compared against itself. */
  version: () => number
  lastSeenEra: () => string | null
}

/** Build an epoch; the app uses {@link CACHE_EPOCH}, tests build their own. */
export function createCacheEpoch(): CacheEpoch {
  const caches = new Set<Droppable>()
  const listeners = new Set<() => void>()
  let version = 0
  let lastSeenEra: string | null = null

  const dropAll = (): void => {
    version += 1
    for (const drop of caches) drop()
    for (const listener of listeners) listener()
  }

  return {
    register: (drop) => {
      caches.add(drop)
      return () => {
        caches.delete(drop)
      }
    },
    noteEraStamp: (eraName) => {
      if (lastSeenEra === eraName) return
      const rolled = lastSeenEra !== null
      lastSeenEra = eraName
      if (rolled) dropAll()
    },
    dropAll,
    onDrop: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    version: () => version,
    lastSeenEra: () => lastSeenEra,
  }
}

export const CACHE_EPOCH: CacheEpoch = createCacheEpoch()

/**
 * Record the era a response reported (`/auth/me`, `/game-config`).
 *
 * Hand-fired, not in the transport (#2892): a body sniff would also catch
 * `EraAnnouncementPayload.era_name`, a PAST era, and drop every cache per feed page.
 */
export function noteEraStamp(eraName: string): void {
  CACHE_EPOCH.noteEraStamp(eraName)
}

/**
 * Drop every app-wide cache now, for the events that change WHO IS ASKING:
 * joining a faction (Albescent reveal) and sign-out.
 *
 * Hand-fired (#2892): firing on every write would evict Class A caches, which
 * by definition survive writes (ADR-0072; see `utils/resourceCache.ts`).
 */
export function dropAllCaches(): void {
  CACHE_EPOCH.dropAll()
}
