import { apiDelete, apiGet, apiPost } from './client'
import type { CharacterOut, CurrentUser } from './auth'

/** Every life but banned ones, carried life first (#270). */
export async function getMyCharacters(): Promise<CharacterOut[]> {
  const { data } = await apiGet('/me/characters')
  return data
}

/** Returns the refreshed current user (#270). */
export async function setActiveCharacter(characterId: number): Promise<CurrentUser> {
  const { data } = await apiPost('/me/active-character', { body: { character_id: characterId } })
  return data
}

/** Faction slugs with a current-era invitation. */
export async function getInvitedFactions(): Promise<string[]> {
  const { data } = await apiGet('/me/invited-factions')
  return data
}

/** `null` when the carried character has no recognised airport (#3247). */
export async function getNearbyAirports(): Promise<string[] | null> {
  const { data } = await apiGet('/me/nearby-airports')
  return data.codes
}

/**
 * Delete the account for good (ADR-0081): 204, no undo. The JWT is inert
 * after, but the caller still owes `POST /auth/logout` to clear the cookie.
 * Confirmation lives in `pages/settings/deleteAccount.ts`.
 */
export async function deleteMyAccount(): Promise<void> {
  await apiDelete('/me/account')
}

const FALLBACK_EXPORT_FILENAME = 'world-zero-export.zip'

/**
 * Exported for its test: a bad parse yields an extensionless file. The header
 * is readable cross-origin only via CORS `expose_headers` in `backend/main.py`;
 * without it the fallback applies.
 */
export function exportFilename(disposition: string | null): string {
  return disposition?.match(/filename="([^"]+)"/)?.[1] ?? FALLBACK_EXPORT_FILENAME
}

/** Account zip (#2158). `parseAs: 'blob'`, or the archive parses as bad JSON. */
export async function exportMyData(): Promise<{ blob: Blob; filename: string }> {
  const { data, response } = await apiGet('/me/export', { parseAs: 'blob' })
  return {
    blob: data,
    filename: exportFilename(response.headers.get('content-disposition')),
  }
}
