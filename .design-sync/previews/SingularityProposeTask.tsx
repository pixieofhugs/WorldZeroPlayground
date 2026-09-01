// SingularityProposeTask — Singularity's dress on the propose-task page (#2538): the terminal it was compiled in.
//
// The page dispatches on the faction the task is proposed FOR, so the slug
// passed is 'singularity' — it is selectable in the picker, so its chip renders
// NAMED and selected rather than falling back to the unaffiliated label (the
// trap AlbescentProposeTask documents).
//
// ONE CELL: the form is one composition; a second would be the same sheet again.
import { SingularityProposeTask } from 'worldzero-frontend'
import { proposeTaskState } from './_state'

export function Propose() {
  return <SingularityProposeTask state={proposeTaskState('singularity')} />
}
