import api from './axios'

// ---------------------------------------------------------------------------
// Types — match backend schemas/duel.py exactly (ADR-0011)
// ---------------------------------------------------------------------------

export type DuelStatus = 'pending' | 'active' | 'settled' | 'declined'

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

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function issueChallenge(data: DuelChallengeIn): Promise<DuelOut> {
  const { data: result } = await api.post<DuelOut>('/duels/challenge', data)
  return result
}

export async function getDuel(duelId: number): Promise<DuelOut> {
  const { data } = await api.get<DuelOut>(`/duels/${duelId}`)
  return data
}

export async function respondToChallenge(duelId: number, data: DuelRespondIn): Promise<DuelOut> {
  const { data: result } = await api.post<DuelOut>(`/duels/${duelId}/respond`, data)
  return result
}

export async function cancelChallenge(duelId: number): Promise<DuelOut> {
  const { data } = await api.post<DuelOut>(`/duels/${duelId}/cancel`)
  return data
}

export async function listPendingChallenges(): Promise<DuelOut[]> {
  const { data } = await api.get<DuelOut[]>('/duels/pending')
  return data
}
