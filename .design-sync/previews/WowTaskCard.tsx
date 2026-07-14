// WowTaskCard preview cells — Warriors of Whimsy "wow.exe": a lo-fi computer-
// witch window (pastel title bar, dotted-grid body, Caveat notepad panel).
// Chrome is hardcoded to Wow, so content is passed via taskFor('wow').
import { WowTaskCard } from 'worldzero-frontend'
import { taskFor, noop } from './_fixtures'

const wrap: React.CSSProperties = { padding: 24, display: 'flex', gap: 24, flexWrap: 'wrap' }

/** The window as seen in a task grid — quest meta, Caveat title, description. */
export function Default() {
  const task = taskFor('wow')
  return (
    <div style={wrap}>
      <WowTaskCard task={task} displayPoints={task.point_value} />
    </div>
  )
}

/** With the sign-up affordance (onSignup present → the enlist button shows). */
export function WithSignup() {
  const task = taskFor('wow')
  return (
    <div style={wrap}>
      <WowTaskCard task={task} displayPoints={task.point_value} onSignup={noop} />
    </div>
  )
}

/** A higher-level, higher-value quest with no description — tests the notepad
 *  panel carrying only a title. */
export function HighLevelNoDescription() {
  const task = taskFor('wow', {
    id: 205,
    title: 'Stage a surprise kazoo parade',
    description: null,
    level_required: 6,
    point_value: 75,
  })
  return (
    <div style={wrap}>
      <WowTaskCard task={task} displayPoints={task.point_value} />
    </div>
  )
}
