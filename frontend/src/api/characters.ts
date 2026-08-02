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
  /**
   * Hide every life on the caller's own account (ADR-0041), resolved server-side
   * from the bearer token — the duel picker's rule, which it used to re-derive
   * from a second `/me/characters` read (#1385). A no-op when anonymous. Leave
   * unset (not `false`) to keep the request byte-identical to the public form.
   */
  exclude_own_account?: boolean
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

/** Soft-delete an owned character (DELETE /characters/{id}, 204). Server rejects
 *  deleting someone else's life; the account's active life is re-resolved on the
 *  next /auth/me refetch. */
export async function deleteCharacter(id: number): Promise<void> {
  await api.delete(`/characters/${id}`)
}

export async function uploadCharacterAvatar(id: number, file: File): Promise<CharacterOut> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<CharacterOut>(`/characters/${id}/avatar`, form)
  return data
}
