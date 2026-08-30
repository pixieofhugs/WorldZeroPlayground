import { CACHE_EPOCH, type CacheEpoch } from './cacheEpoch'

/**
 * The React-free cache mechanics behind every app-wide read-once endpoint —
 * one implementation rather than a hand-rolled module cache per endpoint,
 * because two copies drift into two policies (and the second copy would also
 * trip `sonarjs/no-identical-functions`).
 *
 * Mechanics: module-level entry + a shared in-flight promise, so N consumers
 * mounting in the same paint cost ONE request; then stale-while-revalidate past
 * the bound the caller names. A hard reload always refetches — the cache lives
 * in module scope, not storage.
 *
 * LIVES IN `utils/`, NOT `hooks/` (#2893). Nothing below touches React —
 * `hooks/cachedResource.ts` is the short `useState`/`useEffect` wrapper over
 * `createResourceCache`, so a mutating request in the api layer can drop the
 * caches (`dropCachesAfterWrite`) without importing anything hook-shaped.
 *
 * POLICY IS PER RESOURCE, NOT PER MODULE (ADR-0072). There is no default TTL
 * here on purpose: `ttlMs` is a required argument, so adding a cache forces you
 * to name which class the data is in. The three classes:
 *
 *  - **A — deploy-scoped.** `/game-config`, `/factions`. {@link SESSION_TTL_MS}.
 *    Not "a long TTL": the data cannot go stale within a session at all, because
 *    changing it takes a deploy.
 *  - **B — social / ambient.** The task browse, the praxis feed, leaderboards,
 *    another player's profile. {@link AMBIENT_TTL_MS}, and a KEY per query —
 *    see {@link createKeyedResourceCache}, which is what a filtered list needs
 *    that a Class A singleton does not. A minute-old ranking harms nobody; a
 *    minute-old list of your own just-completed action does, so a write empties
 *    them ({@link dropCachesAfterWrite}).
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
 *
 * IS THIS RIGHT-SIZED FOR FOUR CONSUMERS? (#2892 — ADR-0072's open question,
 * answered here because this is where the next reviewer asking it will be.)
 *
 * The consumers are four and are likely to stay few: `useFactions`,
 * `useGameConfig`, `usePraxes`, `useTasks`. **Yes, keep it**, on three counts.
 *
 * 1. **The line count is mostly this.** Strip the comments and the three files
 *    come to under 200 lines of code — 105 here, 50 in `cacheEpoch`, 38 in
 *    `hooks/cachedResource`. Everything else is prose, and it is the prose
 *    ADR-0072 exists to make unavoidable: "name your staleness class" is only
 *    load-bearing if the next author reads it at the moment they add a cache. A
 *    census that counts it as machinery is measuring the documentation.
 *
 * 2. **The cost does not scale with consumers.** Two factories and two
 *    constants serve all four, each in one line at its own module scope. The
 *    number that would indict this is machinery *per* consumer, and a fifth
 *    costs one line. Four hand-rolled module caches instead would be four
 *    policies, which is the drift #1284 and ADR-0072 were both about.
 *
 * 3. **Only ~50 lines are "extra", and they buy the thing a TTL cannot.** Cache
 *    two endpoints on a timer and you need roughly the singleton. The epoch is
 *    the surplus, and it is what makes an era rollover (ADR-0042) correct by
 *    construction with no push channel from the server. Delete it and the
 *    fallback is a TTL short enough to hide a rollover, which is the bound
 *    ADR-0072 rejected.
 *
 * The alternative is a query library, which is #1347 and closed `wontfix`: the
 * three classes and the epoch are statements about the *data* and would have to
 * be configured into any library exactly as they are configured here, so the
 * lines move into a config object and a dependency arrives with them.
 *
 * **Revisit when** either the consumer count passes ~10 (at which point the
 * config surface starts to justify a library), or a score-derived Class B
 * resource is cached — at which point `era_name` stops being a sufficient epoch
 * key and the honest one is `Era.id` (ADR-0072, "Consequences";
 * `utils/cacheEpoch.ts` states the same ceiling). That second one is a change to
 * the epoch's KEY, not to this taxonomy.
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
 * is a mutation, so it is answered like one — the join flow calls
 * `dropAllCaches` — not by aging the whole class out on a timer in the hope of
 * catching it.
 */
export const SESSION_TTL_MS = Number.POSITIVE_INFINITY

