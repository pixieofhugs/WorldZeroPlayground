/**
 * The feed's drop-to-accept modal (#322 collab / #314 duel), lifted out of the
 * card and onto `document.body` (#1273).
 *
 * WHY IT IS A PORTAL. Both cards used to render this overlay as their own
 * child, with `position: fixed; inset: 0`. That is written to cover the
 * viewport and it never did. The feed chassis is `.sidebar-card`, which sets
 * `backdrop-filter: blur(var(--card-blur))`, and a `backdrop-filter` other than
 * `none` establishes a containing block for `position: fixed` descendants
 * exactly as `transform` and `filter` do. So `inset: 0` resolved to the ~120px
 * card. Seven of the nine faction frames then clip their ornament with
 * `overflow: hidden` (epic #1192's bespoke chassis dress), which turned a
 * mispositioned overlay into a clipped, substantially unusable one — the state
 * #1148 found and deliberately refused to make worse.
 *
 * `createPortal` to `document.body` escapes both at once: the containing block,
 * because the overlay is no longer a descendant of the card, and every
 * ancestor's `overflow`, for the same reason. This is the shape `ConfirmDialog`
 * (#1082) already uses, including the guard below.
 *
 * WHY IT IS ONE COMPONENT. The collab and duel cards drew the same modal twice,
 * character for character, and the portal + Escape + focus wiring the move to
 * `document.body` requires would have been a third and fourth copy. Everything
 * that actually differs between the two — the wording, and what "drop this one"
 * does to a praxis (delete if you authored it, leave if you joined) — arrives as
 * props, so this component carries no policy and no i18n keys of its own. That
 * also keeps each card's literal `feed:*.bankFull.*` keys in the card file,
 * where the catalog sweep can still see them.
 *
 * ACCESSIBILITY IS NOT OPTIONAL HERE. Appended at the end of `<body>`, an
 * unlabelled div is a nameless blob a long Tab away from the button that opened
 * it — a portal that keeps its labelling and its focus is the difference between
 * fixing a visual bug and trading it for an access one. So it is a named
 * `role="dialog"`, focus moves into the panel on open, and Escape dismisses.
 * None of those three can run in this repo's `renderToStaticMarkup` harness
 * (no DOM, no effects), so only the static contract is asserted in tests and the
 * behaviour is hand-verified — the same split `ConfirmDialog` documents.
 */
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

/** One in-progress praxis the viewer may drop to free a bank slot. */
interface BankFullDropOption {
  /** The praxis id — the React key, never rendered. */
  id: number
  /** The fully worded button, built by the caller from its own catalog keys. */
  label: string
  /** Drop this praxis and retry the accept. Delete vs. leave is the caller's. */
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
  /** A drop is in flight — every choice is inert until it settles. */
  busy: boolean
  /** A failed drop/retry, already worded. Empty when there is nothing to say. */
  error: string
  onDismiss: () => void
}) {
  const titleId = useId()
  const bodyId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  // Focus lands on the panel, not on a drop button: every drop destroys or
  // leaves a praxis, so nothing in here is a safe default to pre-select. The
  // panel's name and description are read out instead.
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
        {/* The dialog's accessible name, and the one site in the feed that
            unambiguously NAMES A REGION — so it takes `.label-heading` while
            the failure line below, which is genuinely read, takes the caption
            tier (#1307). */}
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
                fontFamily: "'Courier Prime', monospace",
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
        {/* Face is `.feed-action` (#1783). This copy was the odd one of the
            eight — it had dropped the 0.1em tracking the other seven carry —
            so it picks that up here, which is the drift a de-duplication is
            for. */}
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

  // The guard is for this repo's test harness: `renderToStaticMarkup` runs with
  // no document and cannot render a portal, so there the tree stays inline and
  // the markup is still assertable. In the browser this branch is never taken.
  return typeof document === 'undefined'
    ? modal
    : createPortal(modal, document.body)
}
