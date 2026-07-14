// FeedCardCollabInvite preview — the interactive "X invited you to a collab"
// feed card. Renders the inviter monogram, a <Trans> invite sentence, the task
// detail row (faction dot · title · points/level meta · COLLAB badge), and,
// while pending, live Accept/Decline buttons. It reads several payload fields
// beyond the base fixture (task meta, faction slug, inviter id), so we enrich
// the item inline. Auth is mocked, so the pending buttons render for real.
import { FeedCardCollabInvite } from 'worldzero-frontend'
import type { ActivityFeedItem } from '../../frontend/src/api/activityFeed'
import { makeFeedItem } from './_fixtures'

const wrap: React.CSSProperties = {
  padding: 16,
  maxWidth: 440,
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg-surface)',
  margin: 16,
}

function collabItem(overrides: Partial<ActivityFeedItem> = {}): ActivityFeedItem {
  return makeFeedItem({
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
    ...overrides,
  })
}

/** Pending invite — the default interactive state with Accept/Decline. */
export function Pending() {
  return (
    <div style={wrap}>
      <FeedCardCollabInvite item={collabItem()} />
    </div>
  )
}

/** A UA invite to a longer-titled task, to show the sentence + task row wrap. */
export function LongTitle() {
  const item = collabItem({
    actor_display_name: 'Ada Reed',
    actor_faction_slug: 'ua',
    context_faction_slug: 'ua',
    payload: {
      praxis_id: 502,
      invite_id: 2,
      task_title: 'Render the old library facade in charcoal, then annotate the cornices',
      task_point_value: 30,
      task_level_required: 2,
      task_faction_slug: 'ua',
      inviter_character_id: 7,
    },
  })
  return (
    <div style={wrap}>
      <FeedCardCollabInvite item={item} />
    </div>
  )
}

/** Already-accepted invite — buttons collapse to the "view collab" link. */
export function Accepted() {
  const item = collabItem({
    payload: {
      praxis_id: 501,
      invite_id: 1,
      task_title: 'Organize a neighborhood tool library',
      task_point_value: 45,
      task_level_required: 3,
      task_faction_slug: 'everymen',
      inviter_character_id: 12,
      invite_status: 'accepted',
    },
  })
  return (
    <div style={wrap}>
      <FeedCardCollabInvite item={item} />
    </div>
  )
}
