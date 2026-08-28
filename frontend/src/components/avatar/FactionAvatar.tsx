import type { ReactNode } from 'react'
import type { CharacterOut } from '../../api/auth'
import { mediaUrl } from '../../utils/media'
import { resolveVariant } from '../../utils/factionDispatch'
import { surfaceMap } from '../../factions'
import { factionCssVar, isKnownFaction } from '../../utils/factions'

/**
 * Per-faction avatar + membership-badge dispatcher (Tier-3 surface). Keyed by
 * the character's MEMBER faction (character.faction_slug).
 *
 * THERE IS NO DEFAULT NAMED HERE ANY MORE (#2530). `DefaultAvatar` used to be
 * defined in this file and passed as `pickVariant`'s fallback — the one avatar
 * skin reached by a different mechanism from the other eight. It is
 * `./DefaultAvatar.tsx` now and `factions/default.ts` registers it under `na`,
 * so this dispatcher resolves all NINE slugs the same way and an unregistered
 * slug lands on na's row rather than on an argument spelled out here.
 */
export interface FactionAvatarProps {
  character: CharacterOut
  /** 'sm'/'md' are the historic 24/32px steps; a number is a literal pixel dim. */
  size?: 'sm' | 'md' | number
  /** Cast a faction-coloured glow around the ring. Off unless a surface asks. */
  glow?: boolean
  /**
   * Draw the membership sigil clipped to the disc's lower-right. On by default:
   * the badge is what makes this an avatar rather than a portrait.
   *
   * A surface turns it OFF only when it states membership somewhere else and
   * the badge would be the smaller, mute copy of that statement. The desktop
   * Players roster is the first (#2245): the owner gave the faction its own
   * column with a large, clickable, linked sigil in it, "as opposed to putting
   * it on top of their profile pic".
   *
   * THIS ONE *IS* ON `FactionAvatarProps`, unlike `DefaultAvatar`'s `ornament`
   * slot a few lines down, and the difference is the point. `ornament` is one
   * component's internal seam; a badge is drawn by all nine skins, so "do not
   * draw one" has to be a promise all nine keep. Forwarding it costs each skin
   * one destructured name and one prop.
   */
  badge?: boolean
}

/** 'sm' | 'md' | px → px. The two string steps keep their original values. */
export function avatarDim(size: FactionAvatarProps['size']): number {
  if (typeof size === 'number') return size
  return size === 'sm' ? 24 : 32
}

/**
 * THE ROOT NEVER YIELDS ITS WIDTH (#2232), on both skins below and on the one
 * skin that wraps `BadgedAvatar` in chrome of its own (`WowAvatar`, #2241) —
 * which is why this is exported rather than private.
 *
 * An avatar is a circle at a stated diameter, and it is nearly always mounted
 * in a flex row beside a name the player typed — the praxis byline, the duel
 * banner's rival face, the comment leaves. A flex item's initial `flex-shrink`
 * is 1, and this root's automatic minimum size is its CONTENT's min-content:
 * zero, because Tailwind's preflight gives every `img` a `max-width: 100%` and
 * the monogram branch is a `width: 100%` span. So the root gave ground to a
 * long name while the img kept the height it was handed inline, and the circle
 * painted as an ellipse.
 *
 * `flex-shrink: 0` is inert wherever the parent is not a flex container, so
 * this is the whole fix for every mount at once rather than a prop for the two
 * that reported it. It is what `RosterAvatar` (praxis card) already says as
 * `flex: none`. Note the direction is the OPPOSITE of the score stamp's on the
 * same praxis-card row (#2114): the stamp is a panel and must give ground, this
 * is a fixed disc and must not.
 */
export const AVATAR_ROOT = {
  position: 'relative',
  display: 'inline-block',
  flexShrink: 0,
} as const

/**
 * `.user-media` on the DISC, and only when there is a photograph (#2457).
 *
 * `.user-media` marks what is the PLAYER's rather than the site's, so an
 * Albescent surface can hold its drift off it (#1646). Inert on the other eight
 * skins and on every surface but four — only the `.alb-*` wrappers scope a rule
 * to it. It reached this file because the three photographs #2457 found still
 * under the wash — both praxis-card bylines and the comment composer's avatar —
 * are all this one component, at 28px and at `sm`.
 *
 * THE HOOK RIDES THE WHOLE DISC, NOT THE `<img>`, and that is the one place this
 * departs from #1941/#1942/#2456. Those hooked bare photographs; this one is not
 * alone in its box. The membership sigil is an absolutely positioned sibling
 * clipped to the photo's lower-right, and at the byline's 28px the face's own
 * edge runs almost exactly through the badge's centre — about half the badge
 * lies over the picture, which is why the badge is drawn with a ring to read as
 * a cut-out against it.
 *
 * So `photo > wash > badge` is UNSATISFIABLE, not merely awkward: the badge
 * already paints above the photo (positioned, later sibling), this issue puts
 * the photo above the wash, and the two together force the badge above the wash.
 * Lifting the bare `<img>` would honour #1646's furniture list to the letter and
 * slice the sigil in half on every faction avatar under an Albescent wash. So
 * the sigil welded onto a photograph rides up with it; what is given away is a
 * 15% multiply over a 12-14px disc.
 *
 * CONDITIONAL, WHICH IS WHAT KEEPS #1646 INTACT. A monogram disc — its generated
 * initial, its spectrum ring, its sigil — is the site's own furniture from edge
 * to edge and carries no hook at all, so the wash still crosses it whole. The
 * hook appears only where the disc IS a player's photograph, exactly as the feed
 * gates its anchor on `avatarUrl` (#2456). `undefined` rather than `''` so a
 * face-less avatar's markup is byte-identical to what it was.
 */
