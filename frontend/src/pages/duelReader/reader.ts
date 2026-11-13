/**
 * The side-by-side reader's shared rules (#1084), each read from more than one
 * place. {@link casterVisible} gates both the plate and the widget, so a plate
 * never outlives its control (#1429). The phone ruling is `openSide.ts`.
 */
import { voteRegionVisible } from '../../components/vote/VoteUI'
import type { CurrentUser } from '../../api/auth'
import type { DuelDetailOut } from '../../api/duel'
import type { DuelSideKey } from './openSide'

/**
 * Settled/resolved only, like `DuelCard`. On pending/active the rival's praxis
 * 403s (#999), so consult this BEFORE fetching. At least one side must be readable.
 */
export function readerMountsDuel(duel: DuelDetailOut): boolean {
  if (duel.status !== 'settled' && duel.status !== 'resolved') return false
  if (duel.challenger.praxis_id == null || duel.opponent.praxis_id == null) return false
  return duel.challenger.is_submitted || duel.opponent.is_submitted
}

/**
 * The fetchable praxis id, or `null`. `praxis_id` is not permission to read: a
 * forfeit (ADR-0011 §Forfeit) leaves it set while the praxis drops to
 * `in_progress` and 403s for others. `is_submitted` is the real answer.
 */
export function readablePraxisId(side: DuelDetailOut['challenger']): number | null {
  return side.is_submitted ? side.praxis_id : null
}

/**
 * The side opened from, by the `?from=` PRAXIS id (never the viewer). `null` for
 * a deep link or a `?from` naming neither side.
 */
export function arrivedFromSide(
  duel: DuelDetailOut,
  fromPraxisId: number | null,
): DuelSideKey | null {
  if (fromPraxisId == null) return null
  if (duel.challenger.praxis_id === fromPraxisId) return 'challenger'
  if (duel.opponent.praxis_id === fromPraxisId) return 'opponent'
  return null
}

/**
 * Whether a column draws a caster. `resolved` REMOVES both (artboard 2e);
 * otherwise `voteRegionVisible` decides (#998). A duellist sees ZERO casters,
 * not one: `viewer_can_vote` is false on both sides for participants (ADR-0041).
 */
export function casterVisible(
  duel: DuelDetailOut,
  user: CurrentUser | null,
  viewerCanVote: boolean | undefined,
): boolean {
  return duel.status === 'settled' && voteRegionVisible(user, viewerCanVote)
}
