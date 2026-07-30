import type { ReactNode } from 'react'
import type { CharacterOut } from '../../api/auth'
import { mediaUrl } from '../../utils/media'
import { pickVariant } from '../../utils/factionDispatch'
import { surfaceMap } from '../../factions'
import { factionCssVar, isKnownFaction } from '../../utils/factions'
import DefaultSigil from '../sigil/DefaultSigil'

/**
 * Per-faction avatar + membership-badge dispatcher (Tier-3 surface). Keyed by
 * the character's MEMBER faction (character.faction_slug). The default below is
 * the UNAFFILIATED / no-faction (`na`) skin (#418): the portrait/monogram inside
 * a thin spectrum ring, tagged with the spectrum sigil — every path still open.
 * All colours via --faction-default-* tokens; flips light/dark.
 *
 * THERE IS NO `DefaultAvatar.tsx`, AND THAT IS NOT A GAP. `DefaultAvatar` is
 * defined in this file rather than registered as a skin, so a listing of the
 * avatar skins shows only the factions that override it. The na kit is complete;
 * it just lives here.
 */
export interface FactionAvatarProps {
  character: CharacterOut
  /** 'sm'/'md' are the historic 24/32px steps; a number is a literal pixel dim. */
  size?: 'sm' | 'md' | number
  /** Cast a faction-coloured glow around the ring. Off unless a surface asks. */
  glow?: boolean
}

/** 'sm' | 'md' | px → px. The two string steps keep their original values. */
export function avatarDim(size: FactionAvatarProps['size']): number {
  if (typeof size === 'number') return size
  return size === 'sm' ? 24 : 32
}

function DefaultAvatar({ character, size = 'md' }: FactionAvatarProps) {
  const dim = avatarDim(size)
  const badge = Math.max(12, Math.round(dim * 0.44))
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: dim, height: dim }}>
      {/*
        Spectrum ring around the portrait / monogram. CONIC, not the 90deg linear
        ramp: this is a disc, and a left-to-right ramp smears the spectrum across
        it instead of sweeping it round. It read the linear ramp until #1127,
        which was the one na circle in the app not taking a conic (the sigil, the
        sidebar ring, the switcher and every profile ring all did).
      */}
      <span
        style={{
          display: 'block',
          width: dim,
          height: dim,
          borderRadius: '50%',
          // eslint-disable-next-line local/no-raw-style-values -- ornament: this inset *is* the spectrum ring's drawn stroke width, not spacing; a rung doubles the ring.
          padding: 2,
          boxSizing: 'border-box',
          background: 'var(--faction-default-rainbow-conic)',
        }}
      >
        {character.avatar_url ? (
          <img
            src={mediaUrl(character.avatar_url)}
            alt={character.username}
            className="rounded-full object-cover"
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        ) : (
          <span
            className="rounded-full flex items-center justify-center italic"
            style={{
              width: '100%',
              height: '100%',
              background: 'var(--faction-default-card-bg)',
              color: 'var(--faction-default-card-text)',
              fontFamily: 'var(--faction-default-card-font)',
              fontSize: Math.round(dim * 0.44),
              lineHeight: 1,
            }}
          >
            {character.username[0]?.toUpperCase()}
          </span>
        )}
      </span>
      {/* seven-segment sigil corner mark */}
      <span
        style={{
          position: 'absolute',
          right: -3,
          bottom: -3,
          width: badge,
          height: badge,
          borderRadius: '50%',
          background: 'var(--faction-default-card-bg)',
          boxShadow: '0 0 0 1.5px var(--faction-default-card-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <DefaultSigil size={badge - 3} />
      </span>
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
  const dim = avatarDim(size)
  const isSmall = dim <= 24
  const badge = Math.max(12, Math.round(dim * 0.5))
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: dim, height: dim }}>
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

export default function FactionAvatar({ character, size, glow = false }: FactionAvatarProps) {
  const Variant = pickVariant(surfaceMap('avatar'), character.faction_slug, DefaultAvatar)
  const avatar = <Variant character={character} size={size} />
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
