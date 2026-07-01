import api from './axios'

export interface VoteOut {
  id: number
  praxis_id: number
  voter_character_id: number
  value: number
  created_at: string
  updated_at: string
}

export interface VoteSummary {
  praxis_id: number
  total_votes: number
  total_score: number
}

/** One voter + the value they cast (schemas/vote.py VoterDetail). */
export interface VoterDetail {
  character_id: number
  display_name: string
  avatar_url: string
  faction_slug: string
  value: number
}

export async function castVote(praxisId: number, value: number): Promise<VoteOut> {
  const { data } = await api.post<VoteOut>(`/praxes/${praxisId}/vote`, { value })
  return data
}

export async function getVotes(praxisId: number): Promise<VoteSummary> {
  const { data } = await api.get<VoteSummary>(`/praxes/${praxisId}/votes`)
  return data
}

export async function getVoters(praxisId: number): Promise<VoterDetail[]> {
  const { data } = await api.get<VoterDetail[]>(`/praxes/${praxisId}/voters`)
  return data
}
