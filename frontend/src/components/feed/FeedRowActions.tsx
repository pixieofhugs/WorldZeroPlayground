import { useState } from 'react'
import { Link } from 'react-router-dom'
import i18n from '../../i18n'
import { leavePraxis } from '../../api/praxis'
import { extractError } from '../../utils/errors'
import { notifyRequestsChanged } from '../../utils/requestsBus'
import type { FeedRowAction } from './normalizeFeedItem'

/**
 * The row's ACTION SLOT (epic #1192 amendment §2b).
 *
 * The rewritten sheets put buttons on ordinary rows, not only on the three
 * interactive companions, so the slot is a general payload affordance: any type
 * that normalizes with `actions` gets them, and a type with none renders
 * nothing at all.
 *
 * Only two shapes exist, deliberately. An action either NAVIGATES to a route
 * that already exists (`href`) or CALLS an endpoint that already exists
 * (`call`). Anything a sheet drew without an API behind it is not built — see
 * the note on `buildAwaitingActions` in `normalizeFeedItem.ts` for the two
 * (Nudge back, and the sheets' answer buttons) that were struck on that ground.
 *
 * A `call` action is one-shot: once it has fired, the row it belonged to no
 * longer describes reality (you have left the collab), so the button is replaced
 * by nothing rather than left clickable. `notifyRequestsChanged()` makes the
 * surrounding feed refetch, which is what actually removes the row.
 *
 * The labels and the failure line are `.label-caption` (#1307): an action label
 * and an error are both genuinely read, so neither may wear the heading tier's
 * caps and tracking. Nothing here names a region.
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

/**
 * Two tones, both neutral. `primary` is the thing the card is asking for;
 * `quiet` is the way out. Nothing here is faction-tinted: the chassis around it
 * carries the faction (epic decision 5), and a button that repainted itself per
 * faction would fight the skin that already surrounds it.
 */
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
