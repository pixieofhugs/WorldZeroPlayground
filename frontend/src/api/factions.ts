import api from './axios'

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

export async function chooseFaction(factionSlug: string): Promise<FactionOut> {
  const res = await api.post<FactionOut>('/factions/choose', { faction_slug: factionSlug })
  return res.data
}
