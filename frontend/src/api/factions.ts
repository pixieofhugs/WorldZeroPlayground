import api from './axios'
import type { CurrentUser } from './auth'
import { dropAllCaches } from '../utils/cacheEpoch'

// Faction name/description prose is no longer backend-emitted (issue #461): the
// server sends only the slug, and the frozen English words live in the
// factions.json catalog. Resolve display copy with factionName(slug) /
// factionDescription(slug) from utils/factions.
export interface FactionOut {
  slug: string
}

export interface FactionStatusOut {
  slug: string
  status: string // member, invited, not_invited, defected, can_return
}

export interface InvitationLetterOut {
  faction_slug: string
  delivered_at: string
}

export interface FactionPageOut {
  current_faction_slug: string
  all_factions: FactionStatusOut[]
  // #1384: the letters arrive with the status map. `GET /factions/invitations`
  // ran the same query the status map was already built from, and every caller
  // requested the pair, so there is no longer a second endpoint to call.
  invitations: InvitationLetterOut[]
}

export async function getFactions(): Promise<FactionOut[]> {
  const res = await api.get<FactionOut[]>('/factions')
  return res.data
}

export async function getFactionStatus(): Promise<FactionPageOut> {
  const res = await api.get<FactionPageOut>('/factions/status')
  return res.data
}

/**
 * Join or defect to a faction; answers the refreshed `CurrentUser` (#1383).
 *
 * Membership moves the faction slug, the level-jump allowance, the capability
 * flags and the sticky `albescent_revealed` reveal together, and all of those
 * ride on `/auth/me`. The POST now carries that whole object, so callers hand
 * it straight to `applyUser()` instead of chasing it with `refetch()`.
 */
export async function chooseFaction(factionSlug: string): Promise<CurrentUser> {
  const res = await api.post<CurrentUser>('/factions/choose', { faction_slug: factionSlug })
  // `GET /factions` is viewer-scoped: Albescent is omitted until the account has
  // been revealed to it (ADR-0027), and joining is what reveals it. The
  // directory is otherwise deploy-scoped and held for the whole session
  // (ADR-0072), so the reveal has to be answered as the mutation it is — a timer
  // short enough to catch it would defeat the class.
  dropAllCaches()
  return res.data
}
