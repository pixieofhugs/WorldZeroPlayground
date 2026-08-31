// CovenProposeTask — Coven's dress on the propose-task page (#2538). Unlike the
// Albescent archetype (a pass-through), this one is a real dress: CovenCreateCharacter's
// chassis, masthead, blooms, haze and cat over this page's fields.
//
// The page dispatches on the faction the task is proposed FOR, so the slug passed is
// 'coven' — and unlike albescent, coven IS selectable in the picker, so the chip renders
// named and selected rather than falling back to the unaffiliated label.
//
// ONE CELL: the form is one composition; a second would be the same slip again.
import { CovenProposeTask } from 'worldzero-frontend'
import { proposeTaskState } from './_state'

export function Propose() {
  return <CovenProposeTask state={proposeTaskState('coven')} />
}
