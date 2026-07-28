import { describe, it, expect } from 'vitest'

import { shouldReturnToLanding } from '../axios'

/**
 * Guard for the guest deep-link bounce.
 *
 * `AuthProvider` asks `/auth/me` on every page load, and for a logged-out
 * visitor the answer is 401 — not an error, just "nobody is signed in". The
 * response interceptor treated it as an expired session and sent the browser to
 * `/`, so no guest could open any URL except the homepage: a shared task link, a
 * praxis permalink and a bookmarked faction page all landed on the marketing
 * page instead of the thing they pointed at.
 *
 * It was also slow in a way no amount of bundle work could fix. The redirect is
 * `window.location.href`, a full document navigation, so the visitor downloaded
 * the whole app, the fonts and every API response a second time before seeing a
 * page they never asked for — roughly doubling the load they actually felt.
 *
 * The predicate is separated from the interceptor purely so it can be tested
 * here: this harness has no DOM, so `window.location` is out of reach.
 */
describe('401 handling', () => {
  it('leaves a guest on the page they asked for', () => {
    for (const pathname of ['/tasks/46', '/praxes/2', '/factions/coven', '/about']) {
      expect(shouldReturnToLanding(401, '/auth/me', pathname)).toBe(false)
    }
  })

  it('still returns to landing when a real request 401s mid-session', () => {
    expect(shouldReturnToLanding(401, '/praxes/2/votes', '/praxes/2')).toBe(true)
    expect(shouldReturnToLanding(401, '/tasks/46/signup', '/tasks/46')).toBe(true)
  })

  it('ignores non-401 failures', () => {
    for (const status of [200, 403, 404, 500, undefined]) {
      expect(shouldReturnToLanding(status, '/praxes/2/votes', '/praxes/2')).toBe(false)
    }
  })

  it('does not bounce a page that is already the landing or an auth route', () => {
    expect(shouldReturnToLanding(401, '/praxes/2/votes', '/')).toBe(false)
    expect(shouldReturnToLanding(401, '/praxes/2/votes', '/auth/callback')).toBe(false)
  })
})
