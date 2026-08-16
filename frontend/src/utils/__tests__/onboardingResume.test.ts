/**
 * The flow's memory across the OAuth round trip (#1861).
 *
 * Worth pinning because both failure directions are silent. Forget too eagerly
 * and a player who signed in is dropped at `/` with no idea the flow existed;
 * forget too late and a mark left behind by a bailed attempt keeps pulling a
 * later, unrelated sign-in into the onboarding cards.
 *
 * The node test env has no `sessionStorage` at all, which is also the private
 * -mode failure the module is written to survive — so "absent" is a case here,
 * not a gap in the harness.
 */
import { describe, it, expect, afterEach, vi } from 'vitest'

import {
  clearOnboardingHandoff,
  markOnboardingHandoff,
  onboardingHandoffPending,
} from '../onboardingResume'

/** A working `sessionStorage`, and a peek at what actually got written. */
function withStorage(): Map<string, string> {
  const store = new Map<string, string>()
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  })
  return store
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the onboarding handoff mark', () => {
  it('is absent until the flow sets it', () => {
    withStorage()

    expect(onboardingHandoffPending()).toBe(false)
  })

  it('survives from the moment before the provider navigation', () => {
    withStorage()

    markOnboardingHandoff()

    expect(onboardingHandoffPending()).toBe(true)
  })

  it('is gone once consumed, so it can send a browser back at most once', () => {
    withStorage()
    markOnboardingHandoff()

    clearOnboardingHandoff()

    expect(onboardingHandoffPending()).toBe(false)
  })

  it('lives under one session-scoped key and carries no destination', () => {
    const store = withStorage()

    markOnboardingHandoff()

    // A boolean, not a path or a URL. There is exactly one place to resume, so
    // a tampered value can only ever mean "show the terms again" — which a
    // scan does anyway.
    expect([...store.entries()]).toEqual([['wz_onboarding_handoff', 'true']])
  })

  it('reads as "no mark" when storage is absent or refuses', () => {
    // No stub at all: `sessionStorage` is undefined, exactly as it is in a
    // locked-down browser. Nothing throws, and the cost is the resume.
    expect(() => markOnboardingHandoff()).not.toThrow()
    expect(() => clearOnboardingHandoff()).not.toThrow()
    expect(onboardingHandoffPending()).toBe(false)
  })
})
