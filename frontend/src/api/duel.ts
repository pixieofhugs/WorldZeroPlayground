import { apiGet, apiPost } from './client'
import { notifyRequestsChanged } from '../utils/requestsBus'
import { castTallyClock, clearCastTallies } from '../utils/castTallies'
import type { components } from './generated/schema'

// Aliases of the generated schema (ADR-0011, #1400).

export type DuelStatus = components['schemas']['DuelStatus']

export type DuelOut = components['schemas']['DuelOut']

export type DuelChallengeIn = components['schemas']['DuelChallengeIn']

export type DuelRespondIn = components['schemas']['DuelRespondIn']

/** `nudged_at`: duel twin of `PraxisMemberOut.nudged_at` (#1083). */
export type DuelSideOut = components['schemas']['DuelSideOut']

/**
 * `winner_character_id` / `*_final_points`: the FROZEN outcome once `resolved`
 * at era close (ADR-0052), null on live duels. A null winner on a resolved
 * duel = tie or no-contest.
 */
export type DuelDetailOut = components['schemas']['DuelDetailOut']

export async function issueChallenge(data: DuelChallengeIn): Promise<DuelOut> {
  const { data: result } = await apiPost('/duels/challenge', { body: data })
  return result
}

export async function getDuelDetail(duelId: number): Promise<DuelDetailOut> {
  const asked = castTallyClock()
  const { data } = await apiGet('/duels/{duel_id}/detail', {
    params: { path: { duel_id: duelId } },
  })
  // Clears BOTH sides' cast tallies (#1239), only those from before `asked` (#3093).
  clearCastTallies(
    [data.challenger.praxis_id, data.opponent.praxis_id].filter(
      (praxisId): praxisId is number => praxisId != null,
    ),
    asked,
  )
  return data
}

export async function respondToChallenge(duelId: number, data: DuelRespondIn): Promise<DuelOut> {
  const { data: result } = await apiPost('/duels/{duel_id}/respond', {
    params: { path: { duel_id: duelId } },
    body: data,
  })
  notifyRequestsChanged()
  return result
}

export async function cancelChallenge(duelId: number): Promise<DuelOut> {
  const { data } = await apiPost('/duels/{duel_id}/cancel', {
    params: { path: { duel_id: duelId } },
  })
  return data
}
