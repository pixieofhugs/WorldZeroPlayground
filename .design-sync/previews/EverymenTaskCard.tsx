// EverymenTaskCard preview cells — the Everymen community-board notice: plain,
// warm, civic bulletin chrome (the anti-spectacle faction). Chrome is hardcoded
// to Everymen, so content is passed via taskFor('everymen').
import { EverymenTaskCard } from 'worldzero-frontend'
import { taskFor, noop } from './_fixtures'

const wrap: React.CSSProperties = { padding: 24, display: 'flex', gap: 24, flexWrap: 'wrap' }

/** The notice as seen in a task grid — heading, plain-spoken body, points. */
export function Default() {
  const task = taskFor('everymen')
  return (
    <div style={wrap}>
      <EverymenTaskCard task={task} displayPoints={task.point_value} />
    </div>
  )
}

/** With the sign-up affordance (onSignup present → the join button shows). */
export function WithSignup() {
  const task = taskFor('everymen')
  return (
    <div style={wrap}>
      <EverymenTaskCard task={task} displayPoints={task.point_value} onSignup={noop} />
    </div>
  )
}

/** A higher-level, higher-value drive with no description — tests the notice
 *  carrying only a heading. */
export function HighLevelNoDescription() {
  const task = taskFor('everymen', {
    id: 209,
    title: 'Cook a week of meals for a family on the block',
    description: null,
    level_required: 5,
    point_value: 70,
  })
  return (
    <div style={wrap}>
      <EverymenTaskCard task={task} displayPoints={task.point_value} />
    </div>
  )
}
