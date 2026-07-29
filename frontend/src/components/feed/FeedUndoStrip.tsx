/** How long the strip offers UNDO before it degrades to the plain reverse verb
 *  (design §2a: the sheet's own `setTimeout(..., 6000)`). */
export const UNDO_WINDOW_MS = 6000

/** Whether the strip is still inside its window. */
export type FeedUndoPhase = 'undo' | 'expired'

/**
 * The undo strip (Unaffiliated sheet §2a).
 *
 * "the card leaves the feed and its slot becomes an undo strip" — so this
 * replaces the card IN ITS OWN SLOT. Not a toast, not a corner snackbar: the
 * list must not jump under the reader's cursor.
 *
 * The dismissal is already written by the time this renders. Deferring the
 * write for six seconds would lose it the moment the player navigates away, so
 * the strip's job is to offer the reversal, not to delay the action.
 *
 * When the window expires the action becomes the plain reverse verb — **Restore**
 * in the feed, **Archive** in the archive — rather than the strip vanishing. The
 * sheet degrades the slot instead of collapsing it, which keeps the list stable
 * for a reader who looked away. The slot clears on the next fetch, when the
 * server no longer returns the item.
 *
 * It takes finished strings rather than a direction: both directions of the
 * archive use one strip, and the vocabulary decision belongs to `FeedItemSlot`,
 * which knows whether it is looking at the feed or the archive.
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
        className="eyebrow"
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
