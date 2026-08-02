import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { PendingRowState } from './useFieldDeskHome'

/**
 * The summary row under the mobile home's identity card, in all three of its
 * states (#1554).
 *
 * WHY THIS IS SHARED WHEN THE EIGHT HOME SKINS ARE NOT
 * ----------------------------------------------------
 * Epic #1552 records that the mobile and desktop homes are deliberately
 * different screens, and each faction keeps its own dress — so the pill's
 * ground, border, type and chevron glyph stay with the skin and arrive here as
 * props. What does NOT vary is the rule: which copy, whether the row is a link,
 * and whether it draws a chevron at all. That rule was previously restated at
 * eight call sites as `{pendingCount > 0 && <Link …>}`, and the state this issue
 * adds is precisely the one a restatement gets wrong — a "nothing waiting" row
 * that still renders as an anchor is a dead end the player will tap.
 *
 * So: one component decides `<Link>` vs `<div>`, one decides the chevron, one
 * resolves the copy; the caller decides how it all looks. `to === null` is the
 * whole of the third state — no link, no chevron, and none of the tap-highlight
 * an anchor gets for free on a phone. It is not a disabled control; it is a
 * sentence, which is why it is still on screen at all rather than hidden per
 * CLAUDE.md's "hide unusable controls".
 */
export default function PendingRowPill({
  row,
  className,
  style,
  chevron,
  glyph,
}: {
  row: PendingRowState
  className?: string
  style?: CSSProperties
  /** The faction's own chevron — drawn only when the row leads somewhere. */
  chevron: ReactNode
  /** Optional faction mark set before the label (Coven's sigil, WOW's spark). */
  glyph?: ReactNode
}) {
  const { t } = useTranslation('common')
  const label =
    row.kind === 'requests'
      ? t('fieldDesk.home.pending', { count: row.count })
      : row.kind === 'notifications'
        ? t('fieldDesk.home.notifications')
        : t('fieldDesk.home.caughtUp')

  const body = (
    <>
      <span style={LABEL_STYLE}>
        {glyph}
        {label}
      </span>
      {row.to !== null && chevron}
    </>
  )

  if (row.to === null) {
    return (
      <div className={className} style={style}>
        {body}
      </div>
    )
  }
  return (
    <Link to={row.to} className={className} style={style}>
      {body}
    </Link>
  )
}

/** Inline-flex so a skin that passes a `glyph` gets it set beside the words;
 *  with no glyph it renders identically to the bare span it replaces. */
const LABEL_STYLE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--space-sm)',
}
