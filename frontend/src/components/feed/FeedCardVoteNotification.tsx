import { Link } from 'react-router-dom'
import type { ActivityFeedItem } from '../../api/activityFeed'
import { factionColor, factionCssVar } from '../../utils/factions'
import { relativeTime } from '../../utils/dates'
import FeedBadge from './FeedBadge'

interface Props {
  item: ActivityFeedItem
}

export default function FeedCardVoteNotification({ item }: Props) {
  const { stars, praxis_id, praxis_title, points_earned } = item.payload
  const color = factionColor(item.actor_faction_slug)

  return (
    <div className="sidebar-card" style={{ padding: '12px 16px', position: 'relative', background: factionCssVar(item.actor_faction_slug, 'card-bg'), borderLeft: `4px solid ${factionCssVar(item.actor_faction_slug, 'card-accent')}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {/* Avatar */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${color}, ${color}88)`,
            flexShrink: 0,
            marginTop: 2,
          }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span className="font-body" style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {item.actor_display_name}
            </span>
            <span className="font-body" style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
              voted on your praxis
            </span>
            <FeedBadge type="your_stuff" label="Your Stuff" />
          </div>

          <span className="eyebrow" style={{ color: 'var(--color-text-tertiary)', display: 'block', marginTop: 2 }}>
            {relativeTime(item.timestamp)}
          </span>
        </div>
      </div>

      {/* Vote detail row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, paddingLeft: 38 }}>
        {/* Star badge */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 4,
            background: 'var(--badge-friend)',
            color: '#fff',
            fontFamily: "'Courier Prime', monospace",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          {stars}
        </span>

        <span className="font-body" style={{ fontSize: 10, color: 'var(--color-text-secondary)', flex: 1 }}>
          on{' '}
          <Link
            to={`/praxes/${praxis_id}`}
            style={{ color: 'var(--color-text-primary)', fontWeight: 600, textDecoration: 'none' }}
          >
            {praxis_title}
          </Link>
        </span>

        <span
          style={{
            fontFamily: "'Courier Prime', monospace",
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--badge-friend)',
          }}
        >
          +{points_earned} pts
        </span>
      </div>
    </div>
  )
}
