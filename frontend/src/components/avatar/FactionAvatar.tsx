import type { ReactNode } from 'react'
import type { CharacterOut } from '../../api/auth'
import { mediaUrl } from '../../utils/media'
import { resolveVariant } from '../../utils/factionDispatch'
import { surfaceMap } from '../../factions'
import { factionCssVar, isKnownFaction } from '../../utils/factions'

/**
 * Per-faction avatar + membership-badge dispatcher, keyed by the character's
 * MEMBER faction. All nine slugs resolve through the registry; an unregistered
 * one lands on na's row (#2530).
 */
export interface FactionAvatarProps {
  character: CharacterOut
  /** 'sm'/'md' are the historic 24/32px steps; a number is a literal pixel dim. */
  size?: 'sm' | 'md' | number
  /** Cast a faction-coloured glow around the ring. Off unless a surface asks. */
  glow?: boolean
  /**
   * Draw the membership sigil at the disc's lower-right (default on). Off only
   * where the surface states membership elsewhere, e.g. the desktop roster
   * (#2245). All nine skins must honour it.
   */
  badge?: boolean
}

/** 'sm' | 'md' | px → px. The two string steps keep their original values. */
export function avatarDim(size: FactionAvatarProps['size']): number {
  if (typeof size === 'number') return size
  return size === 'sm' ? 24 : 32
}

/**
 * The root never yields its width (#2232). In a flex row beside a long name its
 * min-content is zero (preflight `img { max-width: 100% }`), so it would shrink
 * and paint the circle as an ellipse. Exported for `WowAvatar`.
 */
export const AVATAR_ROOT = {
  position: 'relative',
  display: 'inline-block',
  flexShrink: 0,
} as const

/**
 * `.user-media` on the whole DISC, only when there is a photograph (#2457), so
 * Albescent's wash spares the player's photo (#1646). On the disc, not the
 * `<img>`: the badge overlaps the photo, so lifting only the img would slice
 * the sigil under the wash. A monogram disc is site furniture and gets none.
 * `undefined`, not `''`, keeps face-less markup unchanged.
 */
export function userMediaHook(character: CharacterOut): string | undefined {
  return character.avatar_url ? 'user-media' : undefined
}

/** Faction avatar circle colours; the img/initial + sizing logic is shared below. */
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
 * A faction avatar with a sigil badge at the lower-right. Variants supply colours
 * and `glyph(size, ringColor)`; sigils are drawn in the ring colour.
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
    // See AVATAR_ROOT and userMediaHook.
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

  // ponytail: one wrapper glow, not per-skin; drop-shadow hugs disc + badge.
  // Unaffiliated glows neutral: a spectrum ring has no one colour.
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
