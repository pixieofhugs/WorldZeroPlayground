// SingularityTaskCard preview cells — the Singularity terminal readout: dark
// console chrome, monospaced telemetry, node/process framing. Chrome is
// hardcoded to Singularity, so content is passed via taskFor('singularity').
import { SingularityTaskCard } from 'worldzero-frontend'
import { taskFor, noop } from './_fixtures'

const wrap: React.CSSProperties = { padding: 24, display: 'flex', gap: 24, flexWrap: 'wrap' }

/** The readout as seen in a task grid — process meta, directive, telemetry. */
export function Default() {
  const task = taskFor('singularity')
  return (
    <div style={wrap}>
      <SingularityTaskCard task={task} displayPoints={task.point_value} />
    </div>
  )
}

/** With the sign-up affordance (onSignup present → the enlist directive shows). */
export function WithSignup() {
  const task = taskFor('singularity')
  return (
    <div style={wrap}>
      <SingularityTaskCard task={task} displayPoints={task.point_value} onSignup={noop} />
    </div>
  )
}

/** A higher-level, higher-value directive with no description — tests the
 *  console line carrying only a title. */
export function HighLevelNoDescription() {
  const task = taskFor('singularity', {
    id: 208,
    title: 'Quantify one habit you cannot yet measure',
    description: null,
    level_required: 7,
    point_value: 88,
  })
  return (
    <div style={wrap}>
      <SingularityTaskCard task={task} displayPoints={task.point_value} />
    </div>
  )
}
