import type { ComponentType } from 'react'
import { pickVariant } from '../../utils/factionDispatch'
import VoteStamps from '../ui/VoteStamps'
import EverymenVote from './EverymenVote'
import WowVote from './WowVote'
import SnideVote from './SnideVote'
import EphemeristsVote from './EphemeristsVote'

/**
 * Per-faction vote/rating UI dispatcher (Tier-3 surface). Keyed by the voted
 * praxis's task faction (praxis.task_faction_slug). Faction variants register
 * in Sessions 3-4 and share useVote(); until then every praxis uses the global
 * VoteStamps. See docs/spec/SPEC-faction-ui-profile.md §1-2.
 */
export interface VoteUIProps {
  praxisId: number
  currentStars?: number
  averageStars?: number
  totalVotes?: number
}

const FACTION_VOTE: Record<string, ComponentType<VoteUIProps>> = {
  everymen: EverymenVote,
  wow: WowVote,
  snide: SnideVote,
  ephemerists: EphemeristsVote,
}

export default function VoteUI({
  factionSlug,
  ...props
}: VoteUIProps & { factionSlug?: string | null }) {
  const Variant = pickVariant(FACTION_VOTE, factionSlug, VoteStamps)
  return <Variant {...props} />
}
