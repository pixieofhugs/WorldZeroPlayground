import type { ActivityFeedItem } from '../../api/activityFeed'
import i18n from '../../i18n'
import { factionName } from '../../utils/factions'
import { resolveTaunt } from '../../utils/taunts'
import { collabCopy } from '../collab/collabCopy'

/**
 * Activity feed rows (#376): every faction-owned event type normalizes into ONE
 * slot bag rendered by `FeedRowContent` inside the faction's chassis. The
 * interactive companions (invitation, duel, collab invite) are chassis payload
 * bodies (#1194); `era_announcement` stays outside (epic #1192 decision 6).
 * No `time` slot: the chassis draws the timestamp.
 *
 * Plain TS, so it reads the singleton `i18n.t` (importing it also initializes
 * the catalog).
 */

/** Event types the faction owns as a slot-driven row (no bespoke card). */
export const FACTION_ROW_TYPES = new Set([
  'friend_completion',
  'foe_completion',
  'vote_on_mine',
  'vote_changed_on_mine',
  'foe_taunt',
  'friend_signup',
  'friend_defection',
  'global_task',
  'collaborator_submitted',
  'awaiting_submission',
  'nudge',
  'comment_mention',
  'comment_on_mine',
])

/** Only endpoints that already exist (epic #1192: no drawn state without an API). */
type FeedRowCall = { endpoint: 'leavePraxis'; praxisId: number }

/** A row CTA (epic #1192 §3): navigation (`href`) or endpoint call (`call`), never both. */
export interface FeedRowAction {
  /** Stable id — also the `feed:rowAction.<id>` copy key. */
  id: string
  label: string
  tone: 'primary' | 'quiet'
  href?: string
  call?: FeedRowCall
}

export interface FeedRow {
  /** Faction whose voice styles the row (chassis + accent). */
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
  /** CTAs for the row's action slot. Empty for most types. */
  actions: FeedRowAction[]
}

/**
 * "File it" always; "Drop out" on a collab only — `leave_praxis` 400s on any
 * other praxis type, and we hide unusable controls.
 *
 * NOT built: "Nudge back". Neither payload can satisfy the nudge endpoint's
 * auth: on a collab the sender must already have filed (`services/nudge.py`
 * rule 1), and the nudged recipient by definition hasn't; on a duel
 * `praxis_id` is the viewer's side (ADR-0011) and the rival's id isn't in the
 * payload.
 */
function buildAwaitingActions(payload: Record<string, any>): FeedRowAction[] {
  if (payload.praxis_id == null) return []
  const actions: FeedRowAction[] = [
    {
      id: 'fileIt',
      label: i18n.t('feed:rowAction.fileIt'),
      tone: 'primary',
      href: `/praxis/${payload.praxis_id}/edit`,
    },
  ]
  if (payload.praxis_type === 'collab') {
    actions.push({
      id: 'dropOut',
      label: i18n.t('feed:rowAction.dropOut'),
      tone: 'quiet',
      call: { endpoint: 'leavePraxis', praxisId: payload.praxis_id },
    })
  }
  return actions
}

/**
 * A comment has exactly one target (DB CHECK, migration 0005). No per-comment
 * anchor: the thread rows carry no ids, so `#comment-{id}` would resolve to
 * nothing; the target page is the deep link.
 */
function commentTargetHref(payload: Record<string, any>): string | null {
  if (payload.praxis_id != null) return `/praxis/${payload.praxis_id}`
  if (payload.task_id != null) return `/tasks/${payload.task_id}`
  return null
}

/**
 * "Reply" for both comment types (#2159). One control, not the Snide sheet's
 * two: "open composer" and "open thread" are the same navigation here
 * (`CommentThread` mounts the composer under the list), so the excerpt link
 * opens the thread and this CTA invites the answer.
 */
function buildCommentActions(payload: Record<string, any>): FeedRowAction[] {
  const href = commentTargetHref(payload)
  if (href == null) return []
  return [{ id: 'reply', label: i18n.t('feed:rowAction.reply'), tone: 'primary', href }]
}

/** Map a faction-owned feed item to its row slots. Returns null for the
 *  structural/interactive types that render a companion body instead. */
