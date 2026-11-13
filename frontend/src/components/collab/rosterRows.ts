/**
 * The roster's row model (#1416): `members[]` and `invites[]` merged into one
 * ordered list, four states:
 *
 *   filed    — a `members[]` row with has_submitted === true
 *   accepted — a `members[]` row with has_submitted === false
 *   invited  — an `invites[]` row with status === 'pending'
 *   declined — an `invites[]` row with status === 'declined'
 *
 * Keep this a leaf, like `collabGate.ts` (#1397): no component imports.
 */
import type { PraxisInviteOut, PraxisMemberOut } from '../../api/praxis'

export type RosterRowState = 'filed' | 'accepted' | 'invited' | 'declined'

export interface RosterRow {
  /** Prefixed: member and invite ids overlap. */
  key: string
  state: RosterRowState
  name: string
  /**
   * Raw wire path (`RosterAvatar` calls `mediaUrl()`); `''` draws the monogram.
   * Normalises `character_avatar_url` / `invitee_avatar_url`. Invite rows carry
   * a face too: the ring is the state, the face is the person (#2318).
   */
  avatarUrl: string
  /** For nudge and kick (character id, `nudged_at`). Undefined for invite rows. */
  member?: PraxisMemberOut
  /** For the rescind × (#421). Undefined for member rows. */
  invite?: PraxisInviteOut
}

/**
 * Members first, then invites in server order. An invite outlives its answer:
 *
 *  - Drop invites whose invitee is already a member (accepting doesn't delete it).
 *  - Newest wins per invitee, so a re-invite reads Invited, not a stale refusal.
 *    `created_at` orders; the monotonic id breaks same-second ties.
 */
export function buildRosterRows(
  members: readonly PraxisMemberOut[],
  invites: readonly PraxisInviteOut[] | undefined,
): RosterRow[] {
  const memberIds = new Set(members.map((member) => member.character_id))
  const newestByInvitee = new Map<number, PraxisInviteOut>()

  for (const invite of invites ?? []) {
    if (invite.status !== 'pending' && invite.status !== 'declined') continue
    if (memberIds.has(invite.invitee_id)) continue
    const held = newestByInvitee.get(invite.invitee_id)
    if (held == null || isNewer(invite, held)) {
      newestByInvitee.set(invite.invitee_id, invite)
    }
  }

  return [
    ...members.map(
      (member): RosterRow => ({
        key: `m-${member.id}`,
        state: member.has_submitted ? 'filed' : 'accepted',
        name: member.character_display_name,
        avatarUrl: member.character_avatar_url,
        member,
      }),
    ),
    ...[...newestByInvitee.values()].map(
      (invite): RosterRow => ({
        key: `i-${invite.id}`,
        state: invite.status === 'pending' ? 'invited' : 'declined',
        name: invite.invitee_display_name,
        avatarUrl: invite.invitee_avatar_url,
        invite,
      }),
    ),
  ]
}

function isNewer(candidate: PraxisInviteOut, held: PraxisInviteOut): boolean {
  if (candidate.created_at !== held.created_at) {
    return candidate.created_at > held.created_at
  }
  return candidate.id > held.id
}

/** The only state painted as complete. */
export function isRowDone(state: RosterRowState): boolean {
  return state === 'filed'
}

/**
 * Two-letter monogram for the avatar.
 *
 * Display names are free text, so this strips anything that is not a letter or
 * a digit before splitting: `J.R. Tolkien` reads JT, not `J.T`. A single word
 * gives its first two characters (`Molly` → MO) because one letter in a 34px
 * circle reads as an accident. `?` is the empty case — a blank circle looks like
 * a rendering failure, and a display name is never blank on the wire, so this is
 * a floor rather than a state anyone should see.
 *
 * ponytail: no per-script handling. `toUpperCase()` is the whole
 * internationalisation story, which is right for Latin and Cyrillic and wrong
 * for scripts with no case and for names where the meaningful unit is not the
 * first grapheme. The upgrade path is `Intl.Segmenter`, once a name in the wild
 * actually breaks.
 */
export function rosterInitials(name: string | null | undefined): string {
  const words = (name ?? '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}
