// SnideTaskCard preview cells — the SNIDE agit-prop broadside: photocopied-zine
// chrome, ransom type, wheatpaste grit. Chrome is hardcoded to SNIDE, so
// content is passed via taskFor('snide').
import { SnideTaskCard } from 'worldzero-frontend'
import { taskFor, noop } from './_fixtures'

const wrap: React.CSSProperties = { padding: 24, display: 'flex', gap: 24, flexWrap: 'wrap' }

/** The broadside as seen in a task grid — title, agitational body, points. */
export function Default() {
  const task = taskFor('snide')
  return (
    <div style={wrap}>
      <SnideTaskCard task={task} basePoints={task.point_value} multiplier={1} inProgressCount={0} />
    </div>
  )
}

/** With the sign-up affordance (onSignup present → the enlist button shows). */
export function WithSignup() {
  const task = taskFor('snide')
  return (
    <div style={wrap}>
      <SnideTaskCard task={task} basePoints={task.point_value} multiplier={1} inProgressCount={0} onSignup={noop} />
    </div>
  )
}

/** A higher-level, higher-value action with no description — tests the layout
 *  when the broadside carries only a headline. */
export function HighLevelNoDescription() {
  const task = taskFor('snide', {
    id: 206,
    title: 'Occupy the empty lot and plant it before dawn',
    description: '',
    level_required: 7,
    point_value: 95,
  })
  return (
    <div style={wrap}>
      <SnideTaskCard task={task} basePoints={task.point_value} multiplier={1} inProgressCount={0} />
    </div>
  )
}
