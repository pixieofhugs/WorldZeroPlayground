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

const SUSPENDED_CODE = 'ACCOUNT_SUSPENDED'
const SUSPENDED_LANDING = `/?login=${SUSPENDED_CODE}`

/** A suspended session is told why on landing; already there, a reload would loop. */
export function shouldShowSuspendedNotice(
  status: number | undefined,
  code: string | null,
  pathname: string,
  search: string,
): boolean {
  if (status !== 403 || code !== SUSPENDED_CODE) return false
  return !(pathname === '/' && search.includes(`login=${SUSPENDED_CODE}`))
}

export function showSuspendedNoticeIfSuspended(
  status: number | undefined,
  code: string | null,
): void {
  if (typeof window === 'undefined') return
  const { pathname, search } = window.location
  if (shouldShowSuspendedNotice(status, code, pathname, search)) {
    window.location.href = SUSPENDED_LANDING
  }
}
