/**
 * The onboarding flow's memory of its own place, across an OAuth round trip.
 *
 * `backend/routers/auth.py::_signed_in_redirect` sends every successful callback
 * to `settings.FRONTEND_URL` — a constant. So a player who taps a provider from
 * the onboarding auth card comes back at `/`, not at the card they left. This
 * module is the whole of how they get back: the flow writes a mark before it
 * navigates away, `RootLanding` reads it once the session answers, and the flow
 * clears it on its next mount.
 *
 * DELIBERATELY CLIENT-SIDE AND OPAQUE. Nothing rides on the wire: no query
 * parameter, no return-to path, no backend redirect target. There is exactly one
 * possible destination — the terms card — so the mark is a boolean, and a
 * tampered value can only ever mean "show the terms again", which a scan does
 * anyway.
 *
 * WHY IT CANNOT STRAND ANYONE
 * ---------------------------
 * - `sessionStorage`, so it dies with the tab.
 * - `RootLanding` acts on it only when a session exists, and the flow clears it
 *   on mount — so it can send a viewer to the flow at most once.
 * - Where it sends them is not a trap: every card keeps a look-around escape,
 *   and agreeing again is one click that the append-only consent log absorbs.
 * - A visitor who lands at `/` without it just gets `/`.
 *
 * Every access is wrapped: `sessionStorage` throws in some privacy modes, and is
 * simply absent under the DOM-less test harness and any SSR-shaped render. A
 * refusal degrades to "no mark", which costs the resume and nothing else.
 */
export const ONBOARDING_HANDOFF_KEY = 'wz_onboarding_handoff'

/** Called immediately before the flow hands the browser to a provider. */
export function markOnboardingHandoff(): void {
  try {
    sessionStorage.setItem(ONBOARDING_HANDOFF_KEY, 'true')
  } catch {
    // Storage refused. The player lands at `/` signed in and browses from
    // there — the pre-resume behaviour, not a broken one.
  }
}

/** Whether this tab left the flow for a provider and has not been back since. */
export function onboardingHandoffPending(): boolean {
  try {
    return sessionStorage.getItem(ONBOARDING_HANDOFF_KEY) === 'true'
  } catch {
    return false
  }
}

/** Forget the mark. The flow does this on mount, having already read it. */
export function clearOnboardingHandoff(): void {
  try {
    sessionStorage.removeItem(ONBOARDING_HANDOFF_KEY)
  } catch {
    // Nothing was stored if the write refused, so nothing needs removing.
  }
}
