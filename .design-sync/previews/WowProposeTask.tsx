// WowProposeTask — Wow's dress on the propose-task page (#2538): the charter's own sheet.
//
// The page dispatches on the faction the task is proposed FOR, so the slug
// passed is 'wow' — it is selectable in the picker, so its chip renders
// NAMED and selected rather than falling back to the unaffiliated label (the
// trap AlbescentProposeTask documents).
//
// ONE CELL: the form is one composition; a second would be the same sheet again.
import { WowProposeTask } from 'worldzero-frontend'
import { proposeTaskState } from './_state'

export function Propose() {
  return <WowProposeTask state={proposeTaskState('wow')} />
}
