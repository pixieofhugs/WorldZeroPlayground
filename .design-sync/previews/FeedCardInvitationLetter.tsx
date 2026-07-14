// FeedCardInvitationLetter preview — the "you've been invited to a faction"
// feed card. Reads payload.faction_slug (for the accent) and faction_name (into
// the <Trans> sentence). Renders the envelope glyph + faction-colored kicker,
// the YOUR STUFF badge, the italic invitation sentence, a body line, and a
// "view factions" link. _fixtures has no invitation_letter entry, so we build
// the item inline (noted in the batch learnings).
import { FeedCardInvitationLetter } from 'worldzero-frontend'
import type { ActivityFeedItem } from '../../frontend/src/api/activityFeed'
import { makeFeedItem } from './_fixtures'

const wrap: React.CSSProperties = {
  padding: 16,
  maxWidth: 440,
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg-surface)',
  margin: 16,
}

function letterItem(slug: string, name: string): ActivityFeedItem {
  return makeFeedItem({
    type: 'invitation_letter',
    actor_display_name: null,
    actor_faction_slug: slug,
    context_faction_slug: slug,
    payload: { faction_slug: slug, faction_name: name },
  })
}

/** A UA invitation — gilt accent on the kicker, sentence highlight, and link. */
export function UaInvitation() {
  return (
    <div style={wrap}>
      <FeedCardInvitationLetter item={letterItem('ua', 'The Unbroken Assembly')} />
    </div>
  )
}

/** A Snide invitation — a different faction accent, to show the color drive. */
export function SnideInvitation() {
  return (
    <div style={wrap}>
      <FeedCardInvitationLetter item={letterItem('snide', 'SNIDE')} />
    </div>
  )
}

/** An Ephemerists invitation — third accent to round out the color spread. */
export function EphemeristsInvitation() {
  return (
    <div style={wrap}>
      <FeedCardInvitationLetter item={letterItem('ephemerists', 'The Ephemerists')} />
    </div>
  )
}
