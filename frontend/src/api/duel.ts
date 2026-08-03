import { apiGet, apiPost } from './client'
import { notifyRequestsChanged } from '../utils/requestsBus'
import { clearCastTallies } from '../components/vote/castTallies'

// ---------------------------------------------------------------------------
// Types — match backend schemas/duel.py exactly (ADR-0011)
// ---------------------------------------------------------------------------

export type DuelStatus = 'pending' | 'active' | 'settled' | 'declined' | 'resolved'

export interface DuelOut {
  id: number
  task_id: number
  challenger_praxis_id: number
  opponent_character_id: number
  opponent_praxis_id: number | null
  status: DuelStatus
  created_at: string
}

export interface DuelChallengeIn {
  challenger_praxis_id: number
  opponent_character_id: number
}

export interface DuelRespondIn {
  accept: boolean
}

export interface DuelSideOut {
  praxis_id: number | null
  character_id: number
  display_name: string
  faction_slug: string
  avatar_url: string
  points_from_votes: number
  is_submitted: boolean
  /** The duel twin of `PraxisMemberOut.nudged_at` (#1083); same server-owned window. */
  nudged_at?: string | null
}

export interface DuelDetailOut {
  id: number
  task_id: number
  status: DuelStatus
  forfeited_by_character_id: number | null
  challenger: DuelSideOut
  opponent: DuelSideOut
  // Frozen outcome, populated once the duel is `resolved` at era close
  // (ADR-0052); null on live duels. A resolved rail renders these instead of the
  // live vote tally. null winner on a resolved duel = tie, or no-contest.
  winner_character_id: number | null
  challenger_final_points: number | null
  opponent_final_points: number | null
}

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
