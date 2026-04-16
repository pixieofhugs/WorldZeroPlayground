import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { ActivityFeedItem } from '../../api/activityFeed'
import { respondToInvite } from '../../api/collaborations'
import { getMyTasks } from '../../api/tasks'
import { factionColor, factionCssVar } from '../../utils/factions'
import { relativeTime } from '../../utils/dates'
import FeedBadge from './FeedBadge'

interface Props {
  item: ActivityFeedItem
}

export default function FeedCardDuelChallenge({ item }: Props) {
  const {
    invite_id, collaboration_id, task_title, task_point_value, task_faction_slug,
    invite_status, challenger_character_id,
  } = item.payload
  const taskColor = factionColor(task_faction_slug)
  const actorColor = factionColor(item.actor_faction_slug)
  const navigate = useNavigate()

  const [status, setStatus] = useState<string | null>(invite_status)
  const [loading, setLoading] = useState(false)
  // Task-list-full modal state
  const [showDropModal, setShowDropModal] = useState(false)
  const [myTasks, setMyTasks] = useState<{ id: number; task: { id: number; title: string } }[]>([])
  const [dropError, setDropError] = useState('')

  const doAccept = async (drop_task_id?: number) => {
    setLoading(true)
    try {
      await respondToInvite(collaboration_id, invite_id, true, drop_task_id)
      setStatus('accepted')
      setShowDropModal(false)
      navigate(`/collaborations/${collaboration_id}`)
    } catch (err: any) {
      if (err?.response?.status === 409) {
        const tasks = await getMyTasks('in_progress')
        setMyTasks(tasks as any)
        setShowDropModal(true)
      } else {
        setDropError('Could not accept duel. Please try again.')
      }
    }
    setLoading(false)
  }

  const handleAccept = () => doAccept()

  const handleDecline = async () => {
    setLoading(true)
    try {
      await respondToInvite(collaboration_id, invite_id, false)
      setStatus('declined')
    } catch { /* swallow */ }
    setLoading(false)
  }

  const isPending = status === 'pending' || status === null

  return (
    <>
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
            {task_point_value} pts · winner takes the points
          </span>
          <span style={{ fontSize: 12 }}>&#x2694;</span>
        </div>

        {/* Accept/Decline buttons */}
        {isPending && (
          <div style={{ marginTop: 10, marginLeft: 38, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
            {dropError && (
              <span className="eyebrow" style={{ color: '#dc2626' }}>{dropError}</span>
            )}
          </div>
        )}

        {status === 'accepted' && (
          <div style={{ marginTop: 8, marginLeft: 38 }}>
            <Link to={`/collaborations/${collaboration_id}`} className="eyebrow" style={{ color: 'var(--badge-duel)', textDecoration: 'none' }}>
              Duel Accepted — view duel
            </Link>
          </div>
        )}
        {status === 'declined' && (
          <div style={{ marginTop: 8, marginLeft: 38 }}>
            <span className="eyebrow" style={{ color: 'var(--color-text-tertiary)' }}>Declined</span>
          </div>
        )}
      </div>

      {/* Task-list-full modal */}
      {showDropModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setShowDropModal(false)}
        >
          <div
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              padding: '24px',
              maxWidth: 420,
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="eyebrow" style={{ marginBottom: 8 }}>Task list full</p>
            <p className="font-body" style={{ fontSize: 11, marginBottom: 16, color: 'var(--color-text-secondary)' }}>
              You have 20 in-progress tasks. Drop one to accept this duel:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
              {myTasks.map((ct: any) => (
                <button
                  key={ct.id}
                  onClick={() => doAccept(ct.task.id)}
                  disabled={loading}
                  style={{
                    background: 'var(--color-bg-surface-alt)',
                    border: '1px solid var(--color-border)',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: "'Courier Prime', monospace",
                    fontSize: 10,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  Drop: {ct.task.title}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowDropModal(false)}
              style={{
                marginTop: 14,
                fontFamily: "'Courier Prime', monospace",
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                background: 'transparent', border: '1px solid var(--color-border)',
                padding: '5px 14px', cursor: 'pointer',
                color: 'var(--color-text-secondary)',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )
}
