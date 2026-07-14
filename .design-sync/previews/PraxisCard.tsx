// PraxisCard preview cells — the DISPATCHER for a completed proof card. It reads
// praxis.task_faction_slug and renders that faction's bespoke frame (UA gilt plate,
// Everymen ruled sheet, Snide torn evidence, Singularity terminal…), with the
// shared body inside: title + task link, the `{base} + {votes}` score hero, a
// points/mode stat line, and the byline. Cells sweep the crown, a collab crew,
// several skins, and the neutral default.
import { PraxisCard } from 'worldzero-frontend'
import type { PraxisCardOut, PraxisOut } from '../../frontend/src/api/praxis'
import { makePraxis } from './_fixtures'

const wrap: React.CSSProperties = { padding: 24, display: 'flex', gap: 24, flexWrap: 'wrap' }

// PraxisCard's frame consumes a PraxisCardOut (it reads member_count for the crew
// line). makePraxis builds a fuller PraxisOut, so we fold in a member_count derived
// from its members list before handing it to the card.
function asCard(praxis: PraxisOut, memberCount?: number): PraxisCardOut {
  return {
    ...praxis,
    member_count: memberCount ?? praxis.members.length,
    voter_count: 0,
  } as unknown as PraxisCardOut
}

/** UA gilt plate, crowned — top-scoring praxis for its task (the Task Crown stamp
 *  rides the score hero's corner). */
export function UACrowned() {
  const praxis = asCard(makePraxis({ task_faction_slug: 'ua', is_top_for_task: true, score: 54 }))
  return (
    <div style={wrap}>
      <PraxisCard praxis={praxis} />
    </div>
  )
}

/** Everymen ruled sheet — a collab with a crew, so the stat line reads the crew
 *  count instead of "solo". */
export function EverymenCollab() {
  const praxis = asCard(
    makePraxis({
      task_faction_slug: 'everymen',
      type: 'collab',
      is_top_for_task: false,
      title: 'The Saturday Tool Library',
      score: 45,
    }),
    4,
  )
  return (
    <div style={wrap}>
      <PraxisCard praxis={praxis} />
    </div>
  )
}

/** Two more frames side by side — Snide torn evidence and the Singularity
 *  terminal — to show the dispatcher's range. */
export function MoreSkins() {
  const snide = asCard(makePraxis({ task_faction_slug: 'snide', is_top_for_task: false, score: 33 }))
  const singularity = asCard(
    makePraxis({ task_faction_slug: 'singularity', is_top_for_task: false, score: 61 }),
  )
  return (
    <div style={wrap}>
      <PraxisCard praxis={snide} />
      <PraxisCard praxis={singularity} />
    </div>
  )
}

/** Unaffiliated task → the neutral spectrum default skin. */
export function DefaultSkin() {
  const praxis = asCard(
    makePraxis({ task_faction_slug: 'na', is_top_for_task: false, title: 'A quiet accounting', score: 30 }),
  )
  return (
    <div style={wrap}>
      <PraxisCard praxis={praxis} />
    </div>
  )
}
