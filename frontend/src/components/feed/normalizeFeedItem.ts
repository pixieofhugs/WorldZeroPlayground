import type { ActivityFeedItem } from '../../api/activityFeed'
import i18n from '../../i18n'
import { factionName } from '../../utils/factions'
import { relativeTime } from '../../utils/dates'
import { resolveTaunt } from '../../utils/taunts'

/**
 * Full-adoption activity feed (#376): the faction owns the whole "someone did X"
 * row. Every faction-owned event type is normalized into ONE slot bag rendered by
 * `FeedRowContent` inside the faction's frame — there is no per-event-type card.
 * The four structural / interactive events (era announcement, invitation letter,
 * duel challenge, collab invite) keep their bespoke companion cards (the design's
 * factionless announcement + interactive challenge cards), routed in
 * FeedCardRouter — so accept/decline handlers are never collapsed into slots.
 *
 * Copy comes from the `feed` catalog (#447). This module is plain TS (no hook
 * context), so it reads the singleton `i18n.t` directly — importing the
 * singleton also guarantees the catalog is initialized wherever the normalizer
 * is used (app or test).
 */

/** Event types the faction owns as a slot-driven row (no bespoke card). */
export const FACTION_ROW_TYPES = new Set([
  'friend_completion',
  'foe_completion',
  'vote_on_mine',
  'foe_taunt',
  'friend_signup',
  'friend_defection',
  'global_task',
])

export interface FeedRow {
  /** Faction whose voice styles the row (frame + accent). */
  slug: string | null
  actor: string | null
  actorHref: string | null
  action: string
  badge: { type: string; label: string } | null
  headline: string | null
  headlineHref: string | null
  /** Render the headline as a quoted line (taunts) rather than a title link. */
  headlineQuoted: boolean
  /** Pre-formatted points string, e.g. "40 pts" / "+12 pts", or null. */
  points: string | null
  level: number | null
  time: string
}

/** Map a faction-owned feed item to its row slots. Returns null for the
 *  structural/interactive types that keep bespoke companion cards. */
export function normalizeFeedItem(item: ActivityFeedItem): FeedRow | null {
  if (!FACTION_ROW_TYPES.has(item.type)) return null
  const p = item.payload ?? {}
  const actor = item.actor_display_name
  const time = relativeTime(item.timestamp)
  const slug = item.context_faction_slug

  switch (item.type) {
    case 'friend_completion':
    case 'foe_completion': {
      const friend = item.type === 'friend_completion'
      return {
        slug,
        actor,
        actorHref: p.character_id != null ? `/characters/${p.character_id}` : null,
        action: i18n.t('feed:row.action.completedTask'),
        badge: friend
          ? { type: 'friend', label: i18n.t('feed:badge.friend') }
          : { type: 'duel', label: i18n.t('feed:badge.foe') },
        headline: p.task_title ?? null,
        headlineHref: p.praxis_id != null ? `/praxes/${p.praxis_id}` : null,
        headlineQuoted: false,
        points:
          p.task_point_value != null
            ? i18n.t('feed:row.points', { points: p.task_point_value })
            : null,
        level: null,
        time,
      }
    }
    case 'friend_signup':
      return {
        slug,
        actor,
        actorHref: p.character_id != null ? `/characters/${p.character_id}` : null,
        action: i18n.t('feed:row.action.signedUpSharedTask'),
        badge: { type: 'friend', label: i18n.t('feed:badge.friend') },
        headline: p.task_title ?? null,
        headlineHref: p.task_id != null ? `/tasks/${p.task_id}` : null,
        headlineQuoted: false,
        points:
          p.task_point_value != null
            ? i18n.t('feed:row.points', { points: p.task_point_value })
            : null,
        level: p.task_level_required ?? null,
        time,
      }
    case 'vote_on_mine':
      return {
        slug,
        actor,
        actorHref: null,
        action: i18n.t('feed:row.action.votedOnYourPraxis'),
        badge: { type: 'your_stuff', label: i18n.t('feed:badge.yourStuff') },
        headline: p.praxis_title ?? null,
        headlineHref: p.praxis_id != null ? `/praxes/${p.praxis_id}` : null,
        headlineQuoted: false,
        points:
          p.points_earned != null
            ? i18n.t('feed:row.pointsEarned', { points: p.points_earned })
            : null,
        level: null,
        time,
      }
    case 'foe_taunt': {
      // ADR-0031: the payload is a structured reference; resolve the copy from
      // the taunts.json catalog here.
      const headline =
        p.faction_slug != null && p.trigger_type != null && p.taunt_id != null
          ? resolveTaunt({
              id: p.taunt_id,
              faction_slug: p.faction_slug,
              trigger_type: p.trigger_type,
              from_name: p.from_name ?? actor ?? '',
              to_name: p.to_name ?? '',
            })
          : null
      return {
        slug,
        actor,
        actorHref: p.from_character_id != null ? `/characters/${p.from_character_id}` : null,
        action: i18n.t('feed:row.action.tauntsYou'),
        badge: { type: 'duel', label: i18n.t('feed:badge.foe') },
        headline,
        headlineHref: null,
        headlineQuoted: true,
        points: null,
        level: null,
        time,
      }
    }
    case 'friend_defection':
      return {
        slug,
        actor,
        actorHref: p.character_id != null ? `/characters/${p.character_id}` : null,
        action: i18n.t('feed:row.action.defected', {
          oldFaction: p.old_faction_name ?? factionName(p.old_faction_slug),
          newFaction: p.new_faction_name ?? factionName(p.new_faction_slug),
        }),
        badge: { type: 'friend', label: i18n.t('feed:badge.friend') },
        headline: null,
        headlineHref: null,
        headlineQuoted: false,
        points: null,
        level: null,
        time,
      }
    case 'global_task':
      return {
        slug,
        actor: null,
        actorHref: null,
        action: i18n.t('feed:row.action.globalTaskActivated'),
        badge: { type: 'global', label: i18n.t('feed:badge.global') },
        headline: p.task_title ?? null,
        headlineHref: p.task_id != null ? `/tasks/${p.task_id}` : null,
        headlineQuoted: false,
        points:
          p.task_point_value != null
            ? i18n.t('feed:row.points', { points: p.task_point_value })
            : null,
        level: p.task_level_required ?? null,
        time,
      }
    default:
      return null
  }
}
