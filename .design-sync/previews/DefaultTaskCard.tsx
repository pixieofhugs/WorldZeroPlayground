// DefaultTaskCard preview cells — the na/unaffiliated skin (and the fallback for
// any faction without a bespoke card). A clean sheet in a thick spectrum band
// (every faction colour at once = all paths open), ringed by the seven-segment
// sigil. Content passed via taskFor('na').
import { DefaultTaskCard } from 'worldzero-frontend'
import { taskFor, makeTask, noop } from './_fixtures'

const wrap: React.CSSProperties = { padding: 24, display: 'flex', gap: 24, flexWrap: 'wrap' }

/** The unaffiliated sheet as seen in a task grid — eyebrow, title, description. */
export function Default() {
  const task = taskFor('na')
  return (
    <div style={wrap}>
      <DefaultTaskCard task={task} displayPoints={task.point_value} />
    </div>
  )
}

/** With the sign-up affordance (onSignup present → the enlist button shows). */
export function WithSignup() {
  const task = taskFor('na')
  return (
    <div style={wrap}>
      <DefaultTaskCard task={task} displayPoints={task.point_value} onSignup={noop} />
    </div>
  )
}

/** Faction-less task (primary_faction_slug null) with no description at a higher
 *  level — tests the sheet carrying only a title. */
export function HighLevelNoDescription() {
  const task = makeTask({
    id: 211,
    primary_faction_slug: null,
    title: 'Choose a faction, or stay open to all of them',
    description: null,
    level_required: 5,
    point_value: 60,
  })
  return (
    <div style={wrap}>
      <DefaultTaskCard task={task} displayPoints={task.point_value} />
    </div>
  )
}
