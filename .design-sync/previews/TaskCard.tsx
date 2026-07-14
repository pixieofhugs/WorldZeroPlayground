// TaskCard preview cells — the DISPATCHER. It reads task.primary_faction_slug
// and renders the matching faction skin (UA / Wow / SNIDE / Ephemerists /
// Singularity / Everymen / Albescent), falling back to the Default skin for
// na/unaffiliated. It also overlays the META badge for metatasks. These cells
// sweep a few slugs so the card RANGE is visible in one sheet.
import { TaskCard } from 'worldzero-frontend'
import { taskFor, makeTask, noop } from './_fixtures'

const wrap: React.CSSProperties = { padding: 24, display: 'flex', gap: 24, flexWrap: 'wrap' }

/** Three faction skins side by side — shows the dispatcher picking chrome by slug. */
export function FactionSpread() {
  const wow = taskFor('wow')
  const snide = taskFor('snide')
  const singularity = taskFor('singularity')
  return (
    <div style={wrap}>
      <TaskCard task={wow} displayPoints={wow.point_value} />
      <TaskCard task={snide} displayPoints={snide.point_value} />
      <TaskCard task={singularity} displayPoints={singularity.point_value} />
    </div>
  )
}

/** More of the range — Ephemerists, Everymen, Albescent. */
export function MoreFactions() {
  const ephemerists = taskFor('ephemerists')
  const everymen = taskFor('everymen')
  const albescent = taskFor('albescent')
  return (
    <div style={wrap}>
      <TaskCard task={ephemerists} displayPoints={ephemerists.point_value} />
      <TaskCard task={everymen} displayPoints={everymen.point_value} />
      <TaskCard task={albescent} displayPoints={albescent.point_value} />
    </div>
  )
}

/** Unaffiliated slug → the Default spectrum skin, with the signup affordance. */
export function DefaultSkinWithSignup() {
  const task = taskFor('na')
  return (
    <div style={wrap}>
      <TaskCard task={task} displayPoints={task.point_value} onSignup={noop} />
    </div>
  )
}

/** A metatask — the dispatcher overlays the META + owning-faction badge on the
 *  underlying (here UA) skin. */
export function Metatask() {
  const task = makeTask({
    id: 303,
    primary_faction_slug: 'ua',
    task_type: 'metatask',
    metatask_faction_slug: 'ua',
    title: 'Vote up three commissions worthy of the salon',
    description: 'A standing charge: elevate the work of others before your own.',
    point_value: 20,
    level_required: 5,
  })
  return (
    <div style={wrap}>
      <TaskCard task={task} displayPoints={task.point_value} />
    </div>
  )
}
