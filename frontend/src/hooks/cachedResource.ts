import { useEffect, useState } from 'react'
import { CACHE_EPOCH, type CacheEpoch } from '../utils/cacheEpoch'

/**
 * The shared machinery behind every app-wide read-once endpoint — one
 * implementation rather than a hand-rolled module cache per endpoint, because
 * two copies drift into two policies (and the second copy would also trip
 * `sonarjs/no-identical-functions`).
 *
 * Mechanics: module-level entry + a shared in-flight promise, so N consumers
 * mounting in the same paint cost ONE request; then stale-while-revalidate past
 * the bound the caller names. A hard reload always refetches — the cache lives
 * in module scope, not storage.
 *
 * POLICY IS PER RESOURCE, NOT PER MODULE (ADR-0072). There is no default TTL
 * here on purpose: `ttlMs` is a required argument, so adding a cache forces you
 * to name which class the data is in. The three classes:
 *
 *  - **A — deploy-scoped.** `/game-config`, `/factions`. {@link SESSION_TTL_MS}.
 *    Not "a long TTL": the data cannot go stale within a session at all, because
 *    changing it takes a deploy.
 *  - **B — social / ambient.** Leaderboard, another player's profile, the global
 *    activity feed. {@link AMBIENT_TTL_MS}. A minute-old ranking harms nobody.
 *    Nothing in this class is cached yet; the bound is here for when it is.
 *  - **C — obligations.** Pending collab invites, duel challenges, awaiting
 *    submission, and any number the viewer just moved. **These do not belong in
 *    this module at all.** A live Accept button beside an already-answered
 *    request is not lag, it is an actionable lie, and ADR-0070 makes the
 *    Requests queue the single place to answer one — there is no second surface
 *    to correct it. They are invalidated on mutation via `utils/requestsBus`,
 *    never aged out.
 *
 * Orthogonal to all three: the global epoch in `utils/cacheEpoch` drops
 * everything held here when a response reports a new era. A TTL cannot express
 * "everything is wrong now"; a version key can.
 */

/**
 * **Class A — deploy-scoped. The bound is the session.**
 *
 * `/game-config` reads no database at all (it serialises the `CURRENT_ERA`
 * module constant, #1283) and `/factions` is a directory the frontend cannot
 * render an addition to anyway — a new slug needs an entry in `utils/factions`,
 * its CSS variables in `index.css` and its copy in `factions.json`, all of which
 * ship with the bundle. So there is no staleness to bound: within one page
 * session the answer cannot change.
 *
 * What CAN change mid-session is who is asking. `/factions` hides Albescent
 * until the account is revealed to it (ADR-0027), and joining reveals it. That
 * is a mutation, so it is answered like one — `chooseFaction()` calls
 * `dropAllCaches()` — not by aging the whole class out on a timer in the hope of
 * catching it.
 */
export const SESSION_TTL_MS = Number.POSITIVE_INFINITY

/**
 * **Class B — social / ambient. Five minutes.**
 *
 * Rankings, other players' profiles, the global feed. What breaks if the bound
 * is exceeded: a number is a few minutes old. Who notices: nobody — none of it
 * is a control the viewer is about to act on, and none of it is a claim about
 * the viewer's own obligations.
 *
 * Five is the smallest number that keeps ordinary browsing at zero requests: a
 * player crossing /tasks → /players → a profile → /praxes does it in well under
 * five minutes. It also caps the worst case at ~12 requests/hour/endpoint for
 * someone idling and navigating once per window.
 *
 * Do NOT reach for this because it is the familiar number. If the data is an
 * obligation, no TTL is short enough — see the Class C note above.
 */
export const AMBIENT_TTL_MS = 5 * 60 * 1000

export interface CacheEntry<T> {
  readonly value: T
  /** `Date.now()` at the moment the fetch RESOLVED, not when it was issued. */
  readonly fetchedAt: number
}

/**
 * The staleness predicate, extracted so a bound is provable without waiting on
 * a clock: pass an entry, a `now` and a bound, get an answer. An absent entry is
 * never fresh; a `SESSION_TTL_MS` entry always is.
 */
export function isFresh(entry: CacheEntry<unknown> | null, now: number, ttlMs: number): boolean {
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
  /** Forget everything held. The epoch calls this; call sites should not. */
  drop: () => void
}

/**
 * The cache itself, with no React in it — exported so the dedupe, the
 * revalidation and the epoch drop are testable directly (the repo has no DOM
 * harness, so hooks are tested through their extracted mechanics).
 *
 * `ttlMs` has no default: naming the class is the point (ADR-0072).
 */
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
      // The freshness gate lives HERE, not in the caller: a consumer that
      // forgot to ask would otherwise refetch on every mount, which is the bug
      // this issue is about.
      if (entry && isFresh(entry, Date.now(), ttlMs)) return Promise.resolve(entry.value)
      // Stamped at issue time: if the era rolls over while this is in the air,
      // the answer describes the old world and must not be written back in
      // behind the drop that just happened.
      const issuedAtVersion = epoch.version()
      // Only the settling of the CURRENT generation may clear `inFlight`: a
      // pre-drop request landing late would otherwise null out the post-drop
      // request that replaced it, and the next mount would fire a third.
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
          // Leave the previous entry in place and drop the promise, so the next
          // consumer to mount retries instead of inheriting the failure.
          releaseIfCurrent()
          return null
        })
      return inFlight
    },
  }
}

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
