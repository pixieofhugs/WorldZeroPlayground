import { useState } from 'react'
import { Link } from 'react-router-dom'
import i18n from '../../i18n'
import { leavePraxis } from '../../api/praxis'
import { extractError } from '../../utils/errors'
import { notifyRequestsChanged } from '../../utils/requestsBus'
import type { FeedRowAction } from './normalizeFeedItem'

/**
 * The row's action slot (epic #1192 §2b): navigate (`href`) or call an existing
 * endpoint (`call`); nothing drawn without an API (see `buildAwaitingActions`).
 * A `call` is one-shot: once fired the row is stale, so the button disappears
 * and `notifyRequestsChanged()` refetches the feed. `.label-caption` (#1307).
 */
export default function FeedRowActions({ actions }: { actions: FeedRowAction[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [doneIds, setDoneIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const visible = actions.filter((action) => !doneIds.includes(action.id))
  if (visible.length === 0 && !error) return null

  const runCall = async (action: FeedRowAction) => {
    if (!action.call || pendingId) return
    setPendingId(action.id)
    setError(null)
    try {
      await leavePraxis(action.call.praxisId)
      setDoneIds((prev) => [...prev, action.id])
      notifyRequestsChanged()
    } catch (err) {
      setError(extractError(err, i18n.t('feed:rowAction.failed')))
    }
    setPendingId(null)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 'var(--space-sm)',
        marginTop: 'var(--space-md)',
      }}
    >
      {visible.map((action) =>
        action.href ? (
          <Link key={action.id} to={action.href} className="label-caption" style={buttonStyle(action.tone)}>
            {action.label}
          </Link>
        ) : (
          <button
            key={action.id}
            type="button"
            className="label-caption"
            onClick={() => runCall(action)}
            style={{
              ...buttonStyle(action.tone),
              cursor: pendingId === action.id ? 'progress' : 'pointer',
            }}
          >
            {action.label}
          </button>
        ),
      )}
      {error && (
        <span className="label-caption" style={{ color: 'var(--color-danger)' }}>
          {error}
        </span>
      )}
    </div>
  )
}

/** Neutral tones only: the chassis carries the faction (epic decision 5). */
function buttonStyle(tone: FeedRowAction['tone']): React.CSSProperties {
  const primary = tone === 'primary'
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: 'var(--space-xs) var(--space-md)',
    textDecoration: 'none',
    background: primary ? 'var(--color-text-primary)' : 'transparent',
    color: primary ? 'var(--color-bg-page)' : 'var(--color-text-secondary)',
    border: `1px solid ${primary ? 'var(--color-text-primary)' : 'var(--color-border-strong)'}`,
    borderRadius: 0,
  }
}
