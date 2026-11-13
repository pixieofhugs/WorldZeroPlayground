import { apiGet, apiPost } from './client'
import type { components } from './generated/schema'

/** Same field names as `PraxisOut` / `PraxisCardOut`, so one merge function serves (#1382). */
export type VoteTallyOut = components['schemas']['VoteTallyOut']

export type ViewerStatsOut = components['schemas']['ViewerStatsOut']

/**
 * The client's SOLE post-cast truth (#1382). Vote fields are flattened in, so
 * there is no `VoteOut` to alias. `viewer_vote` is the carried character's star.
 */
export type VoteCastOut = components['schemas']['VoteCastOut']

export type VoterDetail = components['schemas']['VoterDetail']

export async function castVote(praxisId: number, value: number): Promise<VoteCastOut> {
  const { data } = await apiPost('/praxes/{praxis_id}/vote', {
    params: { path: { praxis_id: praxisId } },
    body: { value },
  })
  return data
}

export async function getVoters(praxisId: number): Promise<VoterDetail[]> {
  const { data } = await apiGet('/praxes/{praxis_id}/voters', {
    params: { path: { praxis_id: praxisId } },
  })
  return data
}
