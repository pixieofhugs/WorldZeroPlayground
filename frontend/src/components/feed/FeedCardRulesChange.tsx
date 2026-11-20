import type { ReactNode } from 'react'
import type { ActivityFeedItem } from '../../api/activityFeed'
import i18n from '../../i18n'
import { hasOwnKey } from '../../utils/hasOwnKey'
import FeedBadge from './FeedBadge'

interface Props {
  item: ActivityFeedItem
  archive?: ReactNode
}

interface Change {
  dial_key: string
  side: 'small' | 'full'
}

/** Full keys: a template literal does not typecheck against the catalog. */
const DIAL_LINE_KEY = {
  praxis_post_cooldown: {
    small: 'feed:rulesChange.dial.praxis_post_cooldown.small',
    full: 'feed:rulesChange.dial.praxis_post_cooldown.full',
  },
  vote_requires_received_vote: {
    small: 'feed:rulesChange.dial.vote_requires_received_vote.small',
    full: 'feed:rulesChange.dial.vote_requires_received_vote.full',
  },
  comment_level: {
    small: 'feed:rulesChange.dial.comment_level.small',
    full: 'feed:rulesChange.dial.comment_level.full',
  },
  duel_level: {
    small: 'feed:rulesChange.dial.duel_level.small',
    full: 'feed:rulesChange.dial.duel_level.full',
  },
  invitation: {
    small: 'feed:rulesChange.dial.invitation.small',
    full: 'feed:rulesChange.dial.invitation.full',
  },
  flag_level: {
    small: 'feed:rulesChange.dial.flag_level.small',
    full: 'feed:rulesChange.dial.flag_level.full',
  },
} as const

/** The world announcing a rule change (#3656): neutral always-dark chrome, like the era card. */
export default function FeedCardRulesChange({ item, archive }: Props) {
  const changes: Change[] = item.payload.changes ?? []

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
        <span className="label-heading">{i18n.t('feed:rulesChange.kicker')}</span>
        <span className="label-caption" style={{ color: 'var(--rank-silver)' }}>
          {i18n.t('feed:rulesChange.label')}
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
        {i18n.t('feed:rulesChange.headline')}
      </h2>

      <ul
        className="font-body"
        style={{
          fontSize: 'var(--text-content)',
          lineHeight: 1.5,
          margin: 0,
          paddingLeft: 'var(--space-lg)',
          marginBottom: 'var(--space-md)',
        }}
      >
        {changes.map((change) => (
          <li key={change.dial_key}>
            {hasOwnKey(DIAL_LINE_KEY, change.dial_key) &&
              i18n.t(DIAL_LINE_KEY[change.dial_key as keyof typeof DIAL_LINE_KEY][change.side])}
          </li>
        ))}
      </ul>

      <p
        className="font-body"
        style={{ fontSize: 'var(--text-base)', color: 'color-mix(in srgb, var(--badge-admin-text) 75%, transparent)' }}
      >
        {i18n.t('feed:rulesChange.footnote')}
      </p>
    </div>
  )
}
