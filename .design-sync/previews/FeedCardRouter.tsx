// FeedCardRouter preview — the dispatcher. It takes one ActivityFeedItem and
// routes it: faction-owned "someone did X" rows normalize into FeedRowContent
// inside the faction frame; the four structural/interactive types keep their
// bespoke companion cards. We show a spread of kinds so the dispatch range is
// visible. Some companion cards read extra payload fields not on the base
// fixture, so we enrich those items inline.
import { FeedCardRouter } from 'worldzero-frontend'
import type { ActivityFeedItem } from '../../frontend/src/api/activityFeed'
import { makeFeedItem, mockFeedItems } from './_fixtures'

const wrap: React.CSSProperties = { padding: 20, maxWidth: 440 }

/** A faction-owned completion row (normalizeFeedItem → FeedRowContent in frame). */
export function FriendCompletionRow() {
  return (
    <div style={wrap}>
      <FeedCardRouter item={mockFeedItems.friend_completion} />
    </div>
  )
}

/** A vote landing on your own praxis — "your stuff" slot row. */
export function VoteOnMineRow() {
  return (
    <div style={wrap}>
      <FeedCardRouter item={mockFeedItems.vote_on_mine} />
    </div>
  )
}

/** A global (factionless) new-task row — neutral frame. */
export function GlobalTaskRow() {
  return (
    <div style={wrap}>
      <FeedCardRouter item={mockFeedItems.global_task} />
    </div>
  )
}

/** A friend signing up for a task — Everymen frame. */
export function FriendSignupRow() {
  return (
    <div style={wrap}>
      <FeedCardRouter item={mockFeedItems.friend_signup} />
    </div>
  )
}

/** The always-dark era announcement companion, framed factionless. */
export function EraAnnouncement() {
  return (
    <div style={wrap}>
      <FeedCardRouter item={mockFeedItems.era_announcement} />
    </div>
  )
}

/** The interactive collab-invite companion — enriched with the fields the card
 *  reads (task meta, faction slug, inviter id) so it renders complete. */
export function CollabInvite() {
  const item: ActivityFeedItem = makeFeedItem({
    type: 'collab_invite',
    actor_display_name: 'Sam Okafor',
    actor_faction_slug: 'everymen',
    context_faction_slug: 'everymen',
    payload: {
      praxis_id: 501,
      invite_id: 1,
      task_title: 'Organize a neighborhood tool library',
      task_point_value: 45,
      task_level_required: 3,
      task_faction_slug: 'everymen',
      inviter_character_id: 12,
    },
  })
  return (
    <div style={wrap}>
      <FeedCardRouter item={item} />
    </div>
  )
}

/** The interactive duel-challenge companion — enriched with duel payload fields. */
export function DuelChallenge() {
  const item: ActivityFeedItem = makeFeedItem({
    type: 'duel_challenge',
    actor_display_name: 'Rax Vandal',
    actor_faction_slug: 'snide',
    context_faction_slug: 'snide',
    payload: {
      duel_id: 3,
      challenger_praxis_id: 777,
      task_title: 'Wheatpaste an original poem on a condemned wall',
      task_point_value: 30,
      task_faction_slug: 'snide',
      challenger_character_id: 21,
    },
  })
  return (
    <div style={wrap}>
      <FeedCardRouter item={item} />
    </div>
  )
}
