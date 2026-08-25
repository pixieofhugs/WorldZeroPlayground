import type { ReactNode } from 'react'
import { mediaUrl } from '../../utils/media'
import { UNAFFILIATED_FACTION_SLUG } from '../../utils/factions'
import { factionRoleVars } from '../../utils/factionRoles'
import DefaultSigil from '../sigil/DefaultSigil'
import { AVATAR_ROOT, avatarDim, userMediaHook } from './FactionAvatar'
import type { FactionAvatarProps } from './FactionAvatar'

/**
 * The `na` avatar — the ninth faction's disc, and since #2530 a skin module like
 * the other eight rather than a function inside its own dispatcher.
 *
 * The UNAFFILIATED / no-faction skin (#418): the portrait or monogram inside a
 * thin spectrum ring, tagged with the spectrum sigil — every path still open.
 * All colour through the ROLE MAP (#2672) — `--avatar-paper` / `-ink` /
 * `-face`, each falling back to the `--faction-default-*` token it read
 * before; flips light/dark.
 *
 * IT MOVED HERE, IT DID NOT CHANGE. `FactionAvatar.tsx` used to define this and
 * name it as `pickVariant`'s fallback, which is what made `Default*` a second
 * dispatch mechanism serving one slug. `factions/default.ts` names it now, so
 * the file has to exist for the manifest to point at — the shared atoms
 * (`AVATAR_ROOT`, `avatarDim`, `userMediaHook`) stay in the dispatcher, imported
 * back the same way all eight faction skins import them.
 */
/**
 * The na disc, and — since #2502 — the one seam a dresser may reach into it by.
 *
 * `ornament` mounts BETWEEN the ring and the sigil badge, which is the only
 * position that works and the reason this is a slot rather than a sibling span
 * in a wrapper. The badge is an absolutely positioned LATER sibling clipped to
 * the disc's lower-right, and at every size its centre falls just inside the
 * disc's edge — so an overlay mounted outside this component paints above the
 * badge and draws a spectrum arc straight across it, undoing the cut-out its
 * own ring-shadow exists to make. Earlier in the DOM it would paint above the
 * ring it dresses and beneath the badge that occludes it, exactly as the static
 * ring does today. `z-index: -1` is not the alternative: the ring span is
 * in-flow and opaque, so a negative layer is invisible rather than merely low.
 *
 * The prop is deliberately NOT on {@link FactionAvatarProps}. That interface is
 * the manifest's contract for all nine skins, and this is one component's
 * internal seam — the same shape `DefaultProfileBody`'s `identityOrnament`
 * takes.
 */
export default function DefaultAvatar({
  character,
  size = 'md',
  badge: showBadge = true,
  ornament,
}: FactionAvatarProps & { ornament?: ReactNode }) {
  const dim = avatarDim(size)
  const badge = Math.max(12, Math.round(dim * 0.44))
  return (
    <span
      className={userMediaHook(character)}
      style={{
        // The role map (#2672), pinned to na like the ring above it: the disc's
        // ground is `--faction-default-rainbow-conic`, which takes no slug, and
        // an ink may not leave a ground that cannot follow (#2361, #2669). `{}`
        // today; what the prefix buys is a name a dresser can reach — the same
        // motive as the `ornament` slot below.
        ...factionRoleVars(UNAFFILIATED_FACTION_SLUG, 'avatar'),
        ...AVATAR_ROOT,
        width: dim,
        height: dim,
      }}
    >
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
              background: 'var(--avatar-paper, var(--faction-default-card-bg))',
              color: 'var(--avatar-ink, var(--faction-default-card-text))',
              fontFamily: 'var(--avatar-face, var(--faction-default-card-font))',
              fontSize: Math.round(dim * 0.44),
              lineHeight: 1,
            }}
          >
            {character.username[0]?.toUpperCase()}
          </span>
        )}
      </span>
      {ornament}
      {/* seven-segment sigil corner mark */}
      {showBadge && (
        <span
          style={{
            position: 'absolute',
            right: -3,
            bottom: -3,
            width: badge,
            height: badge,
            borderRadius: '50%',
            background: 'var(--avatar-paper, var(--faction-default-card-bg))',
            boxShadow: '0 0 0 1.5px var(--avatar-paper, var(--faction-default-card-bg))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <DefaultSigil size={badge - 3} />
        </span>
      )}
    </span>
  )
}
