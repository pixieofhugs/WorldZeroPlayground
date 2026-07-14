// UATaskCard preview cells — the flagship UA "gilt salon" task placard. This is
// the font/color calibration canary: it exercises the Marcellus / Playfair /
// EB Garamond stack, the gold-leaf frame, the crest, and the motto ribbon.
import { UATaskCard } from 'worldzero-frontend'
import { taskFor, noop } from './_fixtures'

const wrap: React.CSSProperties = { padding: 24, display: 'flex', gap: 24, flexWrap: 'wrap' }

/** The plate as seen in a task grid — long title, description, points footer. */
export function Default() {
  const task = taskFor('ua')
  return (
    <div style={wrap}>
      <UATaskCard task={task} displayPoints={task.point_value} />
    </div>
  )
}

/** With the "Matriculate" sign-up affordance (onSignup present → button shows). */
export function WithSignup() {
  const task = taskFor('ua')
  return (
    <div style={wrap}>
      <UATaskCard task={task} displayPoints={task.point_value} onSignup={noop} />
    </div>
  )
}

/** A higher-level, higher-value commission with no description — tests the
 *  layout when the salon plate carries only a title. */
export function HighLevelNoDescription() {
  const task = taskFor('ua', {
    id: 202,
    title: 'Restore the water-damaged fresco in the east reading room',
    description: null,
    level_required: 6,
    point_value: 90,
  })
  return (
    <div style={wrap}>
      <UATaskCard task={task} displayPoints={task.point_value} />
    </div>
  )
}
