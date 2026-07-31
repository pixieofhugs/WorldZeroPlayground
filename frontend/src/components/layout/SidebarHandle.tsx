import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { panelStyle } from './Sidebar'

/**
 * The one control that folds the desktop rail away and brings it back (#1191).
 *
 * ONE control, not two: the same handle sits at the top of the left column in
 * both states, so there is no orphan "reopen" tab floating in the dead space
 * outside the shell. It borrows the rail's own `panelStyle`, so it reads as part
 * of the rail rather than a bolted-on button — and inherits dark mode for free.
 *
 * It is deliberately a `<button>`: keyboard-reachable, with an accessible name
 * that says where it takes you and an `aria-expanded` that says where you are.
 */
const handleStyle: CSSProperties = {
  ...panelStyle,
  // panelStyle's --space-lg would swallow a 32px-wide control whole.
  padding: 'var(--space-xs)',
  color: 'var(--color-text-secondary)',
  fontSize: 'var(--text-content)',
  lineHeight: 1,
  cursor: 'pointer',
}

function HandleButton({
  expanded,
  label,
  glyph,
  onToggle,
  children,
}: {
  readonly expanded: boolean
  readonly label: string
  readonly glyph: string
  readonly onToggle: () => void
  readonly children?: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      // The rail stays on the page in both states (#1343), so this is a textbook
      // disclosure: `aria-controls` always resolves to a real id and
      // `aria-expanded` says whether that region is showing.
      aria-controls="wz-sidebar"
      aria-label={label}
      title={label}
      className="flex flex-col items-center gap-1 w-8 mb-4"
      style={handleStyle}
    >
      <span aria-hidden="true">{glyph}</span>
      {children}
    </button>
  )
}

/**
 * The collapsed handle carries the pending-request count, because folding the
 * rail away would otherwise silently hide incoming collab invites and duel
 * challenges — the sidebar panel is their only desktop surface. The count
 * reaches assistive tech through the BUTTON's accessible name; the badge itself
 * is decorative and `aria-hidden`, exactly as the mobile bell's is.
 *
 * The count is a PROP, not a read of its own. It is one number and the parent
 * already has it; since #1344 the panels have a single owner above the whole
 * shell (`SidebarProvider`), so reading it here would cost no request either —
 * it would just be a second subscription to say the same thing.
 */
function CollapsedHandle({
  onToggle,
  pendingCount,
}: {
  readonly onToggle: () => void
  readonly pendingCount: number
}) {
  const { t } = useTranslation('common')

  return (
    <HandleButton
      expanded={false}
      onToggle={onToggle}
      glyph="›"
      label={
        pendingCount > 0
          ? t('sidebar.toggle.expandWithPending', { count: pendingCount })
          : t('sidebar.toggle.expand')
      }
    >
      {pendingCount > 0 && (
        <span
          aria-hidden="true"
          className="flex items-center justify-center font-body"
          style={{
            minWidth: 15,
            height: 15,
            padding: '0 var(--space-xs)',
            borderRadius: 999,
            fontSize: 'var(--text-sm)',
            fontWeight: 700,
            lineHeight: 1,
            color: 'var(--color-text-on-accent)',
            background: 'var(--badge-collab)',
          }}
        >
          {pendingCount}
        </span>
      )}
    </HandleButton>
  )
}

export default function SidebarHandle({
  collapsed,
  onToggle,
  pendingCount,
}: {
  readonly collapsed: boolean
  readonly onToggle: () => void
  /** Pending collab invites + duel challenges; badged only while collapsed. */
  readonly pendingCount: number
}) {
  const { t } = useTranslation('common')

  if (collapsed) return <CollapsedHandle onToggle={onToggle} pendingCount={pendingCount} />

  return (
    <HandleButton
      expanded
      onToggle={onToggle}
      glyph="‹"
      label={t('sidebar.toggle.collapse')}
    />
  )
}
