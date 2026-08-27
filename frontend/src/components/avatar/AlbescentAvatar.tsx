import DefaultAvatar from './DefaultAvatar'
import { avatarDim } from './FactionAvatar'
import type { FactionAvatarProps } from './FactionAvatar'
import AlbescentSigil from '../sigil/AlbescentSigil'
import { ALBESCENT_FACTION_SLUG, isFactionRedacted } from '../../utils/factions'

/**
 * Albescent — the AVATAR's tell (#2502, epic #2496, ADR-0048), and since #2731
 * the surface where ADR-0088 is spent.
 *
 * It is still not a ninth skin. It renders na's spectrum disc — the same ring,
 * the same monogram, the same geometry — and adds exactly two things: one inert
 * ornament layer, and, FOR A REVEALED VIEWER ONLY, the labyrinth in place of
 * na's `DefaultSigil` on the corner badge.
 *
 * ### The badge is the labyrinth for a revealed viewer (ADR-0088, #2731)
 *
 * THIS REVERSES WHAT THIS FILE USED TO ARGUE, so read the ADR before restoring
 * it. The old note said the badge must stay `DefaultSigil` because "a labyrinth
 * mark on every byline would be a very loud un-hiding, and it would render to
 * every viewer at every size, gate or no gate" — and the second half was the
 * real objection. `isFactionRedacted()` answers it: the mark renders to a
 * viewer who has ALREADY been let in, and to nobody else. An unrevealed viewer
 * gets bytes identical to na's, which `albescentAvatar.test.tsx` still asserts.
 *
 * Two facts made the old position untenable rather than merely cautious. #2529
 * registered the labyrinth in `FactionSigil`, so the filter facet, the
 * credential card, the requests tray, the players roster and the sidebar rail
 * already draw it — this avatar was the last surface in the app disagreeing
 * with the rest. And ADR-0082 replaced secrecy with redaction: once an eighth
 * lane on the players page reads `[REDACTED]`, the thing being withheld is not
 * "there is a faction" but "these are its members", which is a question about
 * the VIEWER and not about the paint.
 *
 * NO LIVERY IS ADDED. `AlbescentSigil` is filled with
 * `--faction-default-rainbow-conic` — the same spectrum `DefaultSigil` sweeps —
 * so what a revealed viewer gains is a SHAPE, never a hue. `CSS_KEY.albescent`
 * stays `"default"` (ADR-0088), and this file names no `--faction-albescent-*`
 * token.
 *
 * The gate reads the SLUG CONSTANT, not `props.character.faction_slug`. This
 * component is only ever resolved for Albescent members, and asking about the
 * constant is what keeps the question "is this viewer revealed" rather than the
 * subtly different "is this character redactable".
 *
 * Confining the tell to surfaces where the player is the SUBJECT — podium,
 * profile, faction page — was considered and rejected (ADR-0088): it leaves the
 * app disagreeing with itself without keeping a secret.
 *
 * ### The ring turns at 64px and up, and is ABSENT below it — so today, nowhere
 *
 * This is the one Albescent surface whose reasoning is not "reveal the society
 * to someone already looking". Every other tell dresses a surface a viewer is
 * looking AT; an avatar renders BESIDE other players' — comment leaves, praxis
 * bylines, the players roster, duel banners. One turning ring in a column of
 * still ones is a spotlight rather than a shimmer, and it announces membership
 * to a viewer who was reading a thread, not a person.
 *
 * THE GATE IS DELIBERATELY ABOVE EVERY MOUNT THAT EXISTS (owner ruling
 * 2026-08-23). #2502 specified 48, and a census of every `<FactionAvatar>` in
 * the app found exactly one mount at or above it: `DesktopPlayers.tsx`'s roster
 * LEAD card, at 54. Everything else is 24–44 — comment leaves 24, praxis bylines
 * 28, mobile rows 28/42, secondary list 34, roster rows 42, the WOW comment
 * crest 44 — and `CharacterBadge` only ever passes `sm`/`md`. So a 48px gate
 * would have lit the ring on the top row of the roster and nowhere else, which
 * is the column-of-others case the gate exists to prevent, merely with the
 * largest disc in the column. 64 puts the threshold above 54, and the tell
 * therefore ships DORMANT: correct, complete, and waiting for the first surface
 * that shows one player's disc large and alone.
 *
 * ponytail: a seam with no live mount today. Kept rather than deferred because
 * the alternative is re-deriving this census when that surface lands, and the
 * whole cost is one constant and a class. It lights up by itself the moment a
 * mount passes 64 — the faction hero (#2504), a profile identity band, a duel
 * banner — with no edit here.
 *
 * Two other things fall out of the same gate. A 2px band turning on a 24px disc
 * reads as a SPINNER — the browser's own idiom for "waiting" — and it is the
 * legibility floor besides. And a roster is the one place that would mount forty
 * clocks; below the gate the ornament is not stilled but never rendered, so a
 * byline costs exactly what na's costs.
 *
 * The number is a threshold on `avatarDim`, not a new size vocabulary: `sm`/`md`
 * are the historic 24/32 steps and every larger mount passes a literal pixel dim.
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
 * `.alb-avatar-ring` lives in index.css with its geometry and the deferred
 * `motion.ornament.css` with its rotation — a component may not inject a
 * stylesheet (#911), and an inline `animation:` would bypass the reduced-motion
 * guard (#1003). Stilled, the layer is the spectrum ring it covers, drawn in the
 * same conic at rest: it can park rather than freeze to nothing, the way
 * `.alb-profile-edge` does. (The counter-example used to be `.alb-spark`, whose
 * keyframe start was invisible; #2555 retired the twinkle from the kit, and
 * Coven's `.cvn-profile-spark` is the surviving mark that must park.)
 */
/**
 * The disc is "large and alone" at or above this, and one of many below it.
 * Above every mount in the app today, on purpose — see the docstring.
 */
const RING_TURNS_AT = 64

export default function AlbescentAvatar(props: FactionAvatarProps) {
  return (
    <DefaultAvatar
      {...props}
      ornament={
        avatarDim(props.size) >= RING_TURNS_AT ? (
          <span aria-hidden="true" className="alb-avatar-ring" />
        ) : undefined
      }
      glyph={
        isFactionRedacted(ALBESCENT_FACTION_SLUG)
          ? undefined
          : (size) => <AlbescentSigil size={size} />
      }
    />
  )
}
