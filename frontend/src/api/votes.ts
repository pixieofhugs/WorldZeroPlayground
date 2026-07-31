import api from './axios'

export interface VoteOut {
  id: number
  praxis_id: number
  voter_character_id: number
  value: number
  created_at: string
  updated_at: string
}

/**
 * A praxis's vote aggregate, in the field names every praxis payload uses
 * (schemas/vote.py VoteTallyOut).
 *
 * Deliberately the same two names `PraxisOut` / `PraxisCardOut` carry. The
 * retired `VoteSummary` spelled the same numbers `total_score` / `total_votes`,
 * and that second vocabulary is precisely why the client needed a *second*
 * merge function for them (#1382).
 */
export interface VoteTallyOut {
  points_from_votes: number
  voter_count: number
}

/** The voter's own stats immediately after their cast (schemas/vote.py). */
export interface ViewerStatsOut {
  score: number
  level: number
  votes_available: number
}

/**
 * Everything a cast changed — the client's SOLE source of post-cast truth (#1382).
 *
 * Before this, the POST answered a bare `VoteOut` and the client reconstructed
 * the rest: a delta-arithmetic overlay store for the tally (stale-bugged twice,
 * #1142 and #1239) and a full `/auth/me` reload per star for the stats.
 */
export interface VoteCastOut extends VoteOut {
  tally: VoteTallyOut
  /** The star that now stands for the viewer's carried character. */
  viewer_vote: number
  viewer_stats: ViewerStatsOut
}

/** One voter + the value they cast (schemas/vote.py VoterDetail). */
export interface VoterDetail {
  character_id: number
  display_name: string
  avatar_url: string
  faction_slug: string
  value: number
}

export async function castVote(praxisId: number, value: number): Promise<VoteCastOut> {
  const { data } = await api.post<VoteCastOut>(`/praxes/${praxisId}/vote`, { value })
  return data
}

export async function getVoters(praxisId: number): Promise<VoterDetail[]> {
  const { data } = await api.get<VoterDetail[]>(`/praxes/${praxisId}/voters`)
  return data
}
