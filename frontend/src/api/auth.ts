import api from './axios'

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
  /** "active" | "paused" | "banned" — the roster includes paused lives (#270). */
  status: string
  created_at: string
}

export interface CurrentUser {
  account_id: number
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
}

export async function getMe(): Promise<CurrentUser> {
  const { data } = await api.get<CurrentUser>('/auth/me')
  return data
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout')
}

/** Redirect the browser to start the Google OAuth flow */
export function loginWithGoogle(): void {
  window.location.href = `${import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}/auth/google`
}

/** Dev-only: log in as a test account without Google OAuth */
export async function devLogin(): Promise<void> {
  await api.post('/auth/dev-login')
}
