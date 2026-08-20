import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { panelStyle } from './Sidebar'
import PendingBadge from './PendingBadge'

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
  // #2404 gave the rail's SHEETS the Default/Albescent 10px rung. This is
  // chrome outside `#wz-sidebar`, not a sheet — it keeps the app's generic card
  // radius, which is exactly what it shipped with, for every viewer.
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

export default function SidebarHandle({
  collapsed,
  onToggle,
  pendingCount,
}: {
  readonly collapsed: boolean
  readonly onToggle: () => void
  /**
   * Pending collab invites + duel challenges. Badged in BOTH states (#1457).
   *
   * WHY IT USED TO BE COLLAPSED-ONLY, AND WHY THAT NO LONGER HOLDS
   * --------------------------------------------------------------
   * The badge was born collapsed-only for a real reason: the expanded rail
   * LISTED the incoming invites and challenges in full, so a number on the
   * handle would have counted a list sitting two inches below it. Folding the
   * rail away hid that list, and the badge existed to replace it.
   *
   * **#1423 deleted the list.** Requests are answered in the queue on
   * `/updates` and nowhere else (ADR-0070). The redundancy the restriction
   * avoided went with the panel, and what was left was an expanded rail that
   * said nothing while the collapsed one said "3 waiting" — backwards, since
   * expanding is the gesture that means "show me more". So the badge follows
   * the count into both states.
   *
   * There is deliberately no `if (collapsed)` branch left to hang it off. One
   * button, one badge, two labels: restricting the badge to a state again would
   * mean re-introducing a branch, which is a visible act rather than a quiet
   * one.
   *
   * The count is a PROP, not a read of its own. It is one number and the parent
   * already has it; since #1344 the panels have a single owner above the whole
   * shell (`SidebarProvider`), so reading it here would cost no request either —
   * it would just be a second subscription to say the same thing.
   *
   * The count reaches assistive tech through the BUTTON's accessible name; the
   * badge itself is decorative and `aria-hidden`, exactly as the mobile bell's
   * is. That is why there are four toggle labels rather than two.
   */
  readonly pendingCount: number
}) {
  const { t } = useTranslation('common')

  // Written out rather than composed from a `sidebar.toggle.${action}` template:
  // a computed key is invisible to the copy sweep and to the typed `t()`.
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
