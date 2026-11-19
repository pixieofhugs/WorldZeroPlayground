import { describe, it, expect } from 'vitest'

import { characterRedirectTarget, needsCharacterRedirect } from '../characterOnboardingGate'

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

  it('does not bounce a character-less account away from /start', () => {
    expect(needsCharacterRedirect(false, true, false, '/start')).toBe(false)
    expect(needsCharacterRedirect(false, true, false, '/start/again')).toBe(false)
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

/** #3468: the contract comes before creation, and `/start` must be reachable to show it. */
describe('characterRedirectTarget', () => {
  it('sends an account with no acceptance to the contract, /characters/create included', () => {
    for (const pathname of ['/', '/tasks', '/characters/create']) {
      expect(characterRedirectTarget(false, true, false, false, pathname)).toBe('/start')
    }
  })

  it('lets an account with no acceptance reach the contract, its again card and sign-out', () => {
    for (const pathname of ['/start', '/start/again', '/settings']) {
      expect(characterRedirectTarget(false, true, false, false, pathname)).toBeNull()
    }
  })

  it('sends an accepted, character-less account to creation, and lets it reach /start', () => {
    expect(characterRedirectTarget(false, true, false, true, '/tasks')).toBe('/characters/create')
    expect(characterRedirectTarget(false, true, false, true, '/start')).toBeNull()
    expect(characterRedirectTarget(false, true, false, true, '/characters/create')).toBeNull()
  })

  it('never fires while loading, signed out, or with a character', () => {
    expect(characterRedirectTarget(true, true, false, false, '/tasks')).toBeNull()
    expect(characterRedirectTarget(false, false, false, false, '/tasks')).toBeNull()
    expect(characterRedirectTarget(false, true, true, false, '/tasks')).toBeNull()
  })
})
