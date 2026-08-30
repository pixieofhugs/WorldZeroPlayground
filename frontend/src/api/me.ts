import { apiDelete, apiGet, apiPost } from './client'
import type { CharacterOut, CurrentUser } from './auth'

/** The account's own roster — every life but the banned ones, carried life
 *  first (#270). It used to read "active + paused"; `paused` is gone (#1550). */
export async function getMyCharacters(): Promise<CharacterOut[]> {
  const { data } = await apiGet('/me/characters')
  return data
}

/** Carry a different owned, active life; returns the refreshed current user (#270). */
export async function setActiveCharacter(characterId: number): Promise<CurrentUser> {
  const { data } = await apiPost('/me/active-character', { body: { character_id: characterId } })
  return data
}

/** Faction slugs the account holds a current-era invitation for (empty until #272). */
export async function getInvitedFactions(): Promise<string[]> {
  const { data } = await apiGet('/me/invited-factions')
  return data
}

/**
 * End this account for good (#2160/#2161): every row tombstoned, every media
 * item unlinked (ADR-0081). 204, no body, and no undo.
 *
 * The JWT the browser still holds is inert the moment this returns —
 * `get_current_account` refuses an account that is not `active` — so the caller
 * still owes a `POST /auth/logout` to clear the cookie, exactly like any other
 * sign-out. The confirmation is the client's: see
 * `pages/settings/deleteAccount.ts`.
 */
export async function deleteMyAccount(): Promise<void> {
  await apiDelete('/me/account')
}
