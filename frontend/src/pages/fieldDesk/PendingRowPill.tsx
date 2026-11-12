import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { ACTIVITY_COUNT_CAP } from '../../api/sidebar'
import type { PendingRowState } from './useFieldDeskHome'

/**
 * The summary row under the mobile home's identity card, all three states
 * (#1554). Shared for the rule (copy, link vs div, chevron); skins pass the
 * dress as props. `to === null` renders a plain sentence, not a dead link.
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
        ? activityLabel(row.count, t)
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

/**
 * The middle state's words (#1587). Says "activity", not "notifications"
 * (#2083): the bell counts obligations, this row the rest of the feed
 * (ADR-0070). Exact below the cap, "50+" at it (the count is a floor there).
 * Zero means the API sent no count: use the numberless wording.
 */
function activityLabel(count: number, t: TFunction<'common'>): string {
  if (count === 0) return t('fieldDesk.home.activity')
  if (count >= ACTIVITY_COUNT_CAP) {
    // `cap`, not `count`: avoids i18next plural lookup on a one-form key.
    return t('fieldDesk.home.activityCapped', { cap: ACTIVITY_COUNT_CAP })
  }
  return t('fieldDesk.home.activityCount', { count })
}

/** Inline-flex so an optional `glyph` sits beside the words. */
const LABEL_STYLE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--space-sm)',
}
