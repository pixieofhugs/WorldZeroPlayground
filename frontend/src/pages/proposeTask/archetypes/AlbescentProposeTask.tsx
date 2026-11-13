/**
 * Albescent proposing a task (#2538): a pass-through to `DefaultProposeTask`,
 * byte-identical (`proposeTaskDispatch.test.tsx` asserts it). It exists because
 * `surfaceDispatch.test.ts` needs a row for every `SURFACE_KEYS` key (#2531).
 *
 * No motion, by decision: nothing on the page is classed for `.alb-moves`, and
 * adding one is a dress someone must design (follow-up on #2993). ADR-0027's edge
 * is untouched. `FactionSigil` already draws the labyrinth (ADR-0083 §1).
 */
import DefaultProposeTask from './DefaultProposeTask'
import type { ProposeTaskState } from '../useProposeTask'

export default function AlbescentProposeTask({ state }: { state: ProposeTaskState }) {
  return <DefaultProposeTask state={state} />
}
