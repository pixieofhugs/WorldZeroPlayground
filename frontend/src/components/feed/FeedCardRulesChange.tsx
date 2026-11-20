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
    <div className="sidebar-card rules-change-card">
      <div className="rules-change-head">
        <span className="label-heading">{i18n.t('feed:rulesChange.kicker')}</span>
        <span className="label-caption rules-change-label">
          {i18n.t('feed:rulesChange.label')}
        </span>
        <span className="rules-change-badge">
          <FeedBadge type="admin" label={i18n.t('feed:badge.admin')} />
        </span>
        {archive}
      </div>

      <h2 className="font-display italic rules-change-headline">
        {i18n.t('feed:rulesChange.headline')}
      </h2>

      <ul className="font-body rules-change-list">
        {changes.map((change) => (
          <li key={change.dial_key}>
            {hasOwnKey(DIAL_LINE_KEY, change.dial_key) &&
              i18n.t(DIAL_LINE_KEY[change.dial_key as keyof typeof DIAL_LINE_KEY][change.side])}
          </li>
        ))}
      </ul>

      <p className="font-body rules-change-footnote">{i18n.t('feed:rulesChange.footnote')}</p>
    </div>
  )
}
