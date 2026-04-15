import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { ActivityFeedItem } from '../../api/activityFeed'
import { acceptInvite, declineInvite } from '../../api/submissions'
import { factionColor, factionCssVar } from '../../utils/factions'
import { relativeTime } from '../../utils/dates'
import FeedBadge from './FeedBadge'

interface Props {
  item: ActivityFeedItem
}

export default function FeedCardDuelChallenge({ item }: Props) {
  const {
    submission_id, task_title, task_point_value, task_faction_slug,
    invite_status, challenger_character_id,
  } = item.payload
  const taskColor = factionColor(task_faction_slug)
  const actorColor = factionColor(item.actor_faction_slug)

  const [status, setStatus] = useState<string | null>(invite_status)
  const [loading, setLoading] = useState(false)

  const handleAccept = async () => {
    setLoading(true)
    try {
      await acceptInvite(submission_id)
      setStatus('accepted')
    } catch { /* swallow */ }
    setLoading(false)
  }

  const handleDecline = async () => {
    setLoading(true)
    try {
      await declineInvite(submission_id)
      setStatus('declined')
    } catch { /* swallow */ }
    setLoading(false)
  }

  const isPending = status === 'pending' || status === null

  return (
    <div
      className="sidebar-card"
      style={{
        padding: '12px 16px',
        borderLeft: `4px solid ${factionCssVar(task_faction_slug, 'card-accent')}`,
        background: factionCssVar(task_faction_slug, 'card-bg'),
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <Link to={`/characters/${challenger_character_id}`}>
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
              to={`/characters/${challenger_character_id}`}
              className="font-body"
              style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-primary)', textDecoration: 'none' }}
            >
              {item.actor_display_name}
            </Link>
            <span className="font-body" style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
              has challenged you to a duel
            </span>
            <FeedBadge type="duel" label="Duel" />
          </div>
          <span className="eyebrow" style={{ color: 'var(--color-text-tertiary)', display: 'block', marginTop: 2 }}>
            {relativeTime(item.timestamp)}
          </span>
        </div>
      </div>

      {/* Task detail */}
      <div style={{ marginTop: 10, marginLeft: 38, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: taskColor, flexShrink: 0 }} />
        <span className="font-body" style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-primary)' }}>
          {task_title}
        </span>
        <span className="eyebrow" style={{ color: 'var(--color-text-tertiary)' }}>
          {task_point_value} pts · winner takes all
        </span>
        <span style={{ fontSize: 12 }}>&#x1F525;</span>
      </div>

      {/* Accept/Decline buttons */}
      {isPending && (
        <div style={{ marginTop: 10, marginLeft: 38, display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleAccept}
            disabled={loading}
            style={{
              fontFamily: "'Courier Prime', monospace",
              fontSize: 9,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              background: 'var(--badge-duel)',
              color: '#fff',
              border: 'none',
              padding: '5px 14px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Accept Duel
          </button>
          <button
            onClick={handleDecline}
            disabled={loading}
            style={{
              fontFamily: "'Courier Prime', monospace",
              fontSize: 9,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
              padding: '5px 14px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Decline
          </button>
        </div>
      )}

      {status === 'accepted' && (
        <div style={{ marginTop: 8, marginLeft: 38 }}>
          <span className="eyebrow" style={{ color: 'var(--badge-duel)' }}>Duel Accepted</span>
        </div>
      )}
      {status === 'declined' && (
        <div style={{ marginTop: 8, marginLeft: 38 }}>
          <span className="eyebrow" style={{ color: 'var(--color-text-tertiary)' }}>Declined</span>
        </div>
      )}
    </div>
  )
}
