import type { ActivityFeedItem } from '../../api/activityFeed'
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
        action: 'completed a task',
        badge: friend
          ? { type: 'friend', label: 'Friend' }
          : { type: 'duel', label: 'Foe' },
        headline: p.task_title ?? null,
        headlineHref: p.praxis_id != null ? `/praxes/${p.praxis_id}` : null,
        headlineQuoted: false,
        points: p.task_point_value != null ? `${p.task_point_value} pts` : null,
        level: null,
        time,
      }
    }
    case 'friend_signup':
      return {
        slug,
        actor,
        actorHref: p.character_id != null ? `/characters/${p.character_id}` : null,
        action: "signed up for a task you're doing",
        badge: { type: 'friend', label: 'Friend' },
        headline: p.task_title ?? null,
        headlineHref: p.task_id != null ? `/tasks/${p.task_id}` : null,
        headlineQuoted: false,
        points: p.task_point_value != null ? `${p.task_point_value} pts` : null,
        level: p.task_level_required ?? null,
        time,
      }
    case 'vote_on_mine':
      return {
        slug,
        actor,
        actorHref: null,
        action: 'voted on your praxis',
        badge: { type: 'your_stuff', label: 'Your Stuff' },
        headline: p.praxis_title ?? null,
        headlineHref: p.praxis_id != null ? `/praxes/${p.praxis_id}` : null,
        headlineQuoted: false,
        points: p.points_earned != null ? `+${p.points_earned} pts` : null,
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
        action: 'taunts you',
        badge: { type: 'duel', label: 'Foe' },
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
        action: `defected from ${p.old_faction_name ?? factionName(p.old_faction_slug)} to ${p.new_faction_name ?? factionName(p.new_faction_slug)}`,
        badge: { type: 'friend', label: 'Friend' },
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
        action: 'A new task has been activated',
        badge: { type: 'global', label: 'Global' },
        headline: p.task_title ?? null,
        headlineHref: p.task_id != null ? `/tasks/${p.task_id}` : null,
        headlineQuoted: false,
        points: p.task_point_value != null ? `${p.task_point_value} pts` : null,
        level: p.task_level_required ?? null,
        time,
      }
    default:
      return null
  }
}
