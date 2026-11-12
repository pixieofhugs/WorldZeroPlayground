/**
 * Albescent's profile tell (#1630, ADR-0048): NOT a skin. Renders
 * {@link DefaultProfileBody} whole plus one inert ornament; strip the classes and
 * the two profiles are identical. The delta is motion only — a hue or a word
 * would un-hide the society (WORLD_ZERO_STYLE §3, ADR-0027).
 *
 * `.alb-profile-edge` (the drifting band, via `identityOrnament` → `headerFrame`)
 * lives in the CSS tree with its reduced-motion guard (#911, #1003).
 * `.alb-moves` is a marker the CSS hangs the page's other spectra off (#2500,
 * epic ruling 3); `:empty` keeps the identity band (a frame) out of that set.
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
