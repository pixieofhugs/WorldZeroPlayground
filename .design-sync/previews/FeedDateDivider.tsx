// FeedDateDivider preview — the hairline "TODAY / YESTERDAY / <date>" separator
// that groups the activity feed by day. It takes a pre-computed `label` string
// (the sibling getDateLabel helper resolves relative-day wording upstream). We
// stack a few labels so the rule + centered caption reads.
import { FeedDateDivider } from 'worldzero-frontend'

const wrap: React.CSSProperties = { padding: '8px 24px', maxWidth: 420 }

/** The three label shapes the feed emits: relative days plus an absolute date. */
export function DayGroups() {
  return (
    <div style={wrap}>
      <FeedDateDivider label="Today" />
      <FeedDateDivider label="Yesterday" />
      <FeedDateDivider label="June 28, 2026" />
    </div>
  )
}

/** A single divider between two mock rows, to show it in feed context. */
export function BetweenRows() {
  const rowText: React.CSSProperties = {
    fontFamily: "'Courier Prime', monospace",
    fontSize: 11,
    color: 'var(--color-text-secondary)',
    padding: '4px 2px',
  }
  return (
    <div style={wrap}>
      <div style={rowText}>Ada Reed submitted a charcoal study</div>
      <FeedDateDivider label="Yesterday" />
      <div style={rowText}>Pip Marigold admired your submission</div>
    </div>
  )
}
