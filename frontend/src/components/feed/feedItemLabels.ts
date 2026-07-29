import type { ActivityFeedItem } from '../../api/activityFeed'
import i18n from '../../i18n'

/**
 * The chassis's neutral vocabulary (epic #1192 decision 7).
 *
 * Every string here comes from the `feed` catalog, authored once in #1194. The
 * faction sheets are written in dialect ("Tuck away" / "Bin it" / "Spike it" /
 * "rm --event") and NONE of it ships: faction identity is carried by the skin,
 * not the words. Faction issues must not append to or edit these keys.
 */

/** Feed types the archive tags "still waiting" — archiving never answers
 *  anything, so an archived challenge or invite is still open (ADR-0066). */
export const STILL_WAITING_TYPES = new Set(['duel_challenge', 'collab_invite'])

/**
 * The one feed type that cannot be archived. It is *state*, not an event: it
 * exists exactly while `PraxisMember.has_submitted` is false and clears itself
 * the moment you file, so a dismissal would silence a standing obligation
 * forever. The backend refuses it with a 400; the UI must not offer the control
 * at all rather than render it disabled.
 */
export const NON_ARCHIVABLE_TYPES = new Set(['awaiting_submission'])

export function isArchivable(item: ActivityFeedItem): boolean {
  return !NON_ARCHIVABLE_TYPES.has(item.type)
}

/** The neutral name for a card's kind — the chassis kicker band's label. */
export function feedKicker(type: string): string {
  const key = `feed:kicker.${type}`
  const label = i18n.t(key)
  // i18next returns the key itself when it is missing; a type we have not named
  // must still draw a band rather than print a raw key at the player.
  return label === key ? i18n.t('feed:kicker.fallback') : label
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
