// SingularityScoreStamp preview cells — the score mark a praxis card wears. Small and
// signature, so each cell is one stamp and the sweep is the states that change
// what it draws: crowned, plain, and unscored.
import { SingularityScoreStamp } from 'worldzero-frontend'
import { makePraxisCard } from './_fixtures'

const wrap: React.CSSProperties = { padding: 28, display: 'flex', flexWrap: 'wrap', gap: 24 }

/** Top of its task: the stamp draws with the crown. */
export function Crowned() {
  return (
    <div style={wrap}>
      <SingularityScoreStamp praxis={makePraxisCard({ task_faction_slug: 'singularity' })} />
    </div>
  )
}

/** Scored but not leading — the stamp alone. */
export function Scored() {
  return (
    <div style={wrap}>
      <SingularityScoreStamp
        praxis={makePraxisCard({ task_faction_slug: 'singularity', score: 36, voter_count: 4, is_top_for_task: false, points_from_votes: 6 })}
      />
    </div>
  )
}

/** Crown suppressed — for surfaces that draw their own (faction pages, mobile). */
export function CrownSuppressed() {
  return (
    <div style={wrap}>
      <SingularityScoreStamp praxis={makePraxisCard({ task_faction_slug: 'singularity' })} showCrown={false} />
    </div>
  )
}

/** Nobody has voted yet. */
export function Unscored() {
  return (
    <div style={wrap}>
      <SingularityScoreStamp
        praxis={makePraxisCard({ task_faction_slug: 'singularity', score: 0, points_from_votes: 0, voter_count: 0, is_top_for_task: false })}
      />
    </div>
  )
}
