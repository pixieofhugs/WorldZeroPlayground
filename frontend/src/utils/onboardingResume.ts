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

// Set once the welcome title has played or START was tapped: a later load gets the instant title. Storage that refuses means the full version.
export const TITLE_SEEN_KEY = 'wz-onboarding-title-seen'

export function titleSeen(): boolean {
  try {
    return localStorage.getItem(TITLE_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

export function markTitleSeen(): void {
  try {
    localStorage.setItem(TITLE_SEEN_KEY, '1')
  } catch {
    // Nothing was stored; the full title plays again.
  }
}

// The contract click, held through the redirect; `false` = storage refused, so the contract shows again.
export const HELD_TERMS_KEY = 'wz_terms_accepted'

export function holdTermsAcceptance(): boolean {
  try {
    sessionStorage.setItem(HELD_TERMS_KEY, 'true')
    return true
  } catch {
    return false
  }
}

export function termsAcceptanceHeld(): boolean {
  try {
    return sessionStorage.getItem(HELD_TERMS_KEY) === 'true'
  } catch {
    return false
  }
}

export function clearTermsAcceptance(): void {
  try {
    sessionStorage.removeItem(HELD_TERMS_KEY)
  } catch {
  }
}
