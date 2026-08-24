// PendingRowPill preview cells. The mobile field desk's pending row, shared by
// all eight phone homes. It states the doctrine the task card later borrowed
// (#2359): a dead-ended pill that still looks pressable is worse than no pill.
//
// So the element follows `row.to`:
//   to: string → a <Link>, and the faction's own chevron is drawn
//   to: null   → a plain <div>, no chevron, because it is a statement rather
//                than a control ('clear' — nothing to go to)
//
// `count` is interpolated into the copy. On 'notifications' a zero means "no
// number", NOT "no news" — the deploy-skew case where a client ahead of its API
// gets no global_activity_count and falls back to wording that needs none.
//
// Unstyled by design — the skin passes className/style/chevron/glyph. These
// cells port UaFieldDesk's own call site (sheet ground, hairline rule, pill
// radius, serif face) so the row reads as a real phone home draws it.
import { PendingRowPill } from 'worldzero-frontend'

const wrap: React.CSSProperties = {
  padding: 24,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  maxWidth: 390,
}

/** UaFieldDesk's own pill treatment, lifted from its call site. */
const PILL: React.CSSProperties = {
  background: 'var(--faction-ua-card-bg)',
  border: '1px solid var(--faction-ua-card-frame)',
  borderRadius: 999,
  padding: 'var(--space-md) var(--space-lg)',
  fontFamily: 'var(--faction-ua-card-font)',
  fontSize: 'var(--text-content)',
  color: 'var(--faction-ua-card-text)',
}

const Chevron = () => (
  <span aria-hidden style={{ opacity: 0.7, fontSize: '1.1em' }}>›</span>
)

/** Outstanding requests — a control, so it links and draws the chevron. */
export function Requests() {
  return (
    <div style={wrap}>
      <PendingRowPill
        row={{ kind: 'requests', count: 3, to: '/updates' }}
        className="flex items-center justify-between"
        style={PILL}
        chevron={<Chevron />}
      />
    </div>
  )
}

/** Waiting news, with the count interpolated into the copy. */
export function Notifications() {
  return (
    <div style={wrap}>
      <PendingRowPill
        row={{ kind: 'notifications', count: 5, to: '/updates' }}
        className="flex items-center justify-between"
        style={PILL}
        chevron={<Chevron />}
      />
    </div>
  )
}

/** Deploy skew: news is waiting but the API predates global_activity_count, so
 *  count is 0 and the pill falls back to wording that needs no number. */
export function NotificationsWithoutCount() {
  return (
    <div style={wrap}>
      <PendingRowPill
        row={{ kind: 'notifications', count: 0, to: '/updates' }}
        className="flex items-center justify-between"
        style={PILL}
        chevron={<Chevron />}
      />
    </div>
  )
}

/** Caught up — `to: null`, so it renders as a plain div with no chevron: a
 *  statement, not a control. This is the doctrine cell. */
export function CaughtUp() {
  return (
    <div style={wrap}>
      <PendingRowPill
        row={{ kind: 'clear', count: 0, to: null }}
        className="flex items-center justify-between"
        style={{ ...PILL, opacity: 0.8 }}
        chevron={<Chevron />}
      />
    </div>
  )
}
