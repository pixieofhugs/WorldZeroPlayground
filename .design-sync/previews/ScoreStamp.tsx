// ScoreStamp preview cells — the dispatcher. It reads the praxis's TASK faction
// (not the author's) and draws that faction's stamp, so the sweep across slugs
// is the whole point: one call, every mark.
import { ScoreStamp } from 'worldzero-frontend'
import { makePraxisCard, FACTION_SLUGS } from './_fixtures'

const grid: React.CSSProperties = {
  padding: 28,
  display: 'flex',
  flexWrap: 'wrap',
  gap: 28,
}

/** Every faction's stamp, dispatched off the task's slug. */
export function EveryFaction() {
  return (
    <div style={grid}>
      {FACTION_SLUGS.map((slug) => (
        <ScoreStamp key={slug} praxis={makePraxisCard({ task_faction_slug: slug })} />
      ))}
    </div>
  )
}

/** An unaffiliated task's stamp — the neutral mark, not a borrowed one. */
export function Unaffiliated() {
  return (
    <div style={grid}>
      <ScoreStamp praxis={makePraxisCard({ task_faction_slug: null })} />
    </div>
  )
}

/** Crowned, plain, and unscored — the three states any stamp can be in. */
export function States() {
  return (
    <div style={grid}>
      <ScoreStamp praxis={makePraxisCard({ task_faction_slug: 'ua' })} />
      <ScoreStamp
        praxis={makePraxisCard({ task_faction_slug: 'ua', score: 36, voter_count: 4, is_top_for_task: false, points_from_votes: 6 })}
      />
      <ScoreStamp
        praxis={makePraxisCard({ task_faction_slug: 'ua', score: 0, points_from_votes: 0, voter_count: 0, is_top_for_task: false })}
      />
    </div>
  )
}
