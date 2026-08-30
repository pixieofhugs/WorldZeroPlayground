// ponytail: a ~12-line pub-sub so an accept/decline/submit anywhere refreshes
// the requests count, the mobile bell badge, and the sidebar panel — cheaper
// than threading a refetch callback through every feed card and detail page.
// The activity feed is read by independent hook instances (useUpdates,
// useSidebarPanels) with no shared cache between them; without this, only the
// component that made the request would see the change.
//
// WHY THIS IS HAND-FIRED AND `dropCachesAfterWrite` IS NOT (#2892)
// ---------------------------------------------------------------
// `api/client.ts` fires `dropCachesAfterWrite()` on EVERY mutating request, and
// centralising it there is the point: a route added later cannot forget it. It
// can afford to over-fire because dropping a cache is a `Map.clear()` — the
// refetch only happens if something reads again, and a surface nobody is
// looking at costs nothing.
//
// A notify is the opposite shape. It is a FAN-OUT, not an invalidation: every
// mounted subscriber issues its request immediately, so one call is four-plus
// round trips whether or not anything actually moved. Fired from the transport
// it would put those on each vote, each draft save and each media upload — the
// argument that makes `dropCachesAfterWrite` central inverts here. So
// membership stays a per-write decision, and the census in
// `utils/__tests__/requestsBusWiring.test.ts` is what stops it being seventeen
// unchecked ones: an api/praxis.ts write that is not classified fails CI.
//
// The upgrade that WOULD make it automatic is a cache that marks subscribers
// dirty instead of refetching them — react-query, which is #1347, closed
// `wontfix`. ADR-0072 keeps this bus on purpose: obligations are Class C, whose
// freshness requirement is zero, and a twelve-line pub-sub is the right shape
// for that rather than a poor imitation of a cache.

type Listener = () => void

const listeners = new Set<Listener>()

/**
 * Fire after any action that changes the current character's pending requests
 * (accept/decline an invite or challenge, submit/unsubmit, leave/delete a
 * collab or duel praxis) or their bank of in-progress work (sign up for a task,
 * kick a member and reopen the group). Every subscribed feed surface refetches.
 *
 * NOT for a write whose effect lands on someone ELSE — sending or rescinding an
 * invite, for one. The bus is a module-local Set, so it can only ever reach the
 * tab that made the call, and the inviter's own panels do not move.
 *
 * THAT IS THE WHOLE RULE, and `api/praxis.ts`'s seventeen mutating exports are
 * partitioned by it in one place rather than argued one function at a time —
 * see `PRAXIS_WRITES` in `utils/__tests__/requestsBusWiring.test.ts`, which
 * fails if a write is added without a verdict (#1867 was the omission that
 * reads exactly like a decision).
 */
export function notifyRequestsChanged(): void {
  for (const fn of listeners) fn()
}

/** Subscribe to request changes; returns an unsubscribe function. */
export function onRequestsChanged(fn: Listener): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
