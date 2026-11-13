import { apiPost } from './client'
import type { components } from './generated/schema'
import { notifyRequestsChanged } from '../utils/requestsBus'

/**
 * Nudges are a real write (#1083); the button's state is read back as
 * `nudged_at` on `PraxisMemberOut` / `DuelSideOut`, never held locally.
 * `praxisId` is the praxis the RECIPIENT owes (for duels, the rival's side).
 */

export type NudgeOut = components['schemas']['NudgeOut']

export async function sendNudge(
  praxisId: number,
  toCharacterId: number,
): Promise<NudgeOut> {
  const { data } = await apiPost('/praxes/{praxis_id}/nudge/{character_id}', {
    params: { path: { praxis_id: praxisId, character_id: toCharacterId } },
  })
  // The sender may be watching their own feed; a ring is cheap.
  notifyRequestsChanged()
  return data
}

/**
 * Exactly one of `nudge` / `error` is set. `status_code` is what the
 * single-recipient route would return (422 in window/filed, 403 not crew, 400
 * yourself); branch on it, not the prose.
 */
export type NudgeResultOut = components['schemas']['NudgeResultOut']

/**
 * Nudge everyone still owing, server-derived (keeps the cooldown rule in one
 * place). **A 200 doesn't mean everyone was poked**: count `nudge` vs `error`
 * entries. Nobody outstanding → `[]`; 403 = you haven't filed / not a member;
 * 422 = waiting on no one.
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
