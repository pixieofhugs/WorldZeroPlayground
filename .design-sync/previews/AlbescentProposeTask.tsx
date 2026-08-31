// AlbescentProposeTask — a documented PASS-THROUGH wrapper (#2538): it renders
// DefaultProposeTask and changes not one pixel, and `proposeTaskDispatch.test.tsx`
// asserts the two are byte-identical. The card exists because the archetype is
// registered, not because it dresses anything — na's spectrum on this page is
// inline and computed from the slug, which a wrapper cannot reach.
//
// ONE CELL. A second would be the same form again: there is no variant axis on a
// wrapper that forwards its only prop untouched.
//
// WHY THE SLUG IS `na` AND NOT `albescent`. Albescent is deliberately absent from
// the propose-task picker (it is secret; ADR-0027). Pinning `factionSlug:
// 'albescent'` therefore renders a SELECTED chip for a faction the list does not
// contain, and its label falls back to the unaffiliated string — the card came
// out with two chips both reading UNAFFILIATED, which is an unreachable state and
// reads as a bug. `na` is the page's real opening position and the same default
// the repo's own `__tests__/proposeTaskState.ts` builds. The archetype is
// byte-identical to the Default either way, so nothing about it goes unshown.
import { AlbescentProposeTask } from 'worldzero-frontend'
import { proposeTaskState } from './_state'

export function Propose() {
  return <AlbescentProposeTask state={proposeTaskState('na')} />
}
