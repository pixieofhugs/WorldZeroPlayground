import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { ACTIVITY_COUNT_CAP } from '../../api/sidebar'
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
 * The middle state's words, in the only three shapes its number can take (#1587).
 *
 * IT SAYS ACTIVITY, NOT "NOTIFICATIONS" (#2083). This row counts
 * `global_activity` — the viewer's live feed MINUS their obligations — and the
 * bell counts the obligations. One feed, partitioned once (ADR-0070), never two
 * systems. But "1 notification" here beside a silent bell up in the header read
 * as a broken bell rather than as two true statements about two halves, because
 * nothing on either said which half it was. So this half is a LOG of events and
 * says so, and the bell names the queue of things awaiting an answer.
 *
 * EXACT below the cap, "50+" at or above it. `global_activity_count` is the
 * length of a fetch whose every source stops at `SUB_QUERY_LIMIT` rows, so a
 * total under that cap cannot have come from a truncated source and is provably
 * the whole of it; a total at or above it is a floor. One comparison, and the
 * figure on screen is never a lie.
 *
 * ZERO IS "NO NUMBER". `selectPendingRow` only reaches this state with news
 * waiting, so a zero here means the response carried no count — a client
 * deployed ahead of its API. It reads as the numberless wording, which is true
 * at any volume, rather than "undefined events".
 */
function activityLabel(count: number, t: TFunction<'common'>): string {
  if (count === 0) return t('fieldDesk.home.activity')
  if (count >= ACTIVITY_COUNT_CAP) {
    // `cap`, not `count`: a bare `count` would send i18next hunting for plural
    // suffixes this one-form key does not have.
    return t('fieldDesk.home.activityCapped', { cap: ACTIVITY_COUNT_CAP })
  }
  return t('fieldDesk.home.activityCount', { count })
}

/** Inline-flex so a skin that passes a `glyph` gets it set beside the words;
 *  with no glyph it renders identically to the bare span it replaces. */
const LABEL_STYLE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--space-sm)',
}
