import { apiGet, apiPost } from './client'
import { notifyRequestsChanged } from '../utils/requestsBus'
import { clearCastTallies } from '../utils/castTallies'
import type { components } from './generated/schema'

// ---------------------------------------------------------------------------
// Types — aliases of the generated schema, so they match backend
// schemas/duel.py by construction rather than by review (ADR-0011, #1400).
// ---------------------------------------------------------------------------

export type DuelStatus = components['schemas']['DuelStatus']

export type DuelOut = components['schemas']['DuelOut']

export type DuelChallengeIn = components['schemas']['DuelChallengeIn']

export type DuelRespondIn = components['schemas']['DuelRespondIn']

/** `nudged_at` is the duel twin of `PraxisMemberOut.nudged_at` (#1083); same
 *  server-owned window. */
export type DuelSideOut = components['schemas']['DuelSideOut']

/**
 * `winner_character_id`, `challenger_final_points` and `opponent_final_points`
 * are the FROZEN outcome, populated once the duel is `resolved` at era close
 * (ADR-0052) and null on live duels. A resolved rail renders these instead of
 * the live vote tally; a null winner on a resolved duel means a tie, or a
 * no-contest.
 */
export type DuelDetailOut = components['schemas']['DuelDetailOut']

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function issueChallenge(data: DuelChallengeIn): Promise<DuelOut> {
  const { data: result } = await apiPost('/duels/challenge', { body: data })
  return result
}

export async function getDuelDetail(duelId: number): Promise<DuelDetailOut> {
  const { data } = await apiGet('/duels/{duel_id}/detail', {
    params: { path: { duel_id: duelId } },
  })
  // Server truth for BOTH sides' `points_from_votes` — drop any cast tally it
  // supersedes (#1239). This payload is merged into, so it clears alongside the
  // praxis fetch; a tally that outlived its payload would keep masking another
  // player's vote.
  clearCastTallies(
    [data.challenger.praxis_id, data.opponent.praxis_id].filter(
      (praxisId): praxisId is number => praxisId != null,
    ),
  )
  return data
}

export async function respondToChallenge(duelId: number, data: DuelRespondIn): Promise<DuelOut> {
  const { data: result } = await apiPost('/duels/{duel_id}/respond', {
    params: { path: { duel_id: duelId } },
    body: data,
  })
  // The challenge left your requests bucket (accept → now awaiting your
  // submission; decline → gone). Refresh every feed surface (#updates-badge).
  notifyRequestsChanged()
  return result
}

export async function cancelChallenge(duelId: number): Promise<DuelOut> {
  const { data } = await apiPost('/duels/{duel_id}/cancel', {
    params: { path: { duel_id: duelId } },
  })
  return data
}
