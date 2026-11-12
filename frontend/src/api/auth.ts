import { apiGet, apiPost } from './client'
import { API_BASE_URL } from './baseUrl'
import type { components } from './generated/schema'
import { noteEraStamp } from '../utils/cacheEpoch'

/** Evaluated on read (ADR-0033); the image is a frontend asset keyed by `key`. */
export type BadgeOut = components['schemas']['BadgeOut']

/**
 * - `bio`, `avatar_url`, `location`, `faction_slug` are never null: absence
 *   is `''`, and unaffiliated is the slug `'na'` (ADR-0030).
 * - `badges`: populated by GET /characters/{id} and the leaderboard; `[]`
 *   elsewhere, never absent.
 * - `invitations`: faction slugs with a current-era letter (#243); only on
 *   /auth/me, diffed by InvitationWatcher. `[]` elsewhere.
 */
export type CharacterOut = components['schemas']['CharacterOut']

/**
 * `character` is null, not absent, with no life. Fields from
 * `can_create_additional_character` down are server-computed capability
 * flags: drive UI off them, never off `character.level` (admin short-circuits
 * propose/see flags to true).
 *
 * - `albescent_revealed`: sticky once any character joined Albescent (ADR-0027).
 * - `level_jump_reach`: 0 = no such ability, hide the affordance;
 *   `level_jump_available` = unspent at current level (#811). Config-backed —
 *   never a `slug === 'wow'` branch.
 */
export type CurrentUser = components['schemas']['CurrentUser']

export async function getMe(): Promise<CurrentUser> {
  const { data } = await apiGet('/auth/me')
  // Earliest, most frequent era stamp (ADR-0072); a mismatch drops the cache.
  noteEraStamp(data.era_name)
  return data
}

export async function logout(): Promise<void> {
  await apiPost('/auth/logout')
}

/** Hardcoded (#1773): both providers' credentials are mandatory, so a running backend has both. */
export type AuthProvider = 'google' | 'discord'

/**
 * A full navigation. Failure redirects to `/?login=<ErrorCode>`, rendered by
 * `pages/Home.tsx`.
 */
export function loginWith(provider: AuthProvider): void {
  window.location.href = `${API_BASE_URL}/auth/${provider}`
}

/** Deletion date for the returning-player gate (#2162); a date, not a timestamp. */
export type ReturningPlayerOut = components['schemas']['ReturningPlayerOut']

/**
 * No args: the identity is in the signed session cookie. A 404 means nothing
 * is pending (typed URL or the ten-minute window lapsed); send them to `/start`.
 */
export async function getReturningPlayer(): Promise<ReturningPlayerOut> {
  const { data } = await apiGet('/auth/returning-player')
  return data
}

/**
 * Not a restore: deletion blanked everything (ADR-0081). A brand-new account on
 * the same identity; caller must refetch `/auth/me`.
 */
export async function startFresh(): Promise<void> {
  await apiPost('/auth/returning-player')
}

/** Dev-only: log in as a test account without Google OAuth */
export async function devLogin(): Promise<void> {
  await apiPost('/auth/dev-login')
}
