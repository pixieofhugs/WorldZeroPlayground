// Breadcrumb preview cells. One breadcrumb for the whole site (#2102/#2317),
// replacing eighteen hand-rolled trails. It derives the whole trail from the
// task it hangs off: Tasks → <task title> → Praxis → (Edit). `praxisId` is
// present on the two praxis surfaces and absent on a task detail; `editing`
// runs the trail one step further, into the composer. A page under Tasks that
// has no task — Propose a Task — hands a `current` label instead (#2973).
//
// The last crumb carries aria-current="page" and is not a link. Long titles are
// handled by shrinkIndex + flexbox rather than a breakpoint, so the cells below
// include a title long enough to make that shrink visible.
import { Breadcrumb } from 'worldzero-frontend'

const wrap: React.CSSProperties = {
  padding: '20px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
}

/** A task detail: no praxis yet, so the trail stops at the task title. */
export function TaskDetail() {
  return (
    <div style={wrap}>
      <Breadcrumb taskId={412} taskTitle="Walk a mile before breakfast" />
    </div>
  )
}

/** A praxis detail: the trail runs one step past the task, onto the praxis. */
export function PraxisDetail() {
  return (
    <div style={wrap}>
      <Breadcrumb taskId={412} taskTitle="Walk a mile before breakfast" praxisId={9021} />
    </div>
  )
}

/** The composer: `editing` adds the final step, and that last crumb is the
 *  current page rather than a link. */
export function Composer() {
  return (
    <div style={wrap}>
      <Breadcrumb taskId={412} taskTitle="Walk a mile before breakfast" praxisId={9021} editing />
    </div>
  )
}

/** A page under Tasks that is NOT a task (#2973): `Propose a Task` has no task
 *  to hang the second crumb on, so it hands its own label instead. Two crumbs,
 *  one chevron, and the last is where you are. */
export function CurrentPage() {
  return (
    <div style={wrap}>
      <Breadcrumb current="Propose a Task" />
    </div>
  )
}

/** A title long enough that shrinkIndex has to give ground — the trail
 *  degrades by shrinking the title crumb, never by wrapping or clipping. */
export function LongTitle() {
  return (
    <div style={wrap}>
      <Breadcrumb
        taskId={88}
        taskTitle="Read a book you have owned for more than five years and never opened"
        praxisId={9022}
      />
    </div>
  )
}
