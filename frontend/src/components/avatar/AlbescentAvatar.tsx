import { avatarDim, DefaultAvatar } from './FactionAvatar'
import type { FactionAvatarProps } from './FactionAvatar'

/**
 * Albescent — the AVATAR's tell (#2502, epic #2496, ADR-0048). The seventh
 * surface to unfreeze, and built to the same rule as the six before it: this is
 * not a ninth skin. It renders the exact spectrum disc an unaffiliated player
 * wears — the same ring, the same monogram, the same `DefaultSigil` corner mark
 * — and hands it one inert ornament layer. Strip that span and the two avatars
 * are byte-identical, which `albescentAvatar.test.tsx` asserts on both branches.
 *
 * ### The ring turns at 48px and up, and is ABSENT below it
 *
 * This is the one Albescent surface whose reasoning is not "reveal the society
 * to someone already looking". Every other tell dresses a surface a viewer is
 * looking AT; an avatar renders BESIDE other players' — comment leaves, praxis
 * bylines, the players roster, duel banners. One turning ring in a column of
 * still ones is a spotlight rather than a shimmer, and it announces membership
 * to a viewer who was reading a thread, not a person. Gating puts the tell where
 * the disc is large and alone (the profile identity band, the duel banner's
 * portrait) and drops it where the disc is one of twenty.
 *
 * Two other things fall out of the same gate. A 2px band turning on a 24px disc
 * reads as a SPINNER — the browser's own idiom for "waiting" — and it is the
 * legibility floor besides. And a roster is the one place that would mount forty
 * clocks; below the gate the ornament is not stilled but never rendered, so a
 * byline costs exactly what na's costs.
 *
 * 48 is a threshold on `avatarDim`, not a new size vocabulary: `sm`/`md` are the
 * historic 24/32 steps and every larger mount already passes a literal pixel dim.
 *
 * ### The photo and the monogram are the same amount of Albescent
 *
 * They were not. `.user-media` rides the whole disc wherever a player has a
 * photograph (#2457), and the four `.alb-*` wrappers lift that hook clear of
 * their wash — so on a praxis byline a photo disc was excluded from the drift
 * and a monogram disc was not. Same player, same surface, two different tells.
 *
 * The ring ends it by construction rather than by a branch. It is chrome
 * OUTSIDE the portrait: `DefaultAvatar` paints its spectrum as a 2px pad on the
 * disc and the photo or the monogram fills the content box inside it, so the
 * ornament covers the band and never the picture, and it mounts INSIDE the root
 * that carries `.user-media` — riding up with the lift in the photo branch,
 * sitting in the wash in the monogram branch, and painting identically in both.
 * There is nothing here that reads `avatar_url`.
 *
 * #1646 does not bite for the same reason: its difficulty is a wash painted OVER
 * user media, which forces a paint-order fight with a sigil stamped on the
 * photograph. A ring is the chrome animating itself, so no z-order question
 * arises — and the badge is untouched.
 *
 * ### What this file may not do
 *
 * The badge stays `DefaultSigil`, na's closed ring. `FactionAvatar` imports it
 * directly and that is correct hiding behaviour (ADR-0027): a labyrinth mark on
 * every byline would be a very loud un-hiding, and it would render to every
 * viewer at every size, gate or no gate.
 *
 * `.alb-avatar-ring` lives in index.css with its geometry and the deferred
 * `motion.ornament.css` with its rotation — a component may not inject a
 * stylesheet (#911), and an inline `animation:` would bypass the reduced-motion
 * guard (#1003). Stilled, the layer is the spectrum ring it covers, drawn in the
 * same conic at rest: it can park rather than freeze to nothing, the way
 * `.alb-profile-edge` does and `.alb-spark` cannot.
 */
export default function AlbescentAvatar(props: FactionAvatarProps) {
  return (
    <DefaultAvatar
      {...props}
      ornament={
        avatarDim(props.size) >= 48 ? (
          <span aria-hidden="true" className="alb-avatar-ring" />
        ) : undefined
      }
    />
  )
}
