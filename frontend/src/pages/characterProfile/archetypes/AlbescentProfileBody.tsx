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
 * opacity. (`.alb-spark` was the contrast here until #2555 took the twinkle out
 * of the kit; Coven's `.cvn-profile-spark` is the surviving mark that parks.)
 *
 * Both form factors, one row — and one MOUNT since #2996, where it used to be
 * one per branch. The layer travels `DefaultProfileBody` → `ProfileSkin`'s
 * `identityOrnament` prop → the na kit's `headerFrame`, which is the band
 * itself, so the phone drifts because it is the same element rather than
 * because a second copy was kept level with the first.
 *
 * ── THE REST OF THE PAGE'S SPECTRA (#2500, epic ruling 3) ───────────────────
 *
 * The band was the only thing moving here, and this is the surface where that
 * showed most: the na profile draws the spectrum SIX more times — three section
 * heads, the FDL laurel's ring, a medallion behind every badge, and the level
 * bar's fill — and every one of them stood still under a member's own name.
 * Ruling 3 is explicit that readouts are not exempt, and a progression bar is
 * the readout the ruling names.
 *
 * The wrapper is what those six needed. This is the one row in the manifest that
 * hands `Default` a slot and nothing else, so there was no element in the tree
 * for `.alb-x .spectrum-rule` to descend from; the div below is that element and
 * declares nothing of its own — `alb-moves` is a marker, and index.css carries
 * the rules. The identity band is deliberately NOT among the six: it is a frame
 * with the page inside it rather than an ornament, and it already carries a
 * travelling ring, so moving its ramp too would put two spectra at two speeds on
 * one object. `:empty` in the selector is what draws that line.
 */
import type { ProfileBodyProps } from '../FactionProfileBody'
import DefaultProfileBody from './DefaultProfileBody'

export default function AlbescentProfileBody(props: ProfileBodyProps) {
  return (
    <div className="alb-moves">
      <DefaultProfileBody
        {...props}
        identityOrnament={<span aria-hidden="true" className="alb-profile-edge" />}
      />
    </div>
  )
}
