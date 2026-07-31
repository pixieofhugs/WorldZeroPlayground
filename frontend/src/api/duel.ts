import api from './axios'
import { notifyRequestsChanged } from '../utils/requestsBus'
import { clearVoteOverrides } from '../components/vote/voteOverrides'

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
  accepted_at: string | null
  declined_at: string | null
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
  viewer_is_participant: boolean
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
  const { data: result } = await api.post<DuelOut>('/duels/challenge', data)
  return result
}

export async function getDuelDetail(duelId: number): Promise<DuelDetailOut> {
  const { data } = await api.get<DuelDetailOut>(`/duels/${duelId}/detail`)
  // Server truth for BOTH sides' `points_from_votes` — retire any local override
  // so the duel merge can't double-count it (#1239). This payload is merged
  // into, so it clears alongside the praxis and votes fetches; an override that
  // outlived its payload would keep masking another player's vote.
  clearVoteOverrides(
    [data.challenger.praxis_id, data.opponent.praxis_id].filter(
      (praxisId): praxisId is number => praxisId != null,
    ),
  )
  return data
}

export async function respondToChallenge(duelId: number, data: DuelRespondIn): Promise<DuelOut> {
  const { data: result } = await api.post<DuelOut>(`/duels/${duelId}/respond`, data)
  // The challenge left your requests bucket (accept → now awaiting your
  // submission; decline → gone). Refresh every feed surface (#updates-badge).
  notifyRequestsChanged()
  return result
}

export async function cancelChallenge(duelId: number): Promise<DuelOut> {
  const { data } = await api.post<DuelOut>(`/duels/${duelId}/cancel`)
  return data
}
