import { Link } from 'react-router-dom'
import type { ActivityFeedItem } from '../../api/activityFeed'
import { factionColor } from '../../utils/factions'
import { relativeTime } from '../../utils/dates'
import FeedBadge from './FeedBadge'

interface Props {
  item: ActivityFeedItem
}

export default function FeedCardFriendSignup({ item }: Props) {
  const { character_id, task_id, task_title, task_point_value, task_faction_slug } = item.payload
  const actorColor = factionColor(item.actor_faction_slug)
  const taskColor = factionColor(task_faction_slug)

  return (
    <div style={{ padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <Link to={`/characters/${character_id}`}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${actorColor}, ${actorColor}88)`,
              flexShrink: 0,
              marginTop: 2,
            }}
          />
        </Link>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Link
              to={`/characters/${character_id}`}
              className="font-body"
              style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-primary)', textDecoration: 'none' }}
            >
              {item.actor_display_name}
            </Link>
            <span className="font-body" style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
              signed up for a task you're doing
            </span>
            <FeedBadge type="friend" label="Friend" />
          </div>
          <span className="eyebrow" style={{ color: 'var(--color-text-tertiary)', display: 'block', marginTop: 2 }}>
            {relativeTime(item.timestamp)}
          </span>
        </div>
      </div>

      <div style={{ marginTop: 8, marginLeft: 38, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: taskColor, flexShrink: 0 }} />
        <Link
          to={`/tasks/${task_id}`}
          className="font-body"
          style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-primary)', textDecoration: 'none' }}
        >
          {task_title}
        </Link>
        <span className="eyebrow" style={{ color: 'var(--color-text-tertiary)' }}>
          {task_point_value} pts
        </span>
      </div>
    </div>
  )
}
