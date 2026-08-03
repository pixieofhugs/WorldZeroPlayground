import { apiPost } from './client'
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

export interface NudgeOut {
  id: number
  praxis_id: number
  from_character_id: number
  to_character_id: number
  created_at: string
}

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
 * rather than on the prose. Mirrors `schemas/nudge.py:NudgeResultOut`.
 *
 * ponytail (#1400): the three nullable fields stay REQUIRED here where the
 * generated type marks them optional, so `nudgeTheCrew` narrows with a cast.
 * Their Pydantic fields are `... | None = None`, and openapi-typescript reads a
 * `None` default as "may be absent" — but FastAPI serializes every key, so each
 * arrives as `T | null`. "Exactly one of nudge/error is set" is the contract
 * callers branch on; a `| undefined` that never appears would only blur it.
 * Reconciled once, for every module, by the alias slice of #1400.
 */
export interface NudgeResultOut {
  to_character_id: number
  nudge: NudgeOut | null
  error: string | null
  status_code: number | null
}

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
  return data as NudgeResultOut[]
}
