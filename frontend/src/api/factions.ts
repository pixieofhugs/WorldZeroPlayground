import { apiGet, apiPost } from './client'
import type { components } from './generated/schema'
import type { CurrentUser } from './auth'
import { dropAllCaches } from '../utils/cacheEpoch'
import { notifyRequestsChanged } from '../utils/requestsBus'

// Slug + status only (ADR-0038); words via factionName/factionDescription in utils/factions.
export type FactionOut = components['schemas']['FactionOut']

export type FactionStatusOut = components['schemas']['FactionStatusOut']

export type InvitationLetterOut = components['schemas']['InvitationLetterOut']

/** `invitations` arrives with the status map (#1384). */
export type FactionPageOut = components['schemas']['FactionPageOut']

export async function getFactions(): Promise<FactionOut[]> {
  const { data } = await apiGet('/factions')
  return data
}

export async function getFactionStatus(): Promise<FactionPageOut> {
  const { data } = await apiGet('/factions/status')
  return data
}

/**
 * Join or defect; answers the refreshed `CurrentUser` for `applyUser()` (#1383).
 * Rings the bus here, for all four join surfaces: see
 * `__tests__/factionJoinNotifiesRequestsBus.test.ts` (#2288).
 */
export async function chooseFaction(factionSlug: string): Promise<CurrentUser> {
  const { data } = await apiPost('/factions/choose', { body: { faction_slug: factionSlug } })
  // `GET /factions` hides Albescent until revealed (ADR-0027) and is held all
  // session (ADR-0072), so a join must drop it.
  dropAllCaches()
  notifyRequestsChanged()
  return data
}
