import type { ActivityFeedItem } from '../../api/activityFeed'
import i18n from '../../i18n'
import { factionName } from '../../utils/factions'
import { resolveTaunt } from '../../utils/taunts'
import { collabCopy } from '../collab/collabCopy'

/**
 * Full-adoption activity feed (#376): the faction owns the whole "someone did X"
 * row. Every faction-owned event type is normalized into ONE slot bag rendered by
 * `FeedRowContent` inside the faction's chassis — there is no per-event-type
 * card. The three interactive companions (invitation letter, duel challenge,
 * collab invite) moved INSIDE the chassis in #1194 as payload bodies, keeping
 * their own accept/decline handlers; `era_announcement` stays outside it
 * deliberately (epic #1192 decision 6).
 *
 * The row no longer carries a `time` slot: the chassis draws the timestamp for
 * every card, so a row that also drew one printed it twice.
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
  'collaborator_submitted',
  'awaiting_submission',
  'nudge',
])

/**
 * A mutating CTA on an ordinary row. Only endpoints that ALREADY exist appear
 * here — a state drawn on a sheet with no API behind it is not built (epic
 * #1192 amendment, owner ruling 2026-07-29).
 */
export type FeedRowCall = { endpoint: 'leavePraxis'; praxisId: number }

/**
 * A CTA in the row's action slot (epic #1192 amendment §3). The slot is a
 * GENERAL payload affordance, not a companion-only one: the rewritten sheets
 * put buttons on ordinary rows too.
 *
 * An action is either a navigation to a route that already exists (`href`) or a
 * call to an endpoint that already exists (`call`). Never both.
 */
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
 * The `awaiting_submission` row's CTAs: "File it" always, "Drop out" on a
 * collab only.
 *
 * `leave_praxis` opens with `if praxis.type != PraxisType.collab: 400 "Only
 * collab memberships can be left."` — so on a duel side the control could only
 * ever fail. Repo convention: hide a control the player cannot use rather than
 * render it disabled (or, worse, render it live and let it 400).
 *
 * WHAT IS DELIBERATELY NOT HERE: **"Nudge back"**. The endpoint
 * (`POST /praxes/{id}/nudge/{character_id}`) exists, but nothing on either the
 * `nudge` or the `awaiting_submission` payload can satisfy its authorization:
 *
 *  - on a **collab**, `services/nudge.py` rule 1 requires the SENDER to have
 *    already filed. The recipient of a nudge is by construction someone who has
 *    not — that is why they were nudged — so the call 403s;
 *  - on a **duel**, `praxis_id` is the side the VIEWER owes (ADR-0011: a duel is
 *    two linked solo praxes). The rival's own praxis id, which is what the
 *    endpoint wants, is not in the payload and must not be invented.
 *
 * Per the epic's owner ruling: a drawn state with no API behind it is not built.
 */
function buildAwaitingActions(payload: Record<string, any>): FeedRowAction[] {
  if (payload.praxis_id == null) return []
  const actions: FeedRowAction[] = [
    {
      id: 'fileIt',
      label: i18n.t('feed:rowAction.fileIt'),
      tone: 'primary',
      href: `/praxes/${payload.praxis_id}/edit`,
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
        headlineHref: p.praxis_id != null ? `/praxes/${p.praxis_id}` : null,
        headlineQuoted: false,
        points:
          p.task_point_value != null
            ? i18n.t('feed:row.points', { points: p.task_point_value })
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
            ? i18n.t('feed:row.points', { points: p.task_point_value })
            : null,
        level: p.task_level_required ?? null,
        actions: [],
      }
    case 'collaborator_submitted':
      // A co-member submitted their part of a collab you're in (#571). Reuses the
      // friend-signup row shape; framed in the submitter's faction voice.
      return {
        slug,
        actor,
        actorHref: p.character_id != null ? `/characters/${p.character_id}` : null,
        action: i18n.t('feed:row.action.collaboratorSubmitted'),
        badge: { type: 'your_stuff', label: i18n.t('feed:badge.yourStuff') },
        headline: p.task_title ?? null,
        headlineHref: p.praxis_id != null ? `/praxes/${p.praxis_id}` : null,
        headlineQuoted: false,
        points:
          p.task_point_value != null
            ? i18n.t('feed:row.points', { points: p.task_point_value })
            : null,
        level: null,
        // "File yours" — a plain navigation to the shared editor, which every
        // member of the collab can already open. No new endpoint.
        actions:
          p.praxis_id != null
            ? [
                {
                  id: 'fileYours',
                  label: i18n.t('feed:rowAction.fileYours'),
                  tone: 'primary',
                  href: `/praxes/${p.praxis_id}/edit`,
                },
              ]
            : [],
      }
    case 'awaiting_submission':
      // Your turn: a collab/duel praxis waiting on your submission (#updates-
      // badge). No actor — the action leads and the task title links straight
      // to the editor. Badged by praxis type so collab/duel read distinctly.
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
        headlineHref: p.praxis_id != null ? `/praxes/${p.praxis_id}/edit` : null,
        headlineQuoted: false,
        points:
          p.task_point_value != null
            ? i18n.t('feed:row.points', { points: p.task_point_value })
            : null,
        level: p.task_level_required ?? null,
        // "File it" is a navigation to the editor. "Drop out" is `leavePraxis`
        // — and it is offered ONLY on a collab: the service refuses any other
        // praxis type outright ("Only collab memberships can be left."), so on
        // a duel side the control would 400 every time. Hide it there rather
        // than draw one that cannot work.
        actions: buildAwaitingActions(p),
      }
    case 'nudge':
      // Someone poked you to file (#1083). It lands BESIDE the
      // `awaiting_submission` row for the same praxis — the reminder and the
      // obligation are two cards about one thing — so it borrows that row's
      // badge and its link straight into the editor.
      //
      // The action line resolves through `collabCopy`, not the `feed` catalog:
      // it is the composer's own vocabulary, shared-default with faction
      // overrides where authored. Framed in the SENDER's voice, because
      // `context_faction_slug` is the actor's faction and a nudge is something a
      // named person did to you.
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
        headlineHref: p.praxis_id != null ? `/praxes/${p.praxis_id}/edit` : null,
        headlineQuoted: false,
        points:
          p.task_point_value != null
            ? i18n.t('feed:row.points', { points: p.task_point_value })
            : null,
        level: null,
        // "Answer" — the nudge's whole point, a navigation into your own
        // editor. The sheet also draws "Nudge back"; it is NOT built. See the
        // note on `buildAwaitingActions` below.
        actions:
          p.praxis_id != null
            ? [
                {
                  id: 'answer',
                  label: i18n.t('feed:rowAction.answer'),
                  tone: 'primary',
                  href: `/praxes/${p.praxis_id}/edit`,
                },
              ]
            : [],
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
        actions: [],
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
        actions: [],
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
            ? i18n.t('feed:row.points', { points: p.task_point_value })
            : null,
        level: p.task_level_required ?? null,
        actions: [],
      }
    default:
      return null
  }
}
