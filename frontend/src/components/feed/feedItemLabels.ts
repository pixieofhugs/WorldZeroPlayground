import type { ActivityFeedItem } from '../../api/activityFeed'
import { requestStatusOf } from '../../hooks/useRespondToRequest'
import i18n from '../../i18n'

/**
 * The chassis's neutral vocabulary (epic #1192 decision 7).
 *
 * Every string here comes from the `feed` catalog, authored once in #1194. The
 * faction sheets are written in dialect ("Tuck away" / "Bin it" / "Spike it" /
 * "rm --event") and NONE of it ships: faction identity is carried by the skin,
 * not the words. Faction issues must not append to or edit these keys.
 */

/**
 * The kicker key for each of the 15 backend feed types, written out rather than
 * interpolated. The catalog is a TYPED resource here, so `` i18n.t(`feed:kicker.
 * ${type}`) `` on an unconstrained string does not compile — and a literal map
 * is the better shape anyway: it is the checklist of the 15, and an unnamed type
 * lands on the fallback instead of printing a raw key at the player.
 */
const KICKER_KEY = {
  friend_completion: 'feed:kicker.friend_completion',
  foe_completion: 'feed:kicker.foe_completion',
  vote_on_mine: 'feed:kicker.vote_on_mine',
  foe_taunt: 'feed:kicker.foe_taunt',
  friend_signup: 'feed:kicker.friend_signup',
  friend_defection: 'feed:kicker.friend_defection',
  global_task: 'feed:kicker.global_task',
  collaborator_submitted: 'feed:kicker.collaborator_submitted',
  awaiting_submission: 'feed:kicker.awaiting_submission',
  nudge: 'feed:kicker.nudge',
  era_announcement: 'feed:kicker.era_announcement',
  invitation_letter: 'feed:kicker.invitation_letter',
  duel_challenge: 'feed:kicker.duel_challenge',
  collab_invite: 'feed:kicker.collab_invite',
  comment_mention: 'feed:kicker.comment_mention',
} as const

/** The two request types the archive can tag "still waiting". The tag is NOT a
 *  property of the type — see {@link isStillWaiting}. */
const REQUEST_TYPES: ReadonlySet<string> = new Set([
  'duel_challenge',
  'collab_invite',
])

/**
 * Is this item an obligation nobody has answered yet?
 *
 * Two conditions, and the second one is the whole of #1342. Archiving never
 * answers anything (ADR-0070), so an archived request is still open — but
 * *answering* it does, and a request archived while pending and accepted a week
 * later kept reading "still waiting" because the tag was keyed on the item's
 * TYPE alone. Since #1301 windowed the live feed to pending requests, the
 * Archived tab is the only place a resolved request appears at all, so that
 * stale tag went from an edge case to the ordinary way you meet one.
 *
 * "Unanswered" is per-type (ADR-0070); for these two it is `status === pending`,
 * read off the source row via the payload's per-type status key. Deliberately
 * NOT the `status` that `useRespondToRequest` returns: that is session-local
 * response state, empty until the viewer clicks in this very session, so it
 * cannot speak for a request answered days ago.
 *
 * A payload missing its status field normalizes to `pending`, which keeps the
 * tag — the safe direction, since over-reporting an obligation is recoverable
 * and silently dropping one is not.
 */
export function isStillWaiting(item: ActivityFeedItem): boolean {
  return REQUEST_TYPES.has(item.type) && requestStatusOf(item) === 'pending'
}

/**
 * The one feed type that cannot be archived. It is *state*, not an event: it
 * exists exactly while `PraxisMember.has_submitted` is false and clears itself
 * the moment you file, so a dismissal would silence a standing obligation
 * forever. The backend refuses it with a 400; the UI must not offer the control
 * at all rather than render it disabled.
 */
export const NON_ARCHIVABLE_TYPES: ReadonlySet<string> = new Set([
  'awaiting_submission',
])

export function isArchivable(item: ActivityFeedItem): boolean {
  return !NON_ARCHIVABLE_TYPES.has(item.type)
}

/** The neutral name for a card's kind — the chassis kicker band's label. */
export function feedKicker(type: string): string {
  const key = KICKER_KEY[type as keyof typeof KICKER_KEY]
  return i18n.t(key ?? 'feed:kicker.fallback')
}

/**
 * A short human handle for the card, used by the undo strip's
 * `Archived "{title}"`. Falls back to the kicker so the strip never reads
 * `Archived ""`.
 */
export function feedItemTitle(item: ActivityFeedItem): string {
  const payload = item.payload ?? {}
  return (
    payload.task_title ??
    payload.praxis_title ??
    payload.era_name ??
    item.actor_display_name ??
    feedKicker(item.type)
  )
}
