import { apiPost } from './client'
import type { components } from './generated/schema'

export type TermsAcceptanceOut = components['schemas']['TermsAcceptanceOut']

/**
 * Append to the consent log. No body on purpose: the version is the server's
 * constant, so a client can't claim wording it wasn't shown. Re-accepting is a
 * new event (append-only; `docs/spec/SPEC-onboarding.md` § Coming back).
 */
export async function acceptTerms(): Promise<TermsAcceptanceOut> {
  const { data } = await apiPost('/terms/acceptance')
  return data
}