export function normalizeFeedItem(item: ActivityFeedItem): FeedRow | null {
  if (!FACTION_ROW_TYPES.has(item.type)) return null
  const p = item.payload ?? {}
  const actor = item.actor_display_name
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
        headlineHref: p.praxis_id != null ? `/praxis/${p.praxis_id}` : null,
        headlineQuoted: false,
        points:
          p.task_point_value != null
            ? i18n.t('feed:row.points', { points: p.task_point_value, count: p.task_point_value })
            : null,
        level: null,
        actions: [],
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
            ? i18n.t('feed:row.points', { points: p.task_point_value, count: p.task_point_value })
            : null,
        level: p.task_level_required ?? null,
        actions: [],
      }
    case 'collaborator_submitted':
      // A co-member submitted their part of a collab you're in (#571).
      return {
        slug,
        actor,
        actorHref: p.character_id != null ? `/characters/${p.character_id}` : null,
        action: i18n.t('feed:row.action.collaboratorSubmitted'),
        badge: { type: 'your_stuff', label: i18n.t('feed:badge.yourStuff') },
        headline: p.task_title ?? null,
        headlineHref: p.praxis_id != null ? `/praxis/${p.praxis_id}` : null,
        headlineQuoted: false,
        points:
          p.task_point_value != null
            ? i18n.t('feed:row.points', { points: p.task_point_value, count: p.task_point_value })
            : null,
        level: null,
        // Only while the viewer still owes their part (#2284).
        // `viewer_has_submitted` is about the READER; every other field
        // describes the submitter.
        actions:
          p.praxis_id != null && !p.viewer_has_submitted
            ? [
                {
                  id: 'fileYours',
                  label: i18n.t('feed:rowAction.fileYours'),
                  tone: 'primary',
                  href: `/praxis/${p.praxis_id}/edit`,
                },
              ]
            : [],
      }
    case 'awaiting_submission':
      // A collab/duel praxis waiting on your submission. No actor; badged by
      // praxis type.
      return {
        slug,
        actor: null,
        actorHref: null,
        action: i18n.t('feed:row.action.awaitingSubmission'),
        badge:
          p.praxis_type === 'duel'
            ? { type: 'duel', label: i18n.t('feed:badge.duel') }
            : { type: 'collab', label: i18n.t('feed:badge.collab') },
        headline: p.task_title ?? null,
        headlineHref: p.praxis_id != null ? `/praxis/${p.praxis_id}/edit` : null,
        headlineQuoted: false,
        points:
          p.task_point_value != null
            ? i18n.t('feed:row.points', { points: p.task_point_value, count: p.task_point_value })
            : null,
        level: p.task_level_required ?? null,
        actions: buildAwaitingActions(p),
      }
    case 'nudge':
      // Someone poked you to file (#1083). Sits beside the
      // `awaiting_submission` row for the same praxis, so it borrows its badge
      // and editor link. Action copy comes from `collabCopy` (composer
      // vocabulary), in the SENDER's voice (`context_faction_slug` = actor's).
      return {
        slug,
        actor,
        actorHref:
          p.from_character_id != null ? `/characters/${p.from_character_id}` : null,
        action: collabCopy(slug, 'nudgeFeedAction'),
        badge:
          p.praxis_type === 'collab'
            ? { type: 'collab', label: i18n.t('feed:badge.collab') }
            : { type: 'duel', label: i18n.t('feed:badge.duel') },
        headline: p.task_title ?? null,
        headlineHref: p.praxis_id != null ? `/praxis/${p.praxis_id}/edit` : null,
        headlineQuoted: false,
        points:
          p.task_point_value != null
            ? i18n.t('feed:row.points', { points: p.task_point_value, count: p.task_point_value })
            : null,
        level: null,
        // "Nudge back" deliberately not built — see `buildAwaitingActions`.
        actions:
          p.praxis_id != null
            ? [
                {
                  id: 'answer',
                  label: i18n.t('feed:rowAction.answer'),
                  tone: 'primary',
                  href: `/praxis/${p.praxis_id}/edit`,
                },
              ]
            : [],
      }
    case 'comment_mention':
    case 'comment_on_mine':
      // Mention (#1196) or comment on your praxis (#2159). One branch: they
      // share `CommentPayload`; which comments each covers is settled
      // server-side (a mention on your praxis arrives once, as the mention).
      // Badged `your_stuff` to match the backend's filters: news, not a
      // request. Commenter's voice, as for `nudge`.
      return {
        slug,
        actor,
        actorHref: p.character_id != null ? `/characters/${p.character_id}` : null,
        action: i18n.t(
          item.type === 'comment_mention'
            ? 'feed:row.action.mentionedYou'
            : 'feed:row.action.commentedOnYours',
        ),
        badge: { type: 'your_stuff', label: i18n.t('feed:badge.yourStuff') },
        // Quoted like a taunt; the backend caps it at 140 chars.
        headline: p.excerpt ?? null,
        headlineHref: commentTargetHref(p),
        headlineQuoted: true,
        points: null,
        level: null,
        actions: buildCommentActions(p),
      }
    case 'vote_on_mine':
    case 'vote_changed_on_mine':
      // Same payload; `value` is the vote standing now. The changed row must
      // not pose as a fresh vote (#1712). The number is this voter's own
      // contribution (#2402): `points_from_votes` is a plain sum of values.
      //
      // ponytail: a changed vote prints only the current value, not the delta
      // (no prior value stored). Upgrade: `previous_value` on `Vote` set in
      // `cast_or_update_vote` (see `_vote_item_factory`).
      return {
        slug,
        actor,
        actorHref: null,
        action: i18n.t(
          item.type === 'vote_changed_on_mine'
            ? 'feed:row.action.changedTheirVote'
            : 'feed:row.action.votedOnYourPraxis',
        ),
        badge: { type: 'your_stuff', label: i18n.t('feed:badge.yourStuff') },
        headline: p.praxis_title ?? null,
        headlineHref: p.praxis_id != null ? `/praxis/${p.praxis_id}` : null,
        headlineQuoted: false,
        points:
          p.value != null ? i18n.t('feed:row.pointsEarned', { points: p.value }) : null,
        level: null,
        actions: [],
      }
    case 'foe_taunt': {
      // ADR-0031: resolve copy from the taunts catalog.
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
        actions: [],
      }
    }
    case 'friend_defection':
      return {
        slug,
        actor,
        actorHref: p.character_id != null ? `/characters/${p.character_id}` : null,
        // Slugs only, no server display-name fallback (#1891): a name would
        // bypass `factionName()`, where the Albescent mask lives.
        action: i18n.t('feed:row.action.defected', {
          oldFaction: factionName(p.old_faction_slug),
          newFaction: factionName(p.new_faction_slug),
        }),
        badge: { type: 'friend', label: i18n.t('feed:badge.friend') },
        headline: null,
        headlineHref: null,
        headlineQuoted: false,
        points: null,
        level: null,
        actions: [],
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
            ? i18n.t('feed:row.points', { points: p.task_point_value, count: p.task_point_value })
            : null,
        level: p.task_level_required ?? null,
        actions: [],
      }
    default:
      return null
  }
}
