/**
 * The side-by-side reader's three rules that are not the phone ruling (#1084).
 *
 * Each is one line, and each is here rather than inline in the chassis because
 * each is read from more than one place:
 *
 *  - {@link readerMountsDuel} is read by the route (which redirects) and stated
 *    again by `DuelCard`, whose link out is gated on the same fact.
 *  - {@link arrivedFromSide} is read by the ground and by `openSideFor`.
 *  - {@link casterVisible} is read TWICE inside one column — by the panel's
 *    heading and prompt, and by the widget. #1429 is exactly what happens when
 *    those two halves are derived separately: the widget hid itself and eight
 *    archetypes kept drawing an empty "Cast your vote" plate over the hole. The
 *    ADR for this surface says the vote gate may not live in two files; this is
 *    the file.
 *
 * `../openSide.ts` is the fourth rule and stays its own module: it is the one
 * with an owner ruling and a six-row tail behind it.
 */
import { voteRegionVisible } from '../../components/vote/VoteUI'
import type { CurrentUser } from '../../api/auth'
import type { DuelDetailOut } from '../../api/duel'
import type { DuelSideKey } from './openSide'

/**
 * Does this duel have two entries to read side by side?
 *
 * The same pair `DuelCard` draws — outcomes only. `declined` has no duel to
 * read out (the praxis is an ordinary solo, ADR-0011); `pending` and `active`
 * are the run-up, which belongs to the composer (ADR-0059), and
 * `_duel_side_hidden_condition` (#999) keeps a live-incomplete side author-only
 * so one of the two columns would not load at all.
 *
 * The `praxis_id` half is the same gate `DuelCard`'s link out carries: until
 * both entries exist there is no second side, and the reader would open on half
 * a duel. A forfeiter's thrown side is back to `in_progress` and drops its
 * `praxis_id`, which is the shape this actually catches in production.
 */
export function readerMountsDuel(duel: DuelDetailOut): boolean {
  if (duel.status !== 'settled' && duel.status !== 'resolved') return false
  return duel.challenger.praxis_id != null && duel.opponent.praxis_id != null
}

/**
 * Which side the reader was opened from, or `null` on a deep link.
 *
 * Resolved from the PRAXIS the link carried (`?from=`), never from the viewer —
 * a spectator arrives from a side they did not write, and a duellist can arrive
 * from their rival's page. `null` for a `?from` naming neither side, because
 * the phone ruling's tail treats "no arrived-from side" and "the challenger"
 * differently on a tie and a stale query string must not silently become one.
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
 * Does one column draw a caster at all?
 *
 * Two reasons it may not, and they are different statements:
 *
 *  - **The era has closed.** `resolved` REMOVES both panels rather than
 *    disabling them (artboard 2e). The figures are the frozen finals and there
 *    is nothing left to vote on; a dead control is not the same statement as no
 *    control.
 *  - **The viewer wrote this entry.** That is `voteRegionVisible`'s rule,
 *    inherited whole rather than restated: `viewer_can_vote` is false only for
 *    a logged-in viewer the backend says can never vote here — account
 *    ownership or duel participation, the two permanent blocks (#998). So a
 *    duellist reading this page sees ONE caster, and an anonymous viewer keeps
 *    the per-widget login gate on both (#855).
 */
export function casterVisible(
  duel: DuelDetailOut,
  user: CurrentUser | null,
  viewerCanVote: boolean | undefined,
): boolean {
  return duel.status === 'settled' && voteRegionVisible(user, viewerCanVote)
}
