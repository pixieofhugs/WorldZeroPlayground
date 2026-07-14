// FeedCardDuelChallenge preview — the interactive "X has challenged you" duel
// card. Same anatomy as the collab invite (challenger monogram, <Trans>
// sentence, task row with the crossed-swords glyph and DUEL badge, live
// Accept/Decline while pending) but reads the duel payload shape (duel_id /
// challenger_praxis_id / challenger_character_id). We enrich the item inline.
import { FeedCardDuelChallenge } from 'worldzero-frontend'
import type { ActivityFeedItem } from '../../frontend/src/api/activityFeed'
import { makeFeedItem } from './_fixtures'

const wrap: React.CSSProperties = {
  padding: 16,
  maxWidth: 440,
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg-surface)',
  margin: 16,
}

function duelItem(overrides: Partial<ActivityFeedItem> = {}): ActivityFeedItem {
  return makeFeedItem({
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
    ...overrides,
  })
}

/** Pending challenge — the default interactive state with Accept/Decline. */
export function Pending() {
  return (
    <div style={wrap}>
      <FeedCardDuelChallenge item={duelItem()} />
    </div>
  )
}

/** A Wow challenger on a higher-stakes task, to vary the accent + points meta. */
export function HigherStakes() {
  const item = duelItem({
    actor_display_name: 'Pip Marigold',
    actor_faction_slug: 'wow',
    context_faction_slug: 'wow',
    payload: {
      duel_id: 4,
      challenger_praxis_id: 778,
      task_title: 'Host a sidewalk chalk festival for the block',
      task_point_value: 60,
      task_faction_slug: 'wow',
      challenger_character_id: 19,
    },
  })
  return (
    <div style={wrap}>
      <FeedCardDuelChallenge item={item} />
    </div>
  )
}

/** Already-accepted challenge — buttons collapse to the "view duel" link. */
export function Accepted() {
  const item = duelItem({
    payload: {
      duel_id: 3,
      challenger_praxis_id: 777,
      task_title: 'Wheatpaste an original poem on a condemned wall',
      task_point_value: 30,
      task_faction_slug: 'snide',
      challenger_character_id: 21,
      duel_status: 'active',
    },
  })
  return (
    <div style={wrap}>
      <FeedCardDuelChallenge item={item} />
    </div>
  )
}
