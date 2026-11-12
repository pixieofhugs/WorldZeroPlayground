/**
 * The flow's memory across the OAuth round trip (#1861); both failure
 * directions are silent. Node has no `sessionStorage`, like a private window,
 * so "absent" is a real case.
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

    // A boolean, not a URL: a tampered value can only mean "show the terms".
    expect([...store.entries()]).toEqual([['wz_onboarding_handoff', 'true']])
  })

  it('reads as "no mark" when storage is absent or refuses', () => {
    // No stub: `sessionStorage` is undefined, as in a locked-down browser.
    expect(() => markOnboardingHandoff()).not.toThrow()
    expect(() => clearOnboardingHandoff()).not.toThrow()
    expect(onboardingHandoffPending()).toBe(false)
  })
})
