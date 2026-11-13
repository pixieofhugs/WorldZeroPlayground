/**
 * The 401 → landing rule as a pure predicate, so the DOM-less harness can test
 * it. Drift is silent: guests can open nothing but `/`.
 */

/**
 * A 401 from these means "nobody is logged in" — both go out on every load
 * before the client can know (httpOnly cookie). Matched whole, not by a `/me`
 * prefix: `/me/characters` 401 is a real expiry. Any new unconditional
 * first-wave fetch must join this list or every guest deep link bounces.
 */
const SESSION_PROBES = ['/auth/me', '/me/sidebar']

/**
 * Bounce an expired session to landing, sparing guests' probe 401s.
 * `requestUrl` is absolute, so probes match by substring.
 */
export function shouldReturnToLanding(
  status: number | undefined,
  requestUrl: string,
  pathname: string,
): boolean {
  if (status !== 401) return false
  if (SESSION_PROBES.some((probe) => requestUrl.includes(probe))) return false
  if (pathname.startsWith('/auth')) return false
  return pathname !== '/'
}

/** The `window` half the pure predicate can't hold. */
export function returnToLandingIfSessionExpired(
  status: number | undefined,
  requestUrl: string,
): void {
  if (typeof window === 'undefined') return
  if (shouldReturnToLanding(status, requestUrl, window.location.pathname)) {
    window.location.href = '/'
  }
}
