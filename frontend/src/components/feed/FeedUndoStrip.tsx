/** Undo window (design §2a: the sheet's `setTimeout(..., 6000)`). */
export const UNDO_WINDOW_MS = 6000

export type FeedUndoPhase = 'undo' | 'expired'

/**
 * The undo strip (§2a): replaces the card in its own slot (no toast, so the list
 * doesn't jump). The write already happened; this offers the reversal. After
 * the window it degrades to the plain reverse verb rather than vanishing.
 * Strings come finished from `FeedItemSlot`, which knows the direction.
 */
export default function FeedUndoStrip({
  message,
  actionLabel,
  phase,
  onAct,
  error,
}: {
  message: string
  actionLabel: string
  phase: FeedUndoPhase
  onAct: () => void
  error: string | null
}) {
  return (
    <div
      role="status"
      data-feed-undo-strip={phase}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        padding: 'var(--space-md) var(--space-lg)',
        background: 'var(--color-bg-surface-alt)',
        border: '1px dashed var(--color-border-strong)',
      }}
    >
      <span
        className="font-body"
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 'var(--text-content)',
          color: error ? 'var(--color-danger)' : 'var(--color-text-secondary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {error ?? message}
      </span>
      <button
        type="button"
        onClick={onAct}
        className="label-caption"
        style={{
          flexShrink: 0,
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          color: 'var(--color-text-primary)',
          textDecoration: 'underline',
        }}
      >
        {actionLabel}
      </button>
    </div>
  )
}
