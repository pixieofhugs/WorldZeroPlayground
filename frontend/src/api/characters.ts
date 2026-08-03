import { apiGet, apiPost, apiPut, apiDelete } from './client'
import type { components } from './generated/schema'
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
    // ponytail (#1400): the generated request type demands `bio`, `avatar_url`
    // and `location`, which this payload legitimately omits.
    //
    // The backend declares all three `Field(default="")`, and openapi-typescript
    // reads "has a default" as "always present" — a rule that is right for a
    // RESPONSE and backwards for a request body, where a default is precisely
    // what makes a field omissible. The server accepts `{display_name}` alone
    // today and `buildCreatePayload` sends exactly that.
    //
    // Upgrade path: generate request bodies with defaults left optional (a flag
    // on the shared `scripts/regen_api_client.py`, which regenerates the schema
    // for every module at once), then drop this cast.
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

/** Soft-delete an owned character (DELETE /characters/{id}, 204). Server rejects
 *  deleting someone else's life; the account's active life is re-resolved on the
 *  next /auth/me refetch. */
export async function deleteCharacter(id: number): Promise<void> {
  await apiDelete('/characters/{character_id}', { params: { path: { character_id: id } } })
}

/**
 * The one multipart call in the app.
 *
 * `openapi-fetch`'s default body serializer returns a `FormData` untouched and
 * leaves Content-Type unset, so the platform writes the boundary — verified, not
 * assumed, in `__tests__/avatarUpload.test.ts`, because a serializer that chose
 * to `JSON.stringify` this would send `{}` and fail only at runtime.
 *
 * The cast is the schema's limit, not a shortcut: `openapi-typescript` renders
 * `format: binary` as `string`, so the generated body type is `{ file: string }`
 * — the shape of the multipart FIELD, which no `FormData` can ever satisfy.
 *
 * Spelled as the literal rather than as the generated alias, deliberately (the
 * review of #1622). The literal is the STRICTER of the two: it has to stay
 * assignable to whatever the schema says this body is, so a renamed or added
 * form field fails `tsc` right here. The alias is assignable to itself by
 * construction and would follow the wire silently wherever it went.
 */
export async function uploadCharacterAvatar(id: number, file: File): Promise<CharacterOut> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await apiPost('/characters/{character_id}/avatar', {
    params: { path: { character_id: id } },
    body: form as unknown as { file: string },
  })
  return data
}
