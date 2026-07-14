// EphemeristsTaskCard preview cells — the Ephemerists' archival specimen card:
// museum-label restraint, catalogue numbering, a field-note register. Chrome is
// hardcoded to Ephemerists, so content is passed via taskFor('ephemerists').
import { EphemeristsTaskCard } from 'worldzero-frontend'
import { taskFor, noop } from './_fixtures'

const wrap: React.CSSProperties = { padding: 24, display: 'flex', gap: 24, flexWrap: 'wrap' }

/** The specimen label as seen in a task grid — catalogue meta, title, note. */
export function Default() {
  const task = taskFor('ephemerists')
  return (
    <div style={wrap}>
      <EphemeristsTaskCard task={task} displayPoints={task.point_value} />
    </div>
  )
}

/** With the sign-up affordance (onSignup present → the enrol button shows). */
export function WithSignup() {
  const task = taskFor('ephemerists')
  return (
    <div style={wrap}>
      <EphemeristsTaskCard task={task} displayPoints={task.point_value} onSignup={noop} />
    </div>
  )
}

/** A higher-level, higher-value survey with no description — tests the label
 *  carrying only a catalogue title. */
export function HighLevelNoDescription() {
  const task = taskFor('ephemerists', {
    id: 207,
    title: 'Transcribe the marginalia in the closed-stacks folio',
    description: null,
    level_required: 6,
    point_value: 80,
  })
  return (
    <div style={wrap}>
      <EphemeristsTaskCard task={task} displayPoints={task.point_value} />
    </div>
  )
}
