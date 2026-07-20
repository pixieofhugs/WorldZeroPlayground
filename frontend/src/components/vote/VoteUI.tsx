import type { } from 'react'
import { pickVariant } from '../../utils/factionDispatch'
import { surfaceMap } from '../../factions'
import UnaffiliatedVote from './UnaffiliatedVote'

/**
 * Per-faction vote/rating UI dispatcher (Tier-3 surface). Keyed by the voted
 * praxis's task faction (praxis.task_faction_slug). A faction that registers a
 * `vote` variant in its manifest gets its bespoke widget; `na` and every
 * themed-but-unskinned faction fall through to the global spectrum-sweep
 * {@link UnaffiliatedVote} (#820, ADR-0039). See SPEC-faction-ui-profile §1-2.
 */
export interface VoteUIProps {
  praxisId: number
  currentValue?: number
  points?: number | null
  totalVotes?: number
}

export default function VoteUI({
  factionSlug,
  ...props
}: VoteUIProps & { factionSlug?: string | null }) {
  const Variant = pickVariant(surfaceMap('vote'), factionSlug, UnaffiliatedVote)
  return <Variant {...props} />
}
