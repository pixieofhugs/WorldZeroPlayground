// EverymenPraxisCard preview cells — the desktop praxis card: a submitted proof as it
// appears in a feed or a task's gallery. Chrome is this faction's own, so the
// content is bound to 'everymen' and the variants sweep the states a reader meets.
import { EverymenPraxisCard } from 'worldzero-frontend'
import { makePraxisCard, adminPropsFor } from './_fixtures'

const wrap: React.CSSProperties = { padding: 24, display: 'flex', flexWrap: 'wrap', gap: 24 }

/** The ordinary case: a submitted solo praxis that tops its task. */
export function Submitted() {
  const praxis = makePraxisCard({ task_faction_slug: 'everymen' })
  return (
    <div style={wrap}>
      <EverymenPraxisCard praxis={praxis} adminProps={adminPropsFor(praxis)} />
    </div>
  )
}

/** A collaboration — the member count changes the byline, not the chrome. */
export function Collaboration() {
  const praxis = makePraxisCard({
    task_faction_slug: 'everymen',
    type: 'collab',
    member_count: 3,
    is_top_for_task: false,
    title: 'Three of us, one long afternoon',
  })
  return (
    <div style={wrap}>
      <EverymenPraxisCard praxis={praxis} adminProps={adminPropsFor(praxis)} />
    </div>
  )
}

/** Unscored and not yet crowned — the same card before any votes land. */
export function Unscored() {
  const praxis = makePraxisCard({
    task_faction_slug: 'everymen',
    score: 0,
    points_from_votes: 0,
    voter_count: 0,
    is_top_for_task: false,
  })
  return (
    <div style={wrap}>
      <EverymenPraxisCard praxis={praxis} adminProps={adminPropsFor(praxis)} showCrown={false} />
    </div>
  )
}

/** The moderator's view: the same card with the hide/fail controls revealed. */
export function Moderated() {
  const praxis = makePraxisCard({ task_faction_slug: 'everymen' })
  return (
    <div style={wrap}>
      <EverymenPraxisCard
        praxis={praxis}
        adminProps={adminPropsFor(praxis, { showAdminControls: true })}
      />
    </div>
  )
}