export function userMediaHook(character: CharacterOut): string | undefined {
  return character.avatar_url ? 'user-media' : undefined
}

/**
 * Faction-themed avatar circle (image or initial fallback). Shared by the
 * faction avatar variants so the img/initial + sizing logic lives in one place;
 * only the border/surface/text colors differ per faction.
 */
interface CircleStyle {
  borderColor: string
  bg: string
  textColor: string
  fontFamily: string
}

function FactionCircle({
  character,
  dim,
  fontSize,
  style,
}: {
  character: CharacterOut
  dim: number
  fontSize: number
  style: CircleStyle
}) {
  return character.avatar_url ? (
    <img
      src={mediaUrl(character.avatar_url)}
      alt={character.username}
      className="rounded-full object-cover"
      style={{ width: dim, height: dim, border: `2px solid ${style.borderColor}` }}
    />
  ) : (
    <span
      className="rounded-full flex items-center justify-center font-bold"
      style={{
        width: dim,
        height: dim,
        border: `2px solid ${style.borderColor}`,
        background: style.bg,
        color: style.textColor,
        fontFamily: style.fontFamily,
        fontSize,
      }}
    >
      {character.username[0]?.toUpperCase()}
    </span>
  )
}

/**
 * A faction avatar with a membership sigil badge clipped to the lower-right.
 * Faction variants supply their circle colors, badge colors, and sigil glyph;
 * the wrapper + badge placement are shared here. `glyph` is called with the
 * badge size and the badge's ring color (sigils are drawn in the ring color).
 */
export function BadgedAvatar({
  character,
  size = 'md',
  badge: showBadge = true,
  circle,
  initialFontSize = [13, 16],
  badgeBg,
  badgeRing,
  glyph,
}: FactionAvatarProps & {
  circle: CircleStyle
  /** [sm, md] font size for the fallback initial letter. */
  initialFontSize?: [number, number]
  badgeBg: string
  badgeRing: string
  glyph: (size: number, color: string) => ReactNode
}) {
  const dim = avatarDim(size)
  const isSmall = dim <= 24
  const badge = Math.max(12, Math.round(dim * 0.5))
  return (
    // Same root, same reason — see AVATAR_ROOT (#2232), and the same hook on it
    // for the same reason again — see userMediaHook (#2457). This is the root
    // all eight faction skins wear; `WowAvatar` wraps it in a plate of its own,
    // and that plate is chrome, so the lift stops at the disc inside it.
    <span className={userMediaHook(character)} style={{ ...AVATAR_ROOT, width: dim, height: dim }}>
      <FactionCircle
        character={character}
        dim={dim}
        fontSize={
          // ponytail: a numeric size just scales the 'md' step rather than
          // gaining its own per-faction tuning table.
          typeof size === 'number'
            ? Math.round((initialFontSize[1] * dim) / 32)
            : isSmall
              ? initialFontSize[0]
              : initialFontSize[1]
        }
        style={circle}
      />
      {showBadge && (
        <span
          style={{
            position: 'absolute',
            right: -3,
            bottom: -3,
            width: badge,
            height: badge,
            borderRadius: '50%',
            background: badgeBg,
            border: `1.5px solid ${badgeRing}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {glyph(badge - 5, badgeRing)}
        </span>
      )}
    </span>
  )
}

export default function FactionAvatar({ character, size, glow = false, badge }: FactionAvatarProps) {
  const Variant = resolveVariant(surfaceMap('avatar'), character.faction_slug)
  const avatar = <Variant character={character} size={size} badge={badge} />
  if (!glow) return avatar

  // ponytail: the glow is applied once here on a wrapper rather than threaded
  // through all eight skins. drop-shadow follows the rendered alpha, so it hugs
  // the circle + sigil badge instead of boxing them — the constellation orbs'
  // `0 0 Npx <colour>` cast, minus a per-skin box-shadow in seven files.
  // Unaffiliated glows neutral: a spectrum ring has no one colour to throw.
  const dim = avatarDim(size)
  const color = isKnownFaction(character.faction_slug)
    ? factionCssVar(character.faction_slug)
    : 'var(--glow-neutral)'
  return (
    <span
      style={{
        display: 'inline-block',
        lineHeight: 0,
        filter: `drop-shadow(0 0 ${Math.round(dim * 0.25)}px ${color})`,
      }}
    >
      {avatar}
    </span>
  )
}
