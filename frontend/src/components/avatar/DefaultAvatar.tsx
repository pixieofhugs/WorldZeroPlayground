import type { ReactNode } from 'react'
import { mediaUrl } from '../../utils/media'
import { factionRoleVars } from '../../utils/factionRoles'
import DefaultSigil from '../sigil/DefaultSigil'
import { AVATAR_ROOT, avatarDim, userMediaHook } from './FactionAvatar'
import type { FactionAvatarProps } from './FactionAvatar'

/**
 * The `na` (unaffiliated) avatar (#418, #2530): portrait or monogram in a
 * spectrum ring, with the spectrum sigil. Colour via the role map (#2672).
 *
 * Two dresser seams, deliberately not on {@link FactionAvatarProps}:
 * - `ornament` (#2502) mounts between ring and badge, the only position that
 *   neither paints across the badge nor hides under the opaque ring.
 * - `glyph(size)` replaces the corner mark (ADR-0088, see `AlbescentAvatar`); a
 *   function so the badge size is derived only here.
 */
export default function DefaultAvatar({
  character,
  size = 'md',
  badge: showBadge = true,
  ornament,
  glyph,
}: FactionAvatarProps & {
  ornament?: ReactNode
  glyph?: (size: number) => ReactNode
}) {
  const dim = avatarDim(size)
  const badge = Math.max(12, Math.round(dim * 0.44))
  return (
    <span
      className={userMediaHook(character)}
      style={{
        // Pinned to na: the conic ground takes no slug (#2361, #2669).
        ...factionRoleVars("na", 'na-avatar'),
        ...AVATAR_ROOT,
        width: dim,
        height: dim,
      }}
    >
      {/* Conic, not linear: a linear ramp smears across a disc (#1127). */}
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
              background: 'var(--na-avatar-paper)',
              color: 'var(--na-avatar-ink)',
              fontFamily: 'var(--na-avatar-face)',
              fontSize: Math.round(dim * 0.44),
              lineHeight: 1,
            }}
          >
            {character.username[0]?.toUpperCase()}
          </span>
        )}
      </span>
      {ornament}
      {/* corner mark */}
      {showBadge && (
        <span
          style={{
            position: 'absolute',
            right: -3,
            bottom: -3,
            width: badge,
            height: badge,
            borderRadius: '50%',
            background: 'var(--na-avatar-paper)',
            boxShadow: '0 0 0 1.5px var(--na-avatar-paper)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {glyph ? glyph(badge - 3) : <DefaultSigil size={badge - 3} />}
        </span>
      )}
    </span>
  )
}
