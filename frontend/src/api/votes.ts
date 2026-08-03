import { apiGet, apiPost } from './client'
import type { components } from './generated/schema'

/**
 * A praxis's vote aggregate, in the field names every praxis payload uses.
 *
 * Deliberately the same two names `PraxisOut` / `PraxisCardOut` carry. The
 * retired `VoteSummary` spelled the same numbers `total_score` / `total_votes`,
 * and that second vocabulary is precisely why the client needed a *second*
 * merge function for them (#1382).
 */
export type VoteTallyOut = components['schemas']['VoteTallyOut']

/** The voter's own stats immediately after their cast. */
export type ViewerStatsOut = components['schemas']['ViewerStatsOut']

/**
 * Everything a cast changed — the client's SOLE source of post-cast truth (#1382).
 *
 * Before this, the POST answered a bare `VoteOut` and the client reconstructed
 * the rest: a delta-arithmetic overlay store for the tally (stale-bugged twice,
 * #1142 and #1239) and a full `/auth/me` reload per star for the stats.
 *
 * The vote's own five fields sit at the top level rather than nested, which is
 * why there is no `VoteOut` here to extend: the backend flattened them into this
 * model and the schema has no standalone `VoteOut` to alias. `viewer_vote` is
 * the star that now stands for the viewer's carried character.
 */
export type VoteCastOut = components['schemas']['VoteCastOut']

/** One voter + the value they cast. */
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
