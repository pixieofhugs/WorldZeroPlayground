/**
 * Albescent proposing a task (#2538) — A PASS-THROUGH WRAPPER. It renders
 * `DefaultProposeTask` and changes not one pixel; `renderToStaticMarkup` here is
 * byte-identical to the Default and `proposeTaskDispatch.test.tsx` asserts it.
 *
 * THIS IS NOT THE FAN-OUT. The seven faction propose dresses land one per PR,
 * derived from each faction's `createCharacter` page. Albescent is here because
 * `surfaceDispatch.test.ts` requires a row for EVERY key in `SURFACE_KEYS` the
 * moment the key exists (#2531): "an ABSENT row is not 'renders the Default', it
 * is a reader left to guess which of those two was meant." A wrapper is six
 * lines and settles that; a dress is not.
 *
 * THERE IS NO na MARK ON THIS SURFACE A WRAPPER CAN REACH, and that is the
 * finding rather than a shrug. na's spectrum is everywhere on this page — the
 * card's gradient frame, the metatask box, the submit pill — but every one of
 * them is an INLINE style computed from the slug in
 * `proposeTask/factionSurfaces.ts`, and a wrapper cannot reach an inline
 * `background-image`. Neither `.spectrum-dial` nor `.spectrum-rule` is mounted,
 * so `.alb-moves` — the dresser both of Albescent's re-cuts hang off — has
 * nothing to grab. That is exactly the reason `comment` is a pass-through
 * (#2531: "na's cap is inline and computed from the slug"), and it is the same
 * finding twice rather than a new one.
 *
 * The page's one CLASS-borne faction mark is `FactionSigil`, which for this slug
 * is already the labyrinth and is "never part of the wrapper" (ADR-0083 §1).
 *
 * ADDING MOTION ANYWAY WOULD NEED NEW CSS, which makes it a dress and not a
 * chassis re-cut: a travelling rainbow frame around a form is a treatment
 * someone has to design, and it would have to be designed for the ONE case
 * Albescent is picked as a task's target — a chip a non-member can see. So the
 * registration exists for the manifest's sake, not the dress's. ADR-0027's edge
 * is untouched: nothing here is Albescent's own colour, copy or motion.
 */
import DefaultProposeTask from './DefaultProposeTask'
import type { ProposeTaskState } from '../useProposeTask'

export default function AlbescentProposeTask({ state }: { state: ProposeTaskState }) {
  return <DefaultProposeTask state={state} />
}
