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

export interface FactionPageOut {
  current_faction_slug: string
  all_factions: FactionStatusOut[]
}

export interface InvitationLetterOut {
  faction_slug: string
  delivered_at: string
}

export async function getFactions(): Promise<FactionOut[]> {
  const res = await api.get<FactionOut[]>('/factions')
  return res.data
}

export async function getFactionStatus(): Promise<FactionPageOut> {
  const res = await api.get<FactionPageOut>('/factions/status')
  return res.data
}

export async function getInvitations(): Promise<InvitationLetterOut[]> {
  const res = await api.get<InvitationLetterOut[]>('/factions/invitations')
  return res.data
}

export async function chooseFaction(factionSlug: string): Promise<FactionOut> {
  const res = await api.post<FactionOut>('/factions/choose', { faction_slug: factionSlug })
  return res.data
}
