// ponytail: a tiny pub-sub so accept/decline/submit anywhere refreshes the
// requests count, bell badge and sidebar panel (independent hook instances, no
// shared cache). Upgrade would be a dirty-marking query cache (#1347, wontfix;
// ADR-0072 keeps this for Class C).
//
// Hand-fired, unlike `dropCachesAfterWrite` (#2892): a notify is a fan-out of
// real requests, so firing it from the transport on every write would be costly.
// `utils/__tests__/requestsBusWiring.test.ts` forces a verdict per praxis write.

type Listener = () => void

const listeners = new Set<Listener>()

/**
 * Fire after an action changing the current character's own pending requests
 * or in-progress bank. Not for writes landing on someone else (e.g. sending an
 * invite): the bus only reaches this tab. See `PRAXIS_WRITES` (#1867).
 */
export function notifyRequestsChanged(): void {
  for (const fn of listeners) fn()
}

/** Returns an unsubscribe function. */
export function onRequestsChanged(fn: Listener): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
