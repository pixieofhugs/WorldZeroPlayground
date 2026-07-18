import { Link } from 'react-router-dom'
import type { ActivityFeedItem } from '../../api/activityFeed'
import i18n from '../../i18n'
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
        padding: 'var(--space-lg) var(--space-xl)',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
        <span className="eyebrow">{i18n.t('feed:eraAnnouncement.kicker')}</span>
        <span className="eyebrow" style={{ color: 'var(--rank-silver)' }}>
          {i18n.t('feed:eraAnnouncement.label')}
        </span>
        <span style={{ marginLeft: 'auto' }}>
          <FeedBadge type="admin" label={i18n.t('feed:badge.admin')} />
        </span>
      </div>

      <h3
        className="font-display italic"
        style={{ fontSize: 'var(--text-content)', color: 'var(--badge-admin-text)', marginBottom: 'var(--space-sm)', lineHeight: 1.3 }}
      >
        {i18n.t('feed:eraAnnouncement.headline', { name: era_name })}
      </h3>

      {era_notes && (
        <p className="font-body" style={{ fontSize: 'var(--text-content)', color: 'rgba(247,244,238,0.75)', marginBottom: 'var(--space-lg)', lineHeight: 1.5 }}>
          {era_notes}
        </p>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
        <Link
          to="/tasks"
          style={{
            fontFamily: "'Courier Prime', monospace",
            fontSize: 'var(--text-base)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            background: 'var(--badge-admin-text)',
            color: 'var(--badge-admin-bg)',
            padding: 'var(--space-sm) var(--space-lg)',
            textDecoration: 'none',
          }}
        >
          {i18n.t('feed:eraAnnouncement.seeNewTasks')}
        </Link>
        <Link
          to="/praxes"
          style={{
            fontFamily: "'Courier Prime', monospace",
            fontSize: 'var(--text-base)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            border: '1px solid rgba(247,244,238,0.4)',
            color: 'var(--badge-admin-text)',
            padding: 'var(--space-sm) var(--space-lg)',
            textDecoration: 'none',
          }}
        >
          {i18n.t('feed:eraAnnouncement.eraArchive')}
        </Link>
      </div>
    </div>
  )
}
