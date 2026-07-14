// FeedCardEraAnnouncement preview — the always-dark "system" announcement card
// that opens a new era in the feed (Style Guide §8). Reads era_name and an
// optional era_notes blurb; renders the kicker + ADMIN badge, an italic display
// headline, the notes, and the two nav links (new tasks / era archive).
import { FeedCardEraAnnouncement } from 'worldzero-frontend'
import type { ActivityFeedItem } from '../../frontend/src/api/activityFeed'
import { makeFeedItem } from './_fixtures'

const wrap: React.CSSProperties = { padding: 20, maxWidth: 440 }

function eraItem(payload: Record<string, unknown>): ActivityFeedItem {
  return makeFeedItem({
    type: 'era_announcement',
    actor_display_name: null,
    actor_faction_slug: null,
    context_faction_slug: null,
    payload,
  })
}

/** Headline only — the minimal announcement (no notes blurb). */
export function HeadlineOnly() {
  return (
    <div style={wrap}>
      <FeedCardEraAnnouncement item={eraItem({ era_name: 'Era One' })} />
    </div>
  )
}

/** With an era_notes blurb — the fuller announcement body. */
export function WithNotes() {
  const item = eraItem({
    era_name: 'Era Two',
    era_notes:
      'The reset is complete. Scores return to zero, the task board is reseeded, and a new season of praxis begins. Your all-time record carries forward.',
  })
  return (
    <div style={wrap}>
      <FeedCardEraAnnouncement item={item} />
    </div>
  )
}
