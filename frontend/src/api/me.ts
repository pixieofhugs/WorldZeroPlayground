import api from './axios'
import type { CharacterOut, CurrentUser } from './auth'

/** The account's own roster — every life but the banned ones, carried life
 *  first (#270). It used to read "active + paused"; `paused` is gone (#1550). */
export async function getMyCharacters(): Promise<CharacterOut[]> {
  const { data } = await api.get<CharacterOut[]>('/me/characters')
  return data
}

/** Carry a different owned, active life; returns the refreshed current user (#270). */
export async function setActiveCharacter(characterId: number): Promise<CurrentUser> {
  const { data } = await api.post<CurrentUser>('/me/active-character', { character_id: characterId })
  return data
}

/** Faction slugs the account holds a current-era invitation for (empty until #272). */
export async function getInvitedFactions(): Promise<string[]> {
  const { data } = await api.get<string[]>('/me/invited-factions')
  return data
}
