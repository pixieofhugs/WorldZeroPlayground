import DefaultAvatar from './DefaultAvatar'
import { avatarDim } from './FactionAvatar'
import type { FactionAvatarProps } from './FactionAvatar'
import AlbescentSigil from '../sigil/AlbescentSigil'
import { ALBESCENT_FACTION_SLUG, isFactionRedacted } from '../../utils/factions'

/**
 * Albescent's avatar tell (#2502, ADR-0048): na's disc plus an inert ornament
 * ring, and the labyrinth corner mark for a REVEALED viewer only (ADR-0088,
 * #2731 — read it before restoring the old `DefaultSigil`-always rule). An
 * unrevealed viewer gets na's bytes. No livery: the labyrinth is filled with
 * the same conic as na's sigil. The gate asks about the slug constant, so the
 * question stays "is this viewer revealed".
 *
 * The ring turns only at `RING_TURNS_AT`, above every mount today (owner ruling;
 * the roster LEAD is 54): beside other players' discs it would be a spotlight,
 * and a small turning band reads as a spinner. Below the gate it is not
 * rendered at all.
 * ponytail: dormant seam until a mount passes 64; no edit needed then.
 *
 * The ring is chrome outside the portrait and mounts inside the `.user-media`
 * root, so photo and monogram discs get the same tell (#2457).
 * Paint is in index.css, rotation in `motion.ornament.css` behind the
 * reduced-motion guard (#911, #1003); at rest it parks as the ring it covers.
 */
/** "Large and alone" at or above this. */
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
