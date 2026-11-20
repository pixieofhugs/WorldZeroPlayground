import { describe, it, expect } from 'vitest'

import { characterRedirectTarget } from '../characterOnboardingGate'

/**
 * #2849: a signed-in, character-less account had no route that didn't bounce
 * to `/characters/create` — including `/settings`, which is where the app's
 * only sign-out control lives. Pins both halves of the fix: `/settings` (and
 * `/characters/create`) must stay reachable, and every other route must keep
 * bouncing. A test overlooking either half is exactly how the trap shipped —
 * two correct-looking changes (the redirect, and moving sign-out into
 * Settings) meeting with nothing between them.
 */
describe('characterRedirectTarget with acceptance on file', () => {
  it('does not bounce a character-less account away from /settings', () => {
    expect(characterRedirectTarget(false, true, false, true, '/settings')).toBeNull()
  })

  it('does not bounce a character-less account away from /characters/create', () => {
    expect(characterRedirectTarget(false, true, false, true, '/characters/create')).toBeNull()
  })

  it('still bounces a character-less account away from every other route', () => {
    for (const pathname of ['/tasks', '/praxis', '/leaderboard', '/factions', '/updates']) {
      expect(characterRedirectTarget(false, true, false, true, pathname)).not.toBeNull()
    }
  })

  it('does not send a creation-banned account to the create form', () => {
    expect(characterRedirectTarget(false, true, false, true, '/tasks', false, true)).toBeNull()
    expect(characterRedirectTarget(false, true, false, false, '/tasks', false, true)).toBe('/start')
  })

  it('does not bounce a character-less account away from /start', () => {
    expect(characterRedirectTarget(false, true, false, true, '/start')).toBeNull()
    expect(characterRedirectTarget(false, true, false, true, '/start/again')).toBeNull()
  })

  it('never bounces a character-less account while still loading', () => {
    expect(characterRedirectTarget(true, true, false, true, '/tasks')).toBeNull()
  })

  it('never bounces a signed-out visitor', () => {
    expect(characterRedirectTarget(false, false, false, true, '/tasks')).toBeNull()
  })

  it('never bounces an account that already has a character', () => {
    expect(characterRedirectTarget(false, true, true, true, '/tasks')).toBeNull()
    expect(characterRedirectTarget(false, true, true, true, '/settings')).toBeNull()
  })
})

/** #3468: the contract comes before creation, and `/start` must be reachable to show it. */
describe('characterRedirectTarget', () => {
  it('sends an account with no acceptance to the contract, /characters/create included', () => {
    for (const pathname of ['/tasks', '/characters/create']) {
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

  it('leaves an accepted, character-less account to the flow while the hand-off mark is pending', () => {
    expect(characterRedirectTarget(false, true, false, true, '/', true)).toBeNull()
    expect(characterRedirectTarget(false, true, false, true, '/tasks', true)).toBeNull()
    expect(characterRedirectTarget(false, true, false, true, '/tasks', false)).toBe('/characters/create')
    expect(characterRedirectTarget(false, true, false, false, '/tasks', true)).toBe('/start')
  })

  it('leaves / to the flow, accepted or not', () => {
    expect(characterRedirectTarget(false, true, false, true, '/')).toBeNull()
    expect(characterRedirectTarget(false, true, false, false, '/')).toBeNull()
  })

  it('never fires while loading, signed out, or with a character', () => {
    expect(characterRedirectTarget(true, true, false, false, '/tasks')).toBeNull()
    expect(characterRedirectTarget(false, false, false, false, '/tasks')).toBeNull()
    expect(characterRedirectTarget(false, true, true, false, '/tasks')).toBeNull()
  })
})
