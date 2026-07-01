import api from './axios'
import type { CharacterOut } from './auth'

export type { CharacterOut }

export interface CharacterCreate {
  /** Optional — the server derives a unique @handle from display_name when omitted (ADR-0019). */
  username?: string
  display_name: string
  bio?: string
  avatar_url?: string
  location?: string
  /**
   * Optional starting faction (ADR-0019). Omit to be born unaffiliated ("na"). A
   * provided slug must be one the account holds an invitation for; "albescent" is
   * never a creation option. All enforced server-side.
   */
  faction_slug?: string
}

export interface CharacterUpdate {
  display_name?: string
  bio?: string
  avatar_url?: string
  location?: string
}

export async function listCharacters(params?: {
  search?: string
  faction?: string
  /** Hide players already active on this task (invite-search pre-filter, #320). */
  exclude_active_task_id?: number
  limit?: number
}): Promise<CharacterOut[]> {
  const { data } = await api.get<CharacterOut[]>('/characters', { params })
  return data
}

export async function getCharacter(id: number): Promise<CharacterOut> {
  const { data } = await api.get<CharacterOut>(`/characters/${id}`)
  return data
}

export async function createCharacter(body: CharacterCreate): Promise<CharacterOut> {
  const { data } = await api.post<CharacterOut>('/characters', body)
  return data
}

export async function updateCharacter(id: number, body: CharacterUpdate): Promise<CharacterOut> {
  const { data } = await api.put<CharacterOut>(`/characters/${id}`, body)
  return data
}

export async function uploadCharacterAvatar(id: number, file: File): Promise<CharacterOut> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<CharacterOut>(`/characters/${id}/avatar`, form)
  return data
}

export async function getVotesReceived(characterId: number): Promise<{ character_id: number; votes_received: number }> {
  const { data } = await api.get<{ character_id: number; votes_received: number }>(`/characters/${characterId}/stats/votes-received`)
  return data
}
