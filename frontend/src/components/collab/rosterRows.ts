/**
 * The roster's row model, as pure functions (#1416).
 *
 * The roster used to draw `members[]` only, with a boolean pill: submitted or
 * not. Invited people were not in it at all — pending invites were dashed chips
 * drawn OUTSIDE it by `InviteSearch`, and declined invites were filtered away
 * everywhere. That split meant the one question the block exists to answer —
 * "who is on this praxis and where are they up to?" — was spread across two
 * unrelated widgets and one silent deletion.
 *
 * So the roster merges two arrays into one ordered list of rows, each in one of
 * four states:
 *
 *   filed    — a `members[]` row with has_submitted === true
 *   accepted — a `members[]` row with has_submitted === false
 *   invited  — an `invites[]` row with status === 'pending'
 *   declined — an `invites[]` row with status === 'declined'
 *
 * KEEP THIS MODULE A LEAF, for the same measured reason `collabGate.ts` is one
 * (#1397): types in, plain data out, no component imports. The test file reaches
 * these directly so it never drags `ConfirmDialog` and eight factions of confirm
 * copy into a unit test of a string function.
 */
import type { PraxisInviteOut, PraxisMemberOut } from '../../api/praxis'

/** The four readings a roster row can carry. */
export type RosterRowState = 'filed' | 'accepted' | 'invited' | 'declined'

export interface RosterRow {
  /** React key. Members and invites have overlapping ids, so it is prefixed. */
  key: string
  state: RosterRowState
  name: string
  /**
   * The person's portrait, as the raw wire path — `RosterAvatar` calls
   * `mediaUrl()` itself. `''` means "draw the monogram", which is the ordinary
   * case for an account that never uploaded one.
   *
   * Normalised here for the same reason `name` is: a member calls it
   * `character_avatar_url` and an invite calls it `invitee_avatar_url`, and the
   * row is what spares every consumer that difference. An INVITED or DECLINED
   * row carries a face too — the dashed ring is the state, the face is the
   * person (#2318).
   */
  avatarUrl: string
  /**
   * The member behind a `filed`/`accepted` row — the nudge button and the kick ×
   * both need the whole record (character id, `nudged_at`), and an invite row
   * has neither. Undefined for `invited`/`declined`.
   */
  member?: PraxisMemberOut
  /**
   * The invite behind an `invited`/`declined` row, for the rescind × (#421).
   * Undefined for `filed`/`accepted`.
   */
  invite?: PraxisInviteOut
}

/**
 * Merge members and invites into the displayed order: members first (the people
 * actually on the praxis), then whoever has been asked, in the order the server
 * sent them.
 *
 * Two dedupe rules, both about the same fact — an invite outlives its answer:
 *
 *  - An invite whose invitee is already a member is dropped. Accepting an invite
 *    does not delete it, so every member of a collab that was invited into it
 *    still has an `accepted` row on the wire; drawing it would list them twice.
 *  - A character can hold a declined invite AND a later pending one. **Newest
 *    wins**, so a re-invited player reads as Invited rather than as a stale
 *    refusal. `created_at` is the order; the id breaks a tie, since it is
 *    monotonic and the timestamps of two invites issued in the same second are
 *    not distinguishable.
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

/** A row that is done — the only state the roster paints as complete. */
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
