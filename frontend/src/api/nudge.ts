import api from './axios'
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
  const { data } = await api.post<NudgeOut>(
    `/praxes/${praxisId}/nudge/${toCharacterId}`,
  )
  // The recipient's feed just gained a row. Nothing in the SENDER's own feed
  // changes, but the bus is how every feed surface learns to refetch and the
  // sender may well be looking at their own — cheap, and never stale.
  notifyRequestsChanged()
  return data
}
