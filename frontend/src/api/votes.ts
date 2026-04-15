import api from './axios'

export interface VoteOut {
  id: number
  praxis_id: number | null
  collaboration_id: number | null
  duel_vote_for: number | null
  voter_character_id: number
  stars: number
  created_at: string
  updated_at: string
}

export interface VoteSummary {
  praxis_id: number
  total_votes: number
  average_stars: number
  total_score: number
}

export async function castVote(praxisId: number, stars: number): Promise<VoteOut> {
  const { data } = await api.post<VoteOut>(`/praxes/${praxisId}/vote`, { stars })
  return data
}

export async function getVotes(praxisId: number): Promise<VoteSummary> {
  const { data } = await api.get<VoteSummary>(`/praxes/${praxisId}/votes`)
  return data
}
