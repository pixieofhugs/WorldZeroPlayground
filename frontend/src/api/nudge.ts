import { apiPost } from './client'
import type { components } from './generated/schema'
import { notifyRequestsChanged } from '../utils/requestsBus'

/**
 * Nudging the player a shared praxis is still waiting on (#1083).
 *
 * The design drew this as `setNudged({...})` — local React state that lights the
 * button up and sends nothing. That was rejected: it reads as sent and isn't, a
 * reload un-nudges it, and you can poke forever. So there is a real write, and
 * the button's disabled state is read back from the server as `nudged_at` on the
 * roster row (`PraxisMemberOut`) or the duel side (`DuelSideOut`) — never held
 * here.
 *
 * `praxisId` is the praxis the RECIPIENT owes: the shared collab, or the RIVAL's
 * own side of the duel (a duel is two linked solo praxes, ADR-0011). Not yours.
 */

export type NudgeOut = components['schemas']['NudgeOut']

export async function sendNudge(
  praxisId: number,
  toCharacterId: number,
): Promise<NudgeOut> {
  const { data } = await apiPost('/praxes/{praxis_id}/nudge/{character_id}', {
    params: { path: { praxis_id: praxisId, character_id: toCharacterId } },
  })
  // The recipient's feed just gained a row. Nothing in the SENDER's own feed
  // changes, but the bus is how every feed surface learns to refetch and the
  // sender may well be looking at their own — cheap, and never stale.
  notifyRequestsChanged()
  return data
}

/**
 * One entry per recipient of a crew nudge (#1415). Exactly one of `nudge` /
 * `error` is set.
 *
 * `status_code` is the status the single-recipient route would have returned
 * for that person on its own — 422 inside their 24h window or already filed,
 * 403 not in the crew, 400 yourself — so a caller branches on the number
 * rather than on the prose.
 *
 * The three nullable fields are nullable, not optional: FastAPI serializes
 * every key, so each arrives as `T | null`, and "exactly one of nudge/error is
 * set" stays the contract callers branch on.
 */
export type NudgeResultOut = components['schemas']['NudgeResultOut']

/**
 * Poke everyone the praxis is still waiting on, in one request.
 *
 * No body: the crew is every member who has not filed yet, minus you, and the
 * server derives it from the roster — which is why the cooldown rule stays in
 * one place instead of being re-implemented here as "fan out N calls and
 * swallow the 422s".
 *
 * **The 200 does not mean everyone was poked.** Inside the 24h window some of
 * the crew are routinely refused, so report the result by counting entries with
 * a `nudge` against entries with an `error` — silence would read as "all of
 * them" and the player would have no way to know otherwise. Nobody outstanding
 * comes back as `[]`; a 403 means you are not a member who has filed, and a 422
 * means the praxis is no longer waiting on anyone.
 */
export async function nudgeTheCrew(
  praxisId: number,
): Promise<NudgeResultOut[]> {
  const { data } = await apiPost('/praxes/{praxis_id}/nudge', {
    params: { path: { praxis_id: praxisId } },
  })
  notifyRequestsChanged()
  return data
}
