import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { ActivityFeedItem } from '../../api/activityFeed'
import i18n from '../../i18n'
import FeedBadge from './FeedBadge'

interface Props {
  item: ActivityFeedItem
  /**
   * The dismiss control, dropped into the existing header. #1194's ONE change to
   * this card: it is the single factionless feed type and stays that way (epic
   * #1192 decision 6). An era turn can strip a player of their faction, so
   * speaking that specific card in their faction's voice is exactly backwards —
   * it keeps its neutral always-dark chrome and gains the ✕, nothing else.
   */
  archive?: ReactNode
}

export default function FeedCardEraAnnouncement({ item, archive }: Props) {
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
        {/* The masthead pair (#1307): "ERA" names the card, so it is the
            heading tier; "Era Announcement" beside it is a fact about the card
            and takes the caption's sentence case. */}
        <span className="label-heading">{i18n.t('feed:eraAnnouncement.kicker')}</span>
        <span className="label-caption" style={{ color: 'var(--rank-silver)' }}>
          {i18n.t('feed:eraAnnouncement.label')}
        </span>
        <span style={{ marginLeft: 'auto' }}>
          <FeedBadge type="admin" label={i18n.t('feed:badge.admin')} />
        </span>
        {archive}
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
          to="/praxis"
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
