import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { ActivityFeedItem } from '../../api/activityFeed'
import i18n from '../../i18n'
import FeedBadge from './FeedBadge'

interface Props {
  item: ActivityFeedItem
  /**
   * The dismiss control. Otherwise unchanged: the one factionless feed type (an era
   * turn can strip a player's faction), neutral always-dark chrome (#1192 dec. 6).
   */
  archive?: ReactNode
}

export default function FeedCardEraAnnouncement({ item, archive }: Props) {
  const { era_name, era_notes } = item.payload

  /* Always-dark (Style Guide §8): --badge-admin-bg/text are stable across themes. */
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
        {/* "ERA" names the card (heading tier); the label is a fact (caption, #1307). */}
        <span className="label-heading">{i18n.t('feed:eraAnnouncement.kicker')}</span>
        <span className="label-caption" style={{ color: 'var(--rank-silver)' }}>
          {i18n.t('feed:eraAnnouncement.label')}
        </span>
        <span style={{ marginLeft: 'auto' }}>
          <FeedBadge type="admin" label={i18n.t('feed:badge.admin')} />
        </span>
        {archive}
      </div>

      <h2
        className="font-display italic"
        style={{ fontSize: 'var(--text-content)', color: 'var(--badge-admin-text)', marginBottom: 'var(--space-sm)', lineHeight: 1.3 }}
      >
        {i18n.t('feed:eraAnnouncement.headline', { name: era_name })}
      </h2>

      {/* The card's own ink at 75% / 40%, not a restated hex (#1609); notes read
          9.86:1. Dark in both themes, so the mix has one value. */}
      {era_notes && (
        <p className="font-body" style={{ fontSize: 'var(--text-content)', color: 'color-mix(in srgb, var(--badge-admin-text) 75%, transparent)', marginBottom: 'var(--space-lg)', lineHeight: 1.5 }}>
          {era_notes}
        </p>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
        <Link
          to="/tasks"
          style={{
            fontFamily: "var(--font-body)",
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
            fontFamily: "var(--font-body)",
            fontSize: 'var(--text-base)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            border: '1px solid color-mix(in srgb, var(--badge-admin-text) 40%, transparent)',
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
