import { describe, it, expect } from 'vitest'

import { shouldReturnToLanding } from '../sessionRedirect'

/**
 * A logged-out `/auth/me` 401 is "nobody signed in", not an expired session;
 * bouncing it to `/` broke every guest deep link and reloaded the whole app.
 * Predicate split out because this harness has no DOM.
 */
describe('401 handling', () => {
  it('leaves a guest on the page they asked for', () => {
    for (const pathname of ['/tasks/46', '/praxis/2', '/factions/coven', '/about']) {
      expect(shouldReturnToLanding(401, '/auth/me', pathname)).toBe(false)
    }
  })

  /**
   * `/me/sidebar` (#1344) goes out before `/auth/me` answers (httpOnly cookie),
   * so a guest's 401 there is a probe too — and it mounts on every route.
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

  /** A prefix match on `/me` would swallow real mid-session expiries. */
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
