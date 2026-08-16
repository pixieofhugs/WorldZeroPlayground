// ponytail: a ~12-line pub-sub so an accept/decline/submit anywhere refreshes
// the requests count, the mobile bell badge, and the sidebar panel — cheaper
// than threading a refetch callback through every feed card and detail page.
// The activity feed is read by independent hook instances (useUpdates,
// useSidebarPanels) with no shared cache between them; without this, only the
// component that made the request would see the change. Upgrade to a query
// cache (react-query) if the app grows more of these cross-component
// invalidations.

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
