/**
 * The feed's drop-to-accept modal (#322 collab / #314 duel), portalled to
 * `document.body` (#1273): `.sidebar-card`'s `backdrop-filter` makes the card the
 * containing block for `position: fixed`, and frames clip with `overflow: hidden`.
 * Same shape as `ConfirmDialog` (#1082).
 *
 * Policy-free: wording and what "drop" does (delete vs. leave) arrive as props, so
 * each card's `feed:*.bankFull.*` keys stay in the card for the catalog sweep.
 *
 * A named `role="dialog"`, focus moves in on open, Escape dismisses. The harness
 * can't run effects, so only the static contract is tested.
 */
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

/** One in-progress praxis the viewer may drop to free a bank slot. */
interface BankFullDropOption {
  /** The React key, never rendered. */
  id: number
  /** Fully worded by the caller. */
  label: string
  /** Drop and retry the accept; delete vs. leave is the caller's. */
  onSelect: () => void
}

export default function FeedBankFullModal({
  title,
  body,
  cancelLabel,
  options,
  busy,
  error,
  onDismiss,
}: {
  title: string
  body: string
  cancelLabel: string
  options: BankFullDropOption[]
  /** A drop is in flight; every choice is inert. */
  busy: boolean
  /** Already worded; empty when nothing to say. */
  error: string
  onDismiss: () => void
}) {
  const titleId = useId()
  const bodyId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  // Focus the panel, not a button: every drop destroys or leaves a praxis, so
  // there is no safe default.
  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onDismiss])

  const modal = (
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'var(--color-overlay-strong)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-xl)',
      }}
      onClick={onDismiss}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          padding: 'var(--space-xl)',
          maxWidth: 420,
          width: '100%',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {/* Names a region, so `.label-heading` (#1307). */}
        <p
          id={titleId}
          className="label-heading"
          style={{ marginBottom: 'var(--space-sm)' }}
        >
          {title}
        </p>
        <p
          id={bodyId}
          className="font-body"
          style={{
            fontSize: 'var(--text-content)',
            marginBottom: 'var(--space-lg)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {body}
        </p>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-sm)',
            maxHeight: 260,
            overflowY: 'auto',
          }}
        >
          {options.map((option) => (
            <button
              key={option.id}
              onClick={option.onSelect}
              disabled={busy}
              style={{
                background: 'var(--color-bg-surface-alt)',
                border: '1px solid var(--color-border)',
                padding: 'var(--space-sm) var(--space-md)',
                cursor: busy ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                fontFamily: "var(--font-body)",
                fontSize: 'var(--text-content)',
                color: 'var(--color-text-primary)',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
        {error && (
          <p
            className="label-caption"
            style={{
              color: 'var(--color-danger)',
              marginTop: 'var(--space-md)',
            }}
          >
            {error}
          </p>
        )}
        {/* Face is `.feed-action` (#1783). */}
        <button
          onClick={onDismiss}
          className="feed-action"
          style={{
            marginTop: 'var(--space-lg)',
            background: 'transparent',
            border: '1px solid var(--color-border)',
            padding: 'var(--space-xs) var(--space-lg)',
            cursor: 'pointer',
            color: 'var(--color-text-secondary)',
          }}
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  )

  // The static-markup harness has no document and can't portal.
  return typeof document === 'undefined'
    ? modal
    : createPortal(modal, document.body)
}
