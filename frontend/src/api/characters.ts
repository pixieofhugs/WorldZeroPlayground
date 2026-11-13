import { apiGet, apiPost, apiPut, apiDelete } from './client'
import type { components } from './generated/schema'
import type { CharacterOut } from './auth'

export type { CharacterOut }

export interface CharacterCreate {
  /** Server derives a unique @handle from display_name when omitted (ADR-0019). */
  username?: string
  display_name: string
  bio?: string
  /** 140-char profile slogan, distinct from `bio` (#1628). Server defaults "". */
  tagline?: string
  avatar_url?: string
  location?: string
  /**
   * Omit to be born unaffiliated ("na"). Must be a slug the account is invited
   * to; never "albescent". Enforced server-side (ADR-0019).
   */
  faction_slug?: string
}

export type CharacterUpdate = components['schemas']['CharacterUpdate']

export async function listCharacters(params?: {
  search?: string
  faction?: string
  /** Invite-search pre-filter (#320). */
  exclude_active_task_id?: number
  /**
   * Hide the caller's own lives (ADR-0041), resolved server-side; no-op when
   * anonymous. Leave unset (not `false`) to keep the public request shape.
   */
  exclude_own_account?: boolean
  limit?: number
}): Promise<CharacterOut[]> {
  const { data } = await apiGet('/characters', { params: { query: params } })
  return data
}

export async function getCharacter(id: number): Promise<CharacterOut> {
  const { data } = await apiGet('/characters/{character_id}', {
    params: { path: { character_id: id } },
  })
  return data
}

export async function createCharacter(body: CharacterCreate): Promise<CharacterOut> {
  const { data } = await apiPost('/characters', {
    // ponytail (#1400): generator makes defaulted request fields (`bio`,
    // `avatar_url`, `location`) required; the server accepts `{display_name}`
    // alone. Upgrade: regen request bodies with defaults optional
    // (`scripts/regen_api_client.py`), then drop this cast.
    body: body as components['schemas']['CharacterCreate'],
  })
  return data
}

export async function updateCharacter(id: number, body: CharacterUpdate): Promise<CharacterOut> {
  const { data } = await apiPut('/characters/{character_id}', {
    params: { path: { character_id: id } },
    body,
  })
  return data
}

/** Soft-delete an owned life (204); the active life re-resolves on the next /auth/me. */
export async function deleteCharacter(id: number): Promise<void> {
  await apiDelete('/characters/{character_id}', { params: { path: { character_id: id } } })
}

/** Multipart cast: see `uploadPraxisMedia` in `./praxis`; pinned by `__tests__/avatarUpload.test.ts`. */
export async function uploadCharacterAvatar(id: number, file: File): Promise<CharacterOut> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await apiPost('/characters/{character_id}/avatar', {
    params: { path: { character_id: id } },
    body: form as unknown as { file: string },
  })
  return data
}
