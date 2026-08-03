import { apiGet, apiPost } from './client'
import type { components } from './generated/schema'
import { noteEraStamp } from '../utils/cacheEpoch'

/** A badge the character currently holds (ADR-0033). Evaluated on read by the
 *  backend; the image is a bundled frontend asset mapped by `key`. */
export type BadgeOut = components['schemas']['BadgeOut']

/**
 * A life, as every read surface sees it.
 *
 * Field notes the generated type has nowhere to put:
 *
 * - `bio`, `avatar_url`, `location`, `faction_slug` are `string`, never null.
 *   All four are `nullable=False, server_default=…` on `Character`, so absence
 *   is spelled `''` (`''`, `''`, `''`) and `'na'` — unaffiliated is a slug, not
 *   a missing one (ADR-0030). The hand-written mirror this replaced claimed
 *   `| null` for all four and was over-permissive about every one.
 * - `status` is `"active" | "banned"` (`CharacterStatus`). The roster is every
 *   life of the account with banned excluded (#270), which since #1550 is
 *   simply the active ones — `paused` was deleted, nothing ever wrote it.
 * - `badges` is evaluated on read (ADR-0033). Populated by GET
 *   /characters/{id} and, since #655, by the leaderboard list serializer
 *   (batched in one query). `[]` elsewhere, never absent.
 * - `invitations` holds the faction slugs this life has a current-era
 *   invitation letter for (#243). Populated only by /auth/me (the carried
 *   life); the InvitationWatcher diffs it to fire a recruitment-prospectus
 *   popup. `[]` elsewhere.
 */
export type CharacterOut = components['schemas']['CharacterOut']

/**
 * The caller's own account, as `/auth/me` answers it.
 *
 * `character` is null, not absent, when the account carries no life.
 *
 * Everything from `can_create_additional_character` down is a server-computed
 * capability flag: drive UI off these instead of comparing `character.level`,
 * and never hardcode the numbers behind them. Admin short-circuits the
 * propose/see flags to true. Three groups worth naming:
 *
 * - `albescent_revealed` is the sticky secret-society reveal (ADR-0027, #390):
 *   true once any character on this account has ever joined Albescent, gating
 *   the real faction page vs. the sealed placeholder at /factions/albescent.
 * - `second_character_level_required` is the FieldDesk locked-dossier gate copy
 *   (#270/#274).
 * - `level_jump_reach` / `level_jump_available` are the faction level-jump
 *   allowance (#811): reach = levels above own level this faction grants (0 =
 *   no such ability, so hide the affordance entirely); available = the
 *   allowance is unspent at the character's current level. Read these
 *   config-backed fields — never a `slug === 'wow'` branch.
 */
export type CurrentUser = components['schemas']['CurrentUser']

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
