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
 * ## The premise changed in #2993, and the answer did not
 *
 * This header used to argue the wrapper was UNREACHABLE: na's spectrum was
 * everywhere on this page — the card's gradient frame, the metatask box, the
 * submit pill — but every one of them was an INLINE style computed from the slug
 * in `proposeTask/factionSurfaces.ts`, and a wrapper cannot reach an inline
 * `background-image`. #2993 rebuilt the page on the composer chassis and deleted
 * that module, which retires the argument.
 *
 * **THE RULING IS STILL NO MOTION, AND IT IS NOW A DECISION RATHER THAN A
 * CONSTRAINT.** Nothing on the rebuilt page is classed for `.alb-moves` to
 * grab, deliberately: the sheet's spectrum frame is `factionSpectrumSheet()`, an
 * inline background list, and neither `.spectrum-dial` nor `.spectrum-rule` is
 * mounted. Adding one would need new CSS, which makes it a DRESS and not a
 * chassis re-cut — a travelling rainbow frame around a form is a treatment
 * someone has to design, and it would have to be designed for the ONE case
 * where Albescent is a task's TARGET: a chip a non-member can pick. So the
 * registration exists for the manifest's sake, not the dress's, and the
 * byte-identity assertion stays exactly as it was.
 *
 * The design pass is filed as follow-up work on #2993 rather than smuggled in
 * behind a rebuild. ADR-0027's edge is untouched: nothing here is Albescent's
 * own colour, copy or motion.
 *
 * The page's one CLASS-borne faction mark is `FactionSigil`, which for this slug
 * is already the labyrinth and is "never part of the wrapper" (ADR-0083 §1).
 */
import DefaultProposeTask from './DefaultProposeTask'
import type { ProposeTaskState } from '../useProposeTask'

export default function AlbescentProposeTask({ state }: { state: ProposeTaskState }) {
  return <DefaultProposeTask state={state} />
}
