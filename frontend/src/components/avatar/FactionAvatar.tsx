import type { ComponentType, ReactNode } from 'react'
import type { CharacterOut } from '../../api/auth'
import { mediaUrl } from '../../utils/media'
import { pickVariant } from '../../utils/factionDispatch'
import EverymenAvatar from './EverymenAvatar'
import WowAvatar from './WowAvatar'
import SnideAvatar from './SnideAvatar'
import EphemeristsAvatar from './EphemeristsAvatar'

/**
 * Per-faction avatar + membership-badge dispatcher (Tier-3 surface). Keyed by
 * the character's MEMBER faction (character.faction_slug). Faction variants
 * (cog sigil, moon glyph, …) register in Sessions 3-4. The default below is the
 * plain avatar circle previously inlined in CharacterBadge — no membership
 * badge — so behavior is unchanged until a variant opts in.
 */
export interface FactionAvatarProps {
  character: CharacterOut
  size?: 'sm' | 'md'
}

function DefaultAvatar({ character, size = 'md' }: FactionAvatarProps) {
  const isSmall = size === 'sm'
  return character.avatar_url ? (
    <img
      src={mediaUrl(character.avatar_url)}
      alt={character.username}
      className={`rounded-full border-2 border-border object-cover ${isSmall ? 'w-6 h-6' : 'w-8 h-8'}`}
    />
  ) : (
    <span
      className={`rounded-full border-2 border-border bg-paper flex items-center justify-center font-display font-bold text-ink ${
        isSmall ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm'
      }`}
    >
      {character.username[0]?.toUpperCase()}
    </span>
  )
}

/**
 * Faction-themed avatar circle (image or initial fallback). Shared by the
 * faction avatar variants so the img/initial + sizing logic lives in one place;
 * only the border/surface/text colors differ per faction.
 */
export interface CircleStyle {
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
  const isSmall = size === 'sm'
  const dim = isSmall ? 24 : 32
  const badge = isSmall ? 12 : 16
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: dim, height: dim }}>
      <FactionCircle
        character={character}
        dim={dim}
        fontSize={isSmall ? initialFontSize[0] : initialFontSize[1]}
        style={circle}
      />
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
    </span>
  )
}

const FACTION_AVATARS: Record<string, ComponentType<FactionAvatarProps>> = {
  everymen: EverymenAvatar,
  wow: WowAvatar,
  snide: SnideAvatar,
  ephemerists: EphemeristsAvatar,
}

export default function FactionAvatar({ character, size }: FactionAvatarProps) {
  const Variant = pickVariant(FACTION_AVATARS, character.faction_slug, DefaultAvatar)
  return <Variant character={character} size={size} />
}
