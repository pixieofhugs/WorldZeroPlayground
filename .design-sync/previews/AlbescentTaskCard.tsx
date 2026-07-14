// AlbescentTaskCard preview cells — the Albescent's quiet vellum correspondence:
// pale, hushed, hand-set chrome (the secret-society register). Chrome is
// hardcoded to Albescent, so content is passed via taskFor('albescent').
import { AlbescentTaskCard } from 'worldzero-frontend'
import { taskFor, noop } from './_fixtures'

const wrap: React.CSSProperties = { padding: 24, display: 'flex', gap: 24, flexWrap: 'wrap' }

/** The correspondence as seen in a task grid — title, quiet body, points. */
export function Default() {
  const task = taskFor('albescent')
  return (
    <div style={wrap}>
      <AlbescentTaskCard task={task} displayPoints={task.point_value} />
    </div>
  )
}

/** With the sign-up affordance (onSignup present → the accept button shows). */
export function WithSignup() {
  const task = taskFor('albescent')
  return (
    <div style={wrap}>
      <AlbescentTaskCard task={task} displayPoints={task.point_value} onSignup={noop} />
    </div>
  )
}

/** A higher-level, higher-value charge with no description — tests the sheet
 *  carrying only a title. */
export function HighLevelNoDescription() {
  const task = taskFor('albescent', {
    id: 210,
    title: 'Keep a confidence no one asked you to keep',
    description: null,
    level_required: 6,
    point_value: 85,
  })
  return (
    <div style={wrap}>
      <AlbescentTaskCard task={task} displayPoints={task.point_value} />
    </div>
  )
}
