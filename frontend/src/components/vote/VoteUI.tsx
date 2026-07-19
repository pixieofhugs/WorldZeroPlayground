import type { } from 'react'
import { pickVariant } from '../../utils/factionDispatch'
import { surfaceMap } from '../../factions'
import VoteStamps from '../ui/VoteStamps'

/**
 * Per-faction vote/rating UI dispatcher (Tier-3 surface). Keyed by the voted
 * praxis's task faction (praxis.task_faction_slug). Faction variants register
 * in Sessions 3-4 and share useVote(); until then every praxis uses the global
 * VoteStamps. See docs/spec/SPEC-faction-ui-profile.md §1-2.
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
  const Variant = pickVariant(surfaceMap('vote'), factionSlug, VoteStamps)
  return <Variant {...props} />
}
