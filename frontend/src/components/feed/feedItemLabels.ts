import type { ActivityFeedItem } from '../../api/activityFeed'
import { requestStatusOf } from '../../hooks/useRespondToRequest'
import i18n from '../../i18n'

/**
 * The chassis's neutral vocabulary (epic #1192 decision 7), all from the `feed`
 * catalog. Faction dialect never ships; faction issues must not edit these keys.
 */

/**
 * Literal map, not interpolation: the typed catalog rejects a template key, and
 * an unlisted type lands on the fallback instead of a raw key.
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

/** Every backend feed type, derived from the map so "every type" tests can't drift. */
export const FEED_TYPES: readonly string[] = Object.keys(KICKER_KEY)

/** Request types that can be "still waiting" — see {@link isStillWaiting}. */
const REQUEST_TYPES: ReadonlySet<string> = new Set([
  'duel_challenge',
  'collab_invite',
])

/**
 * An archived request is still open (ADR-0070) until answered (#1342), so the
 * tag reads the source row's status via the payload — NOT
 * `useRespondToRequest`'s session-local status. A missing status counts as
 * pending: over-reporting is recoverable.
 */
export function isStillWaiting(item: ActivityFeedItem): boolean {
  return REQUEST_TYPES.has(item.type) && requestStatusOf(item) === 'pending'
}

/**
 * `awaiting_submission` is state, not an event: dismissing it would silence a
 * standing obligation. Backend 400s it; offer no control.
 */
export const NON_ARCHIVABLE_TYPES: ReadonlySet<string> = new Set([
  'awaiting_submission',
])

export function isArchivable(item: ActivityFeedItem): boolean {
  return !NON_ARCHIVABLE_TYPES.has(item.type)
}

export function feedKicker(type: string): string {
  const key = KICKER_KEY[type as keyof typeof KICKER_KEY]
  return i18n.t(key ?? 'feed:kicker.fallback')
}

/**
 * Per-type dismissal lines (#1458). "Not now" on the letter is a deferral
 * (ADR-0070), so "has been archived" would state a decision the player didn't
 * make. Keyed on type, not control: ✕ and swipe mean the same.
 */
const DISMISSED_MESSAGE_KEY = {
  invitation_letter: 'feed:invitationLetter.setAside',
} as const

/** Undo-strip line after a dismissal. Restore keeps one shared line for every type. */
export function feedDismissedMessage(item: ActivityFeedItem): string {
  const override = DISMISSED_MESSAGE_KEY[item.type as keyof typeof DISMISSED_MESSAGE_KEY]
  if (override) return i18n.t(override)
  return i18n.t('feed:archive.archived', { title: feedItemTitle(item) })
}

/** `{{title}}` for the undo strip; blank candidates fall through to the kicker. */
export function feedItemTitle(item: ActivityFeedItem): string {
  const payload = item.payload ?? {}
  const candidates = [
    payload.task_title,
    payload.praxis_title,
    payload.era_name,
    item.actor_display_name,
  ]
  const found = candidates.find((c) => typeof c === 'string' && c.trim() !== '')
  return (found as string | undefined) ?? feedKicker(item.type)
}
