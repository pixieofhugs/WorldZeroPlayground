import { apiPost } from './client'
import type { components } from './generated/schema'

/** The receipt for one acceptance: the version agreed to, and when. */
export type TermsAcceptanceOut = components['schemas']['TermsAcceptanceOut']

/**
 * Append one row to the consent log for the signed-in account.
 *
 * NO ARGUMENTS, ON PURPOSE. The route takes no request body: the accepted
 * version is the server's constant, so a client cannot claim to have agreed to
 * wording it was never shown. The version it *was* shown comes back in the
 * response.
 *
 * Accepting twice is not an error and not a duplicate — the log is append-only
 * and a scan always re-runs the terms card (`docs/spec/SPEC-onboarding.md`
 * § Coming back), so a second agreement is a second event.
 */
export async function acceptTerms(): Promise<TermsAcceptanceOut> {
  const { data } = await apiPost('/terms/acceptance')
  return data
}
