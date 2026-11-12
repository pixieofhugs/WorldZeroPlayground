/**
 * The onboarding flow's place across an OAuth round trip: the callback always
 * lands on `/` (`_signed_in_redirect`), so the flow marks before leaving,
 * `RootLanding` reads it once signed in, and the flow clears it on mount.
 * A client-side boolean in `sessionStorage`: its only destination is the terms
 * card, so tampering is harmless and it can redirect at most once. Storage can
 * throw or be absent; a refusal just means no resume.
 */
export const ONBOARDING_HANDOFF_KEY = 'wz_onboarding_handoff'

export function markOnboardingHandoff(): void {
  try {
    sessionStorage.setItem(ONBOARDING_HANDOFF_KEY, 'true')
  } catch {
    // Storage refused: the player just lands at `/`.
  }
}

export function onboardingHandoffPending(): boolean {
  try {
    return sessionStorage.getItem(ONBOARDING_HANDOFF_KEY) === 'true'
  } catch {
    return false
  }
}

export function clearOnboardingHandoff(): void {
  try {
    sessionStorage.removeItem(ONBOARDING_HANDOFF_KEY)
  } catch {
    // Nothing was stored if the write refused.
  }
}
