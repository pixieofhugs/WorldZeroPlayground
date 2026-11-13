/**
 * Shared confirm dialog (#1082), replacing `window.confirm`. No policy: the words
 * arrive as a `ConfirmRequest` (`composerConfirms.ts`). Same chrome as
 * `DuelSealConfirm`; `[dismiss] … [confirm]` order (#646); edge in the faction accent.
 *
 * A11y: labelled/described dialog, document-level Escape, focus on DISMISS (the
 * safe half), Tab trapped, focus restored on close (#2161), backdrop click
 * dismisses. These need a DOM, so they are verified by hand.
 * Settings' delete-account uses `children` + `confirmDisabled` (#2161).
 */
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useFormFactor } from '../../hooks/useFormFactor'
import { factionCssVar } from '../../utils/factions'

/** One confirm, fully worded. */
export interface ConfirmRequest {
  /** Not rendered: keys the focus effect and names the case for tests. */
  kind: string
  title: string
  /** The consequence, never "are you sure". */
  body: string
  /** A consequence that applies to some instances of this case only. */
  note?: string
  /** Never a bare "OK". */
  confirmLabel: string
  danger?: boolean
}

/** Focusable now; disabled nodes excluded or the Tab wrap lands on a dead node. */
const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'

export default function ConfirmDialog({
  request,
  factionSlug,
  onConfirm,
  onDismiss,
  confirmDisabled = false,
  children,
}: {
  request: ConfirmRequest
  factionSlug: string | null | undefined
  onConfirm: () => void
  onDismiss: () => void
  /** Type-to-confirm gate (#2161). */
  confirmDisabled?: boolean
  /** Content between body and footer, inside the focus trap. */
  children?: ReactNode
}) {
  const { t } = useTranslation('forms')
  const isMobile = useFormFactor() === 'mobile'
  const titleId = useId()
  const bodyId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const dismissRef = useRef<HTMLButtonElement>(null)

  // Restore focus on close (#2161). MUST be declared before the auto-focus effect:
  // effects run in order, and after it `activeElement` is our own dismiss button.
  useEffect(() => {
    const opener = document.activeElement
    return () => {
      if (opener instanceof HTMLElement) opener.focus()
    }
  }, [])

  // Focus the safe action; keyed on `kind` so a replacing confirm re-focuses.
  useEffect(() => {
    dismissRef.current?.focus()
  }, [request.kind])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onDismiss])

  // Keep Tab inside the panel.
  const keepTabInside = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return
    const buttons = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)
    if (!buttons || buttons.length === 0) return
    const first = buttons[0]
    const last = buttons[buttons.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const accent = factionCssVar(factionSlug, 'card-accent')

  const dialog = (
    <div
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onDismiss()
      }}
      className={`fixed inset-0 z-50 flex justify-center ${
        isMobile ? 'items-end' : 'items-center'
      }`}
      style={{
        padding: isMobile ? 0 : 'var(--space-lg)',
        background: 'var(--color-overlay-strong)',
      }}
    >
      <div
        ref={panelRef}
        // For the nightly (#2453): titles are per-faction copy.
        data-testid="confirm-dialog"
        data-confirm-kind={request.kind}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        onKeyDown={keepTabInside}
        className="flex flex-col"
        style={{
          gap: 'var(--space-md)',
          padding: 'var(--space-lg)',
          width: isMobile ? '100%' : 'min(440px, 100%)',
          background: 'var(--color-bg-page)',
          border: isMobile ? 'none' : `2px solid ${accent}`,
          borderRadius: isMobile ? '16px 16px 0 0' : 12,
          // No --shadow-* token; the colour half is the themed one.
          boxShadow: '0 8px 28px var(--color-cast-shadow)',
        }}
      >
        <h2
          id={titleId}
          className="font-display"
          style={{
            fontSize: 'var(--text-content)',
            color: 'var(--color-text-primary)',
          }}
        >
          {request.title}
        </h2>
        <p
          id={bodyId}
          className="font-body content-text"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {request.body}
        </p>
        {request.note && (
          <p
            className="font-body content-text"
            style={{
              color: request.danger
                ? 'var(--color-danger)'
                : 'var(--color-text-secondary)',
            }}
          >
            {request.note}
          </p>
        )}
        {children}
        {/* footer order (#646) */}
        <div
          className="flex items-center"
          style={{ gap: 'var(--space-sm)', marginLeft: 'auto' }}
        >
          <button
            ref={dismissRef}
            type="button"
            onClick={onDismiss}
            className="font-body"
            style={{
              fontSize: 'var(--text-md)',
              padding: 'var(--space-sm) var(--space-md)',
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            {t('editPraxis.confirm.dismiss')}
          </button>
          <button
            type="button"
            data-testid="confirm-accept"
            onClick={onConfirm}
            disabled={confirmDisabled}
            // `.control-off` overrides the inline fill/ink with `!important` when disabled.
            className="font-body control-off"
            style={{
              fontSize: 'var(--text-md)',
              padding: 'var(--space-sm) var(--space-lg)',
              background: request.danger ? 'var(--color-danger)' : accent,
              // One ink per fill (#1169, #924).
              color: request.danger
                ? 'var(--color-on-danger)'
                : factionCssVar(factionSlug, 'on-accent'),
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            {request.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )

  // Portalled: a transformed ancestor (e.g. a rotated composer panel) would anchor
  // `position: fixed` to itself. Inline when there's no document (static tests).
  return typeof document === 'undefined'
    ? dialog
    : createPortal(dialog, document.body)
}
