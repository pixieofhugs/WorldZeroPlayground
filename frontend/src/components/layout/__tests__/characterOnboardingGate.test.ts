import { describe, it, expect } from 'vitest'

import { needsCharacterRedirect } from '../characterOnboardingGate'

/**
 * #2849: a signed-in, character-less account had no route that didn't bounce
 * to `/characters/create` — including `/settings`, which is where the app's
 * only sign-out control lives. Pins both halves of the fix: `/settings` (and
 * `/characters/create`) must stay reachable, and every other route must keep
 * bouncing. A test overlooking either half is exactly how the trap shipped —
 * two correct-looking changes (the redirect, and moving sign-out into
 * Settings) meeting with nothing between them.
 */
describe('needsCharacterRedirect', () => {
  it('does not bounce a character-less account away from /settings', () => {
    expect(needsCharacterRedirect(false, true, false, '/settings')).toBe(false)
  })

  it('does not bounce a character-less account away from /characters/create', () => {
    expect(needsCharacterRedirect(false, true, false, '/characters/create')).toBe(false)
  })

  it('still bounces a character-less account away from every other route', () => {
    for (const pathname of ['/', '/tasks', '/praxis', '/leaderboard', '/factions', '/updates']) {
      expect(needsCharacterRedirect(false, true, false, pathname)).toBe(true)
    }
  })

  it('never bounces a character-less account while still loading', () => {
    expect(needsCharacterRedirect(true, true, false, '/tasks')).toBe(false)
  })

  it('never bounces a signed-out visitor', () => {
    expect(needsCharacterRedirect(false, false, false, '/tasks')).toBe(false)
  })

  it('never bounces an account that already has a character', () => {
    expect(needsCharacterRedirect(false, true, true, '/tasks')).toBe(false)
    expect(needsCharacterRedirect(false, true, true, '/settings')).toBe(false)
  })
})
