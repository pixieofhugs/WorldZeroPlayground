import { Link } from 'react-router-dom'
import type { ActivityFeedItem } from '../../api/activityFeed'
import FeedBadge from './FeedBadge'

interface Props {
  item: ActivityFeedItem
}

export default function FeedCardEraAnnouncement({ item }: Props) {
  const { era_name, era_notes } = item.payload

  /* Era announcement is intentionally always-dark (Style Guide §8).
     Uses --badge-admin-bg/text (stable across themes) for consistent dark-card treatment. */
  return (
    <div
      className="sidebar-card"
      style={{
        background: 'var(--badge-admin-bg)',
        color: 'var(--badge-admin-text)',
        padding: '20px 24px',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 20 }}>&#x1F310;</span>
        <span className="eyebrow" style={{ color: 'var(--rank-silver)', fontSize: 8 }}>
          Era Announcement
        </span>
        <span style={{ marginLeft: 'auto' }}>
          <FeedBadge type="admin" label="Admin" />
        </span>
      </div>

      <h3
        className="font-display italic"
        style={{ fontSize: 18, color: 'var(--badge-admin-text)', marginBottom: 8, lineHeight: 1.3 }}
      >
        {era_name} is now active.
      </h3>

      {era_notes && (
        <p className="font-body" style={{ fontSize: 11, color: 'rgba(247,244,238,0.75)', marginBottom: 16, lineHeight: 1.5 }}>
          {era_notes}
        </p>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <Link
          to="/tasks"
          style={{
            fontFamily: "'Courier Prime', monospace",
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            background: 'var(--badge-admin-text)',
            color: 'var(--badge-admin-bg)',
            padding: '8px 16px',
            textDecoration: 'none',
          }}
        >
          See New Tasks
        </Link>
        <Link
          to="/praxes"
          style={{
            fontFamily: "'Courier Prime', monospace",
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            border: '1px solid rgba(247,244,238,0.4)',
            color: 'var(--badge-admin-text)',
            padding: '8px 16px',
            textDecoration: 'none',
          }}
        >
          Era Archive
        </Link>
      </div>
    </div>
  )
}
