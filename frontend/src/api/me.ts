import { apiGet, apiPost } from './client'
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

/** Fallback name when the server's own `Content-Disposition` is unreadable. */
const FALLBACK_EXPORT_FILENAME = 'world-zero-export.zip'

/**
 * The filename the server chose, out of `Content-Disposition`.
 *
 * Exported for its test: this is a header parse, and a header parse that
 * silently returns the wrong thing produces a file called `export` with no
 * extension, which Windows will not open.
 *
 * The header is cross-origin, so it is only readable at all because
 * `backend/main.py` names it in the CORS `expose_headers`. A deployment that
 * drops it — a proxy, a same-origin future — gets the fallback rather than a
 * broken download.
 */
export function exportFilename(disposition: string | null): string {
  return disposition?.match(/filename="([^"]+)"/)?.[1] ?? FALLBACK_EXPORT_FILENAME
}

/**
 * Everything on the account, as a zip, built while the caller waits (#2158).
 *
 * `parseAs: 'blob'` because the body is a file. Without it the transport parses
 * the response as JSON and a perfectly good archive arrives as a syntax error.
 */
export async function exportMyData(): Promise<{ blob: Blob; filename: string }> {
  const { data, response } = await apiGet('/me/export', { parseAs: 'blob' })
  return {
    blob: data,
    filename: exportFilename(response.headers.get('content-disposition')),
  }
}