/**
 * **Class B — social / ambient. Five minutes.**
 *
 * Rankings, other players' profiles, the global feed, and since #2432 the task
 * browse and the praxis feed. What breaks if the bound is exceeded: a number is
 * a few minutes old. Who notices: nobody — none of it is a claim about the
 * viewer's own obligations.
 *
 * The task browse does carry a Sign up button, which ADR-0072's Class C note
 * warns about. What answers that is not a shorter bound but the invalidation:
 * every write empties these caches ({@link dropCachesAfterWrite}), so the only
 * rows that can age are ones nobody in this tab has acted on.
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

interface CacheEntry<T> {
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
 * Every keyed cache built below, so a WRITE can empty them all in one call.
 *
 * Class B lists are the only caches a mutation invalidates: Class A is
 * deploy-scoped (a write cannot change `/game-config`) and Class C never enters
 * this module at all. Registration is automatic rather than a list some future
 * third consumer has to remember to join.
 */
const writeSensitiveCaches = new Set<() => void>()

/**
 * Empty every keyed list cache — call after any mutating request.
 *
 * A five-minute stale read of your OWN action reads as a bug, not a cache
 * (ADR-0072), and signing up for a task, publishing a praxis or archiving one
 * each move a row in these lists. So the invalidation is explicit, not a TTL
 * wait — `utils/requestsBus` is the precedent for wiring one.
 *
 * Called from `api/client.ts`, the one seam every POST/PUT/PATCH/DELETE in the
 * app already passes through, so a mutation added later cannot forget it. It
 * over-invalidates on purpose: a vote does not change which tasks exist, and
 * paying one refetch for that is cheaper than an enumeration that rots.
 */
export function dropCachesAfterWrite(): void {
  for (const drop of writeSensitiveCaches) drop()
}

/**
 * A cache holding MANY entries under caller-supplied keys — the Class B shape.
 *
 * {@link createResourceCache} holds one value because a Class A endpoint takes
 * no arguments. A list read does: the task browse and the praxis feed are one
 * endpoint under a dozen filter combinations, and the win only exists if a
 * combination you have already seen is a hit (#2432). Hence a key, rather than
 * a second singleton per filter set.
 */
export interface KeyedResourceCache<T> {
  /**
   * The entry held under `key` if it is still fresh, else `fetchFn()`.
   * Concurrent readers of one key share a single in-flight request.
   *
   * A rejection PROPAGATES, unlike the singleton's swallow-and-keep: the caller
   * is `useResource`, which owns the page's error state, and a resolved-null
   * failure would paint an empty list where an error belongs.
   */
  read: (key: string, fetchFn: () => Promise<T>) => Promise<T>
  /** Forget every key. The epoch and {@link dropCachesAfterWrite} call this. */
  drop: () => void
}

/**
 * Build a keyed cache. `ttlMs` has no default for the reason the singleton
 * gives: naming the class is the point (ADR-0072).
 *
 * ponytail: entries are never individually evicted — the map is emptied whole,
 * by the epoch or by a write, and is bounded in practice by how many filter
 * combinations one person visits inside a five-minute window (tens of small
 * arrays). If a caller ever keys on something unbounded — a per-row id, a
 * keystroke — the upgrade is an LRU bound here, not a second cache.
 */
export function createKeyedResourceCache<T>(
  ttlMs: number,
  epoch: CacheEpoch = CACHE_EPOCH,
): KeyedResourceCache<T> {
  const entries = new Map<string, CacheEntry<T>>()
  const inFlight = new Map<string, Promise<T>>()
  // Advanced by EVERY drop, not just the epoch's. `epoch.version()` alone is
  // not enough here: `dropCachesAfterWrite` empties these maps directly and
  // deliberately does not touch the epoch, because bumping it would also evict
  // the deploy-scoped Class A caches on every mutation. Without a local
  // generation, a GET already in the air when a write landed would resolve,
  // still believe it was current, and file its PRE-write rows in the cache it
  // was just evicted from -- serving the row you just claimed as claimable for
  // the rest of the TTL, which is the exact failure the invalidation exists to
  // prevent.
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

      // Stamped at issue time: an answer describing the world we were in when
      // the request went out must not be written back in behind a drop that
      // landed while it was in the air (mirrors `createResourceCache`). Both
      // stamps are read -- the epoch for an era rollover, the local generation
      // for a write.
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
          // Nothing is cached, and the key is released so the next read retries.
          if (isCurrent()) inFlight.delete(key)
          throw cause
        },
      )
      inFlight.set(key, promise)
      return promise
    },
  }
}
