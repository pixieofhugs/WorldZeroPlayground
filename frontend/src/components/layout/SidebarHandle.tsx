import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { usePendingRequests } from '../../hooks/usePendingRequests'
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
      // Collapsed means the rail is UNMOUNTED, so a kept `aria-controls` would
      // name an id that is not on the page — an axe `aria-valid-attr-value`
      // failure and a dead reference for a screen reader to follow.
      // `aria-expanded` carries the state on its own.
      aria-controls={expanded ? 'wz-sidebar' : undefined}
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
 * The collapsed handle owns the pending-request read, and is mounted ONLY while
 * collapsed — so there is never a second `limit: 100` fetch racing the expanded
 * `Sidebar`'s own one. The count has to live here rather than in a badge-only
 * child because it must reach assistive tech through the BUTTON's accessible
 * name; the badge itself is decorative and `aria-hidden`, exactly as the mobile
 * bell's is.
 *
 * Without this, folding the rail away would silently hide incoming collab
 * invites and duel challenges — the sidebar panel is their only desktop surface.
 */
function CollapsedHandle({ onToggle }: { readonly onToggle: () => void }) {
  const { t } = useTranslation('common')
  const { pendingRequests } = usePendingRequests()
  const pendingCount = pendingRequests.length

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
}: {
  readonly collapsed: boolean
  readonly onToggle: () => void
}) {
  const { t } = useTranslation('common')

  if (collapsed) return <CollapsedHandle onToggle={onToggle} />

  return (
    <HandleButton
      expanded
      onToggle={onToggle}
      glyph="‹"
      label={t('sidebar.toggle.collapse')}
    />
  )
}
