import { apiGet, apiPost } from './client'
import { noteEraStamp } from '../utils/cacheEpoch'

/** A badge the character currently holds (ADR-0033). Evaluated on read by the
 *  backend; the image is a bundled frontend asset mapped by `key`. */
export interface BadgeOut {
  key: string
  name: string
}

export interface CharacterOut {
  id: number
  username: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  location: string | null
  level: number
  score: number
  all_time_score: number
  faction_slug: string | null
  /** "active" | "banned" (`CharacterStatus`). The roster is every life of the
   *  account with banned excluded (#270), which since #1550 is simply the
   *  active ones — `paused` was deleted, nothing ever wrote it. */
  status: string
  created_at: string
  /** Evaluated on read (ADR-0033). Populated by GET /characters/{id} and, since
   *  #655, by the leaderboard list serializer (batched in one query). */
  badges?: BadgeOut[]
  /** Faction slugs this life holds a current-era invitation letter for (#243).
   *  Populated only by /auth/me (the carried life); the InvitationWatcher diffs
   *  it to fire a recruitment-prospectus popup. Empty elsewhere. */
  invitations?: string[]
}

export interface CurrentUser {
  account_id: number
  /** Null, not absent, when the account carries no life. `schemas/auth.py`
   *  declares `character: Optional[CharacterOut] = None`; the key is always
   *  serialized, and since #1400 the generated schema says so too. */
  character: CharacterOut | null
  is_admin: boolean
  // Server-computed capability flags. Admin short-circuits the propose/see
  // flags to true. Drive UI off these instead of comparing character.level.
  can_create_additional_character: boolean
  can_start_as_albescent: boolean
  // Sticky Albescent secret-society reveal (ADR-0027, #390). True once any
  // character on this account has ever joined Albescent; gates the real faction
  // page vs. the sealed placeholder at /factions/albescent.
  albescent_revealed: boolean
  can_propose_task: boolean
  can_propose_metatask: boolean
  can_see_retired_tasks: boolean
  can_see_pending_tasks: boolean
  can_comment: boolean
  // FieldDesk locked-dossier gate copy (#270/#274). Never hardcode the gate number.
  second_character_level_required: number
  era_name: string
  // Faction level-jump allowance (#811). reach = levels above own level this
  // faction grants (0 = no such ability, so hide the affordance entirely);
  // available = the allowance is unspent at the character's current level.
  // Drive UI off these config-backed fields — never a `slug === 'wow'` branch.
  level_jump_reach: number
  level_jump_available: boolean
}

export async function getMe(): Promise<CurrentUser> {
  const { data } = await apiGet('/auth/me')
  // Every signed-in page load gates on this request, which makes it the earliest
  // and most frequent era stamp the client gets (ADR-0072). A disagreement with
  // the era already held drops the whole cache.
  noteEraStamp(data.era_name)
  return data
}

export async function logout(): Promise<void> {
  await apiPost('/auth/logout')
}

/** Redirect the browser to start the Google OAuth flow */
export function loginWithGoogle(): void {
  window.location.href = `${import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}/auth/google`
}

/** Dev-only: log in as a test account without Google OAuth */
export async function devLogin(): Promise<void> {
  await apiPost('/auth/dev-login')
}
