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
 * The kicker key for each of the 17 backend feed types, written out rather than
 * interpolated. The catalog is a TYPED resource here, so `` i18n.t(`feed:kicker.
 * ${type}`) `` on an unconstrained string does not compile — and a literal map
 * is the better shape anyway: it is the checklist of the 17, and an unnamed type
 * lands on the fallback instead of printing a raw key at the player.
 */
const KICKER_KEY = {
  friend_completion: 'feed:kicker.friend_completion',
  foe_completion: 'feed:kicker.foe_completion',
  vote_on_mine: 'feed:kicker.vote_on_mine',
  vote_changed_on_mine: 'feed:kicker.vote_changed_on_mine',
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
  comment_on_mine: 'feed:kicker.comment_on_mine',
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
 * The types whose dismissal line is NOT `Archived "{title}"` (#1458).
 *
 * The shared undo strip is right for fourteen of the fifteen: you filed the
 * card away and nothing else happened. It is wrong for the invitation letter,
 * whose dismiss control is labelled **Not now** — a deferral, never an answer
 * (ADR-0070). "Archived" reads as a decision the player did not make, so
 * that one type spends its own authored sentence instead:
 *
 *   > Set aside — the invitation still stands
 *
 * Same class of defect as #1342, where the archive's shared "Still waiting"
 * tag spoke for a request that had since been answered — one strip asserting
 * something untrue for one type.
 *
 * It is keyed on the TYPE, not on which control was pressed, because both
 * routes to the write mean the same thing: the ✕ and the swipe archive a
 * letter that also stays standing.
 *
 * Rewording the shared line was rejected on sight: it would be correct here and
 * wrong for the other fourteen. The map is the override list — deliberately
 * literal, so an unnamed type falls through to the shared line rather than
 * printing a raw key.
 */
const DISMISSED_MESSAGE_KEY = {
  invitation_letter: 'feed:invitationLetter.setAside',
} as const

/**
 * What the undo strip says after a DISMISSAL — the per-type line where one is
 * authored, the shared `Archived "{title}"` otherwise.
 *
 * Only the dismiss direction takes overrides. Restoring is the same act for
 * every type (the row comes back), so the archived view keeps
 * `feed:archive.restored` for all fifteen.
 */
export function feedDismissedMessage(item: ActivityFeedItem): string {
  const override = DISMISSED_MESSAGE_KEY[item.type as keyof typeof DISMISSED_MESSAGE_KEY]
  if (override) return i18n.t(override)
  return i18n.t('feed:archive.archived', { title: feedItemTitle(item) })
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
