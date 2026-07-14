// CommentThread preview cells — the neutral, multi-faction comment container
// (ADR-0006). NOTE: this component FETCHES its own comments over the network, which
// is disabled in previews, so the rendered thread is empty (heading count 0 +
// load state). What it CAN show statically is the composer: auth is mocked to an
// authenticated UA player with can_comment, so the UA-voiced gilt composer renders
// its real state. The seven faction *Comment voices are the populated showcase.
import { CommentThread } from 'worldzero-frontend'

const wrap: React.CSSProperties = { padding: 24, maxWidth: 520 }

/** Praxis thread — heading + (network-empty) rows + the live UA gilt composer. */
export function PraxisThread() {
  return (
    <div style={wrap}>
      <CommentThread target="praxes" targetId={501} />
    </div>
  )
}

/** Task thread — same container against a task target; composer still renders. */
export function TaskThread() {
  return (
    <div style={wrap}>
      <CommentThread target="tasks" targetId={101} />
    </div>
  )
}
