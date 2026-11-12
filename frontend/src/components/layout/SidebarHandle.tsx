import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { panelStyle } from './Sidebar'
import PendingBadge from './PendingBadge'

/**
 * The one control that folds the desktop rail away and back (#1191): same
 * handle in both states, styled from the rail's `panelStyle`.
 */
const handleStyle: CSSProperties = {
  ...panelStyle,
  // panelStyle's --space-lg would swallow a 32px-wide control whole.
  padding: 'var(--space-xs)',
  // Chrome, not a rail sheet (#2404): keeps the generic card radius.
  borderRadius: 'var(--radius-xl)',
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
      // The rail stays mounted (#1343), so this id always resolves.
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

export default function SidebarHandle({
  collapsed,
  onToggle,
  pendingCount,
}: {
  readonly collapsed: boolean
  readonly onToggle: () => void
  /** Pending collab invites + duel challenges, badged in BOTH states (#1457):
   *  the rail no longer lists requests (ADR-0070). The badge is aria-hidden, so
   *  the count rides the button's name: hence four labels. */
  readonly pendingCount: number
}) {
  const { t } = useTranslation('common')

  // Literal keys, not a template (copy sweep / typed `t()`).
  const label = collapsed
    ? pendingCount > 0
      ? t('sidebar.toggle.expandWithPending', { count: pendingCount })
      : t('sidebar.toggle.expand')
    : pendingCount > 0
      ? t('sidebar.toggle.collapseWithPending', { count: pendingCount })
      : t('sidebar.toggle.collapse')

  return (
    <HandleButton
      expanded={!collapsed}
      onToggle={onToggle}
      glyph={collapsed ? '›' : '‹'}
      label={label}
    >
      <PendingBadge count={pendingCount} />
    </HandleButton>
  )
}
