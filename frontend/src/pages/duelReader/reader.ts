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
 * `duel_side_hidden_condition` (#999) keeps a live-incomplete side author-only,
 * so on those two statuses the rival's praxis is a GUARANTEED 403 for everyone
 * but its author. This gate therefore has to be consulted **before** anything
 * is fetched, or that 403 becomes an error page where a redirect was designed.
 *
 * `praxis_id` says a side was cast at all; at least one side must still be
 * readable, or there is no entry on the page and nothing to compare.
 */
export function readerMountsDuel(duel: DuelDetailOut): boolean {
  if (duel.status !== 'settled' && duel.status !== 'resolved') return false
  if (duel.challenger.praxis_id == null || duel.opponent.praxis_id == null) return false
  return duel.challenger.is_submitted || duel.opponent.is_submitted
}

/**
 * The praxis id this side's BODY can actually be fetched with, or `null` where
 * the reader must render that column from the duel payload alone.
 *
 * A CORRECTION THIS SURFACE GOT WRONG FIRST TIME ROUND, worth stating plainly:
 * `praxis_id` is not permission to read. Unsubmitting a *settled* duel side
 * forfeits the contest (`services/praxis.py`, ADR-0011 §Forfeit) and the duel
 * STAYS `settled` while that praxis drops back to `in_progress`. The duel keeps
 * pointing at it, so `praxis_id` is still set — but `praxis_visibility_condition`
 * shows an `in_progress` praxis to its members only, so fetching it 403s for
 * every reader except the forfeiter.
 *
 * `is_submitted` is the field that answers the question, and
 * `get_duel_detail`'s own docstring says so: *"a forfeited or unsubmitted side
 * still renders name/avatar but `is_submitted` is False."* A side without a
 * body is exactly the column the design already draws for a forfeit — dimmed,
 * an em-dash for a figure, `wonByDefault` on the standing — so the payload the
 * duel already carries is enough to render it.
 */
export function readablePraxisId(side: DuelDetailOut['challenger']): number | null {
  return side.is_submitted ? side.praxis_id : null
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
 *  - **The viewer may not vote here.** That is `voteRegionVisible`'s rule,
 *    inherited whole rather than restated: `viewer_can_vote` is false only for
 *    a logged-in viewer the backend says can never vote here — account
 *    ownership or duel participation, the two permanent blocks (#998).
 *
 *    **A DUELLIST THEREFORE SEES ZERO CASTERS ON THIS PAGE, NOT ONE**, and the
 *    design's note that they see "one caster, not two" is wrong about the
 *    backend. `viewer_can_vote` is false on BOTH sides for either participant —
 *    `backend/tests/integration/test_viewer_can_vote.py::test_duel_participant_cannot_vote_on_either_side`
 *    pins it — because anti-self-voting is enforced at the ACCOUNT level
 *    (ADR-0041) and a duel participant is blocked from the whole contest, not
 *    just from their own entry. There is no payload in which exactly one side
 *    is votable, so nothing here should be written as though there were.
 *
 *    A spectator sees two casters; a duellist sees none; an anonymous viewer
 *    keeps the per-widget login gate on both (#855).
 */
export function casterVisible(
  duel: DuelDetailOut,
  user: CurrentUser | null,
  viewerCanVote: boolean | undefined,
): boolean {
  return duel.status === 'settled' && voteRegionVisible(user, viewerCanVote)
}
