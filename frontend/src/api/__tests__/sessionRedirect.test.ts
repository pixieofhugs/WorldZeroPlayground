import { describe, it, expect } from 'vitest'

import { shouldReturnToLanding } from '../sessionRedirect'

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
    for (const pathname of ['/tasks/46', '/praxis/2', '/factions/coven', '/about']) {
      expect(shouldReturnToLanding(401, '/auth/me', pathname)).toBe(false)
    }
  })

  /**
   * `/me/sidebar` is the rail's compound read (#1344). It goes out in the FIRST
   * wave, before `/auth/me` has said whether anyone is signed in — the JWT is an
   * httpOnly cookie, so the client cannot know synchronously and asking is the
   * only way to find out. A guest's answer is 401, exactly like `/auth/me`'s.
   *
   * So it is a session probe too, and the exclusion had to stop being a single
   * URL. Without this, the endpoint would re-create the bug documented above on
   * every guest deep link — and this time from chrome that mounts on every
   * route, so there would be no URL a guest could open.
   */
  it('leaves a guest on the page they asked for when the rail probe 401s', () => {
    for (const pathname of ['/tasks/46', '/praxis/2', '/factions/coven', '/about']) {
      expect(shouldReturnToLanding(401, '/me/sidebar', pathname)).toBe(false)
    }
  })

  it('excludes every session probe, not just the first one', () => {
    for (const probe of ['/auth/me', '/me/sidebar']) {
      expect(shouldReturnToLanding(401, probe, '/tasks/46')).toBe(false)
    }
  })

  /**
   * `/me/sidebar` is excluded; its siblings under `/me` are not. A 401 from
   * `/me/characters` is a session that expired while the app was in use and must
   * still bounce — a prefix match on `/me` would have swallowed those.
   */
  it('does not extend the exclusion to the rest of /me', () => {
    expect(shouldReturnToLanding(401, '/me/characters', '/settings')).toBe(true)
    expect(shouldReturnToLanding(401, '/me/active-character', '/settings')).toBe(true)
  })

  it('still returns to landing when a real request 401s mid-session', () => {
    expect(shouldReturnToLanding(401, '/praxes/2/votes', '/praxis/2')).toBe(true)
    expect(shouldReturnToLanding(401, '/tasks/46/signup', '/tasks/46')).toBe(true)
  })

  it('ignores non-401 failures', () => {
    for (const status of [200, 403, 404, 500, undefined]) {
      expect(shouldReturnToLanding(status, '/praxes/2/votes', '/praxis/2')).toBe(false)
    }
  })

  it('does not bounce a page that is already the landing or an auth route', () => {
    expect(shouldReturnToLanding(401, '/praxes/2/votes', '/')).toBe(false)
    expect(shouldReturnToLanding(401, '/praxes/2/votes', '/auth/callback')).toBe(false)
  })
})
