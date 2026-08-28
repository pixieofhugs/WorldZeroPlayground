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

/**
 * The OAuth legs `backend/routers/auth.py` registers, in the order they are
 * offered.
 *
 * Hardcoded rather than server-driven (#1773): both providers' credentials are
 * mandatory `Settings` fields with no defaults, so a backend that booted has
 * both — a capability endpoint could only ever answer "yes, both".
 */
export type AuthProvider = 'google' | 'discord'

/**
 * Redirect the browser to start `provider`'s OAuth flow.
 *
 * A full navigation, not a request — which is also why the failing half of
 * that flow cannot answer with JSON. The callback redirects back to `/` with
 * `?login=<ErrorCode>`; `pages/Home.tsx` renders it.
 */
export function loginWith(provider: AuthProvider): void {
  window.location.href = `${import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}/auth/${provider}`
}

// ---------------------------------------------------------------------------
// The email-less lanes (ADR-0088). Unlike loginWith these are XHR, not full
// navigations: the answer is a Set-Cookie plus a small body, and any failure
// is an ApiError the caller renders via extractError — same as every other
// apiPost in the app.
// ---------------------------------------------------------------------------

export type SessionOut = components['schemas']['SessionOut']
export type AtprotoChallengeOut = components['schemas']['AtprotoChallengeOut']
export type KeyChallengeOut = components['schemas']['KeyChallengeOut']

/** Handle/DID + app password. The password dies at the organ; see services/atproto_identity.py. */
export async function atprotoLogin(identifier: string, password: string): Promise<SessionOut> {
  const { data } = await apiPost('/auth/atproto', { body: { identifier, password } })
  return data
}

/** Zero-credential lane: the organ issues a token to post from the account's own feed. */
export async function atprotoChallengeStart(handle: string): Promise<AtprotoChallengeOut> {
  const { data } = await apiPost('/auth/atproto/challenge', { body: { handle } })
  return data
}

export async function atprotoChallengeVerify(handle: string, token: string): Promise<SessionOut> {
  const { data } = await apiPost('/auth/atproto/challenge/verify', { body: { handle, token } })
  return data
}

/** The key lane's challenge: `message` is the exact text to sign (see auth/keyLane.ts). */
export async function keyChallenge(publicKey: string): Promise<KeyChallengeOut> {
  const { data } = await apiPost('/auth/key/challenge', { body: { public_key: publicKey } })
  return data
}

export async function keyVerify(publicKey: string, signature: string): Promise<SessionOut> {
  const { data } = await apiPost('/auth/key/verify', {
    body: { public_key: publicKey, signature },
  })
  return data
}

/** Attach a key to the signed-in account — the other birth, and also proven:
 *  the signature must answer a live challenge message (see auth/keyLane.ts). */
export async function keyRegister(publicKey: string, signature: string): Promise<SessionOut> {
  const { data } = await apiPost('/auth/key/register', {
    body: { public_key: publicKey, signature },
  })
  return data
}

/**
 * The one thing the returning-player consent gate is told (#2162): the date the
 * account was deleted. A date, not a timestamp — the backend truncates it.
 */
export type ReturningPlayerOut = components['schemas']['ReturningPlayerOut']

/**
 * The interrupted sign-in waiting on an answer, or a rejection if there is none.
 *
 * NO ARGUMENTS, and there is nothing the caller could pass: the identity lives
 * in the signed session cookie the OAuth callback parked it in, never in a URL.
 * A 404 means the gate has nothing behind it — walked into by typing the
 * address, or come back to after the ten-minute window lapsed — and the caller's
 * move either way is to send the visitor to `/start` to begin a sign-in.
 */
export async function getReturningPlayer(): Promise<ReturningPlayerOut> {
  const { data } = await apiGet('/auth/returning-player')
  return data
}

/**
 * Consent to start fresh. Sets the session cookie and clears the tombstone.
 *
 * Explicitly NOT a restore, and there is nothing to restore: deletion blanked
 * the characters, praxis, votes and comments (ADR-0081). What comes back is a
 * brand-new account on the same provider identity, so the caller must refetch
 * `/auth/me` afterwards — this returns an acknowledgement, not a session.
 */
export async function startFresh(): Promise<void> {
  await apiPost('/auth/returning-player')
}

/** Dev-only: log in as a test account without Google OAuth */
export async function devLogin(): Promise<void> {
  await apiPost('/auth/dev-login')
}
