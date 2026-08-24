/**
 * The composer's shared confirm dialog (#1082).
 *
 * `window.confirm` was doing this job at seven points in the edit-praxis path.
 * It is OS chrome: unstyleable, un-dressable by the faction the surface is
 * wearing, and invisible to this repo's `renderToStaticMarkup` harness, so none
 * of the consequences it stated were ever asserted anywhere.
 *
 * This is one component for all seven. It carries no policy: everything it says
 * arrives as a `ConfirmRequest` from `composerConfirms.ts`, so the copy for each
 * case can be built and tested without a browser.
 *
 * CHROME — deliberately the same shape as `metataskSeal/MetataskRemoveConfirm` and
 * `duel/DuelSealConfirm`, the two in-page confirms already mounted on this
 * surface: fixed dim overlay, desktop centred card / mobile bottom sheet via
 * `useFormFactor()`, `[dismiss] … [confirm]` footer order (#646). The panel's
 * edge takes the task faction's accent so the dialog belongs to the surface
 * underneath it rather than to the operating system.
 *
 * ACCESSIBILITY — this is the most accessible of the three, deliberately. The
 * existing pair label themselves with `aria-label` and neither traps focus nor
 * handles Escape; a confirm that can only be dismissed with a mouse is not
 * dismissable. So:
 *   - `role="dialog"` + `aria-modal`, named by `aria-labelledby` (the heading it
 *     actually renders) and described by `aria-describedby` (the consequence),
 *     so a screen reader reads the stakes on open rather than a bare title.
 *   - Escape dismisses, from a document-level listener, so it works even if the
 *     click that opened it left focus outside the panel.
 *   - Focus moves to the DISMISS button on open — the safe half of a dialog
 *     whose other half is usually destructive — and Tab cycles between the two
 *     buttons instead of walking the page behind the overlay.
 *   - Clicking the backdrop dismisses, same as Escape.
 * Every one of those behaviours needs a DOM and effects; the test harness here
 * has neither, so they are verified by hand, and only the static contract
 * (roles, names, rendered copy) is asserted in tests.
 */
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useFormFactor } from '../../hooks/useFormFactor'
import { factionCssVar } from '../../utils/factions'

/**
 * One confirm, fully worded. Built by `composerConfirms.ts`; the dialog only
 * draws it.
 */
export interface ConfirmRequest {
  /**
   * Which confirm this is — `delete`, `leave`, `kick`, … Not rendered: it keys
   * the dialog (so a second request re-runs the focus effect) and gives tests
   * and the PR a stable name for each case.
   */
  kind: string
  /** The question, as the heading and the dialog's accessible name. */
  title: string
  /** What confirming does. Always the consequence, never "are you sure". */
  body: string
  /** A consequence that applies to some instances of this case only. */
  note?: string
  /** The affirmative button's words — never a bare "OK". */
  confirmLabel: string
  /** Paint the affirmative button as destructive. */
  danger?: boolean
}

export default function ConfirmDialog({
  request,
  factionSlug,
  onConfirm,
  onDismiss,
}: {
  request: ConfirmRequest
  /** The task's faction — the dialog wears the surface it interrupts. */
  factionSlug: string | null | undefined
  onConfirm: () => void
  onDismiss: () => void
}) {
  const { t } = useTranslation('forms')
  const isMobile = useFormFactor() === 'mobile'
  const titleId = useId()
  const bodyId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const dismissRef = useRef<HTMLButtonElement>(null)

  // Focus the safe action, not the destructive one. Keyed on `kind` so a second
  // confirm opening in place of a first re-focuses.
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

  // Keep Tab inside the panel. Two buttons, so the "trap" is just wrapping the
  // ends — no need for a general focusable-node walk.
  const keepTabInside = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return
    const buttons = panelRef.current?.querySelectorAll<HTMLElement>('button')
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
        // Named for the nightly (#2453): `request.kind` says which confirm this
        // is without reading its title, which is per-faction catalog copy.
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
          // No --shadow-* token exists; the colour half is the one that would
          // drift between themes, so it is the half that comes from a token.
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
        {/* [dismiss] … [affirmative] — the global footer order (#646). */}
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
            className="font-body"
            style={{
              fontSize: 'var(--text-md)',
              padding: 'var(--space-sm) var(--space-lg)',
              background: request.danger ? 'var(--color-danger)' : accent,
              // One ink per fill (#1169). --color-bg-page was answering for
              // both and is a claim about neither: 4.40:1 on the light danger
              // red, and on a faction accent the legible ink is whatever
              // -on-accent says it is (#924), not the page ground.
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

  // Drawn at the document root, wherever it was mounted from. The kick confirm
  // renders from inside `CollabRoster`, which faction composers place inside
  // rotated/transformed panels — and a `position: fixed` overlay inside a
  // transformed ancestor positions against that ancestor instead of the
  // viewport, which would leave the dialog clipped or off-screen.
  //
  // The guard is for this repo's test harness: `renderToStaticMarkup` runs with
  // no document and cannot render a portal, so there the tree stays inline and
  // the markup is still assertable.
  return typeof document === 'undefined'
    ? dialog
    : createPortal(dialog, document.body)
}
