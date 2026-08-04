/**
 * Albescent — the PROFILE's tell (#1630, ADR-0048). The sixth surface to
 * unfreeze, and built to the same rule as the five before it: this is not a
 * skin. It renders {@link DefaultProfileBody} whole — the exact spectrum
 * profile an unaffiliated player wears, down to the copy and the credential
 * card — and hands it one inert ornament layer. Strip the class and the two
 * profiles are byte-identical.
 *
 * THE DELTA IS MOTION, AND THE CONTRAST IS THE TREATMENT. The na identity band
 * is a static spectrum frame; Albescent's is the same frame DRIFTING, on a 9s
 * linear loop. A secret society hiding in plain sight is revealed by a shimmer
 * and never by a colour — nothing here repaints anything, adds a word, or moves
 * a slot, because a per-faction hue or a per-faction voice on this surface is
 * exactly what would un-hide it (WORLD_ZERO_STYLE §3, ADR-0027).
 *
 * WHY THE PROFILE UNFREEZES AT ALL. `FactionProfileBody` used to say Albescent
 * claims no profile skin "because a profile is exactly where a secret society
 * would give itself away", and that reasoning is intact — it rules out a SKIN,
 * which this is not. ADR-0048 made "frozen" mean "frozen until designed", and
 * `factions/albescent.ts` has named this seam from the start: "the animations
 * that reveal the society to someone already looking, which unaffiliated does
 * not have."
 *
 * `.alb-profile-edge` lives in index.css with its dark half and its
 * `prefers-reduced-motion` guard — a component may not inject a stylesheet
 * (#911), and an inline `animation:` would bypass the guard (#1003). Stilled,
 * the layer paints nothing at all: the frame it dresses is Default's own and is
 * still there, which is why this one can freeze rather than park at a resting
 * opacity the way `.alb-spark` has to.
 *
 * Both form factors, one row: the ornament mounts inside the identity band in
 * each of `DefaultProfileBody`'s two branches, so the phone stack drifts too.
 */
import type { ProfileBodyProps } from '../FactionProfileBody'
import DefaultProfileBody from './DefaultProfileBody'

export default function AlbescentProfileBody(props: ProfileBodyProps) {
  return (
    <DefaultProfileBody
      {...props}
      identityOrnament={<span aria-hidden="true" className="alb-profile-edge" />}
    />
  )
}
