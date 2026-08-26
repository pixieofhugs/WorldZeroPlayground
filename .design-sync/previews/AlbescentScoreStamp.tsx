// AlbescentScoreStamp preview cells (#2496) — the praxis score mark wearing
// Albescent's dress. A wrapper: it renders DefaultScoreStamp whole inside
// `.alb-stamp .alb-moves`, so the spectrum the na stamp already draws is the
// thing that moves. index.css owns the resting form and motion.ornament.css
// owns the motion — a component may not inject a stylesheet (#911).
//
// STILLED, THIS IS THE NA STAMP EXACTLY. Under reduced motion, or before the
// deferred motion sheet is delivered, it rests as the static spectrum stamp an
// unaffiliated player sees — so nothing here carries meaning through motion
// alone. A static capture shows that rest frame, which is the honest one.
//
// One row covers every mount: the praxis cards, the nine praxis-detail rails,
// and the composer's task slip all reach this through the single ScoreStamp
// dispatcher (ADR-0049).
import { AlbescentScoreStamp } from 'worldzero-frontend'
import { makePraxisCard } from './_fixtures'

const wrap: React.CSSProperties = {
  background: 'var(--color-bg-page)', padding: 28, display: 'flex', flexWrap: 'wrap', gap: 28 }

/** Top of its task — the stamp draws with the crown. */
export function Crowned() {
  return (
    <div style={wrap}>
      <AlbescentScoreStamp praxis={makePraxisCard({ task_faction_slug: 'albescent' })} />
    </div>
  )
}

/** Scored but not leading — the stamp alone. */
export function Scored() {
  return (
    <div style={wrap}>
      <AlbescentScoreStamp
        praxis={makePraxisCard({
          task_faction_slug: 'albescent',
          score: 36,
          voter_count: 4,
          is_top_for_task: false,
          points_from_votes: 6,
        })}
      />
    </div>
  )
}

/** Crown suppressed — for surfaces that draw their own. */
export function CrownSuppressed() {
  return (
    <div style={wrap}>
      <AlbescentScoreStamp
        praxis={makePraxisCard({ task_faction_slug: 'albescent' })}
        showCrown={false}
      />
    </div>
  )
}

/** Nobody has voted yet. */
export function Unscored() {
  return (
    <div style={wrap}>
      <AlbescentScoreStamp
        praxis={makePraxisCard({
          task_faction_slug: 'albescent',
          score: 0,
          points_from_votes: 0,
          voter_count: 0,
          is_top_for_task: false,
        })}
      />
    </div>
  )
}
