/**
 * The global cache epoch — a *version* key, orthogonal to staleness (ADR-0072).
 *
 * A TTL answers "how old is too old". It cannot answer "everything I hold is
 * wrong now", which is what an era rollover means: the level thresholds moved,
 * the scoring modifiers moved, every score reset. There is no push channel from
 * the server, so the only way the client can be told is by noticing it in a
 * response it was already going to read.
 *
 * Both `/auth/me` and `/game-config` carry `era_name`. The client remembers the
 * one it last saw and, when a response reports a different one, drops the ENTIRE
 * cache rather than aging each entry out. That makes the rollover correct by
 * construction instead of by picking a TTL short enough to paper over it.
 *
 * **What this stamp does NOT catch, and why that is survivable today:**
 * `era_name` is `EraConfig.name` — a module constant. `PUT /admin/era/reset`
 * opens a new `Era` row with the *same* name and `config_key`, so a same-era
 * reset is invisible here. It does not need to be caught: everything a same-era
 * reset changes (scores, levels, vote budgets) reaches the client through
 * uncached reads. The moment a score-derived resource is put in this cache, this
 * stamp stops being sufficient and the honest key becomes `Era.id` — which today
 * reaches the client only inside an `era_announcement` feed payload, never as a
 * per-response stamp. See ADR-0072, "Consequences".
 */

/** A cache that can be emptied when the epoch turns over. */
type Droppable = () => void

export interface CacheEpoch {
  /**
   * Enrol a cache. Returns an unregister function; module-level caches never
   * call it, but a test-built one should.
   */
  register: (drop: Droppable) => () => void
  /**
   * Feed the era reported by a response. The first era ever seen only records
   * the stamp — there is nothing held yet to be wrong. Any *later* disagreement
   * drops everything.
   */
  noteEraStamp: (eraName: string) => void
  /**
   * Empty every registered cache and advance the version, so a fetch already in
   * flight cannot write a pre-drop value back in behind it.
   */
  dropAll: () => void
  /** Subscribe to drops, so a mounted consumer re-reads instead of sitting on a
   *  value the epoch just invalidated. Returns an unsubscribe function. */
  onDrop: (listener: () => void) => () => void
  /** The current version. Only meaningful compared against itself. */
  version: () => number
  /** The era last reported by a response; `null` before the first one. */
  lastSeenEra: () => string | null
}

/**
 * Build an epoch. The app uses the {@link CACHE_EPOCH} singleton; this factory
 * exists so the mechanics are testable without module-scope state leaking
 * between cases (the repo has no DOM harness — see `SPEC-testing.md`).
 */
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

/** The one epoch every app-wide cache is enrolled in. */
export const CACHE_EPOCH: CacheEpoch = createCacheEpoch()

/**
 * Record the era a response just reported.
 *
 * Call from every api client whose payload carries `era_name` — `/auth/me` and
 * `/game-config` today. Cheap and idempotent: the common case is a string
 * compare against the era already held.
 *
 * WHY THIS IS HAND-FIRED (#2892). `api/client.ts` invalidates automatically off
 * one bit it already has: `mutates`, set per HTTP method. This fires on a READ,
 * and on a fact that lives in the response BODY, so there is no flag to hang it
 * on — the transport would have to duck-type every payload it returns, in a
 * layer whose whole premise is that shapes are known at compile time.
 *
 * And the sniff would be wrong, not merely ugly. `era_name` is not a synonym
 * for "the live era": `EraAnnouncementPayload` carries the era an activity-feed
 * announcement is ABOUT, which for a scrolled-back feed is a past one. A
 * body-shape check is one nesting level away from feeding this function a
 * historical era and dropping every cache in the app on every feed page. Two
 * explicit call sites, at the two endpoints whose top-level payload really does
 * describe the live era, are the honest form.
 */
export function noteEraStamp(eraName: string): void {
  CACHE_EPOCH.noteEraStamp(eraName)
}

/**
 * Drop every app-wide cache now.
 *
 * For the mutations that change what a deploy-scoped endpoint returns *for this
 * viewer* — joining Albescent reveals a faction that `/factions` was previously
 * hiding — and for sign-out, which must not leave the next viewer of this tab
 * holding the last one's directory.
 *
 * WHY THIS IS HAND-FIRED (#2892). This is the one mechanism that CANNOT be
 * folded into the transport even in principle: firing it on every mutating
 * request would evict the Class A caches on every write, and surviving writes is
 * the entire definition of Class A (ADR-0072). `dropCachesAfterWrite` exists
 * precisely because the automatic drop has to stop short of this one —
 * `utils/resourceCache.ts` spells out the same asymmetry from the other side.
 *
 * Its two call sites are not writes-in-general anyway. They are the two events
 * that change WHO IS ASKING: joining a faction (the viewer is now revealed to
 * Albescent) and signing out (the next viewer of this tab is a different
 * person). Neither is staleness, so neither is reachable from a staleness seam.
 */
export function dropAllCaches(): void {
  CACHE_EPOCH.dropAll()
}
