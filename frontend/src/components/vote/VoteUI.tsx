import { useContext } from 'react'
import { resolveVariant } from '../../utils/factionDispatch'
import { surfaceMap } from '../../factions'
import { useAuth } from '../../auth/AuthContext'
import type { CurrentUser } from '../../api/auth'
import DefaultVote from './DefaultVote'
import { VoteFactionContext, VoteLoginGate } from './VoteShell'
import { VoteSandboxContext } from './voteSandbox'

/**
 * Vote UI dispatcher keyed by the praxis's task faction; unskinned factions
 * and `na` get {@link DefaultVote} (#820, ADR-0039; SPEC-faction-ui-profile §1-2).
 */
export interface VoteUIProps {
  praxisId: number
  currentValue?: number
  points?: number | null
  totalVotes?: number
  /** Backend ``viewer_can_vote`` (#998): ``false`` for the permanent blocks. */
  viewerCanVote?: boolean
}

/**
 * Whether the vote region exists (#998, #1429): `false` only for a logged-in
 * viewer with a permanent block (owner or duel participant). Anonymous viewers
 * get the login gate (#855). The one predicate: callers drawing chrome around
 * the widget must use it too, or they draw an empty plate (#1429).
 */
export function voteRegionVisible(
  user: CurrentUser | null,
  viewerCanVote?: boolean,
): boolean {
  return !(user && viewerCanVote === false)
}

export default function VoteUI({
  factionSlug,
  viewerCanVote,
  ...props
}: VoteUIProps & { factionSlug?: string | null }) {
  const { user } = useAuth()
  const sandbox = useContext(VoteSandboxContext)
  if (!voteRegionVisible(user, viewerCanVote)) {
    return null
  }
  // Level gate (#3102), here so every skin inherits it; `voteRegionVisible`
  // deliberately isn't told, so chrome stays. `=== false` so a stale cached
  // payload doesn't read as gated. Needs a character: "reach level N" is
  // meaningless without one.
  if (!sandbox && user?.character && user.can_vote === false) {
    return (
      <VoteLoginGate
        factionSlug={factionSlug}
        levelRequired={user.vote_level_required}
        needsReceivedVote={user.vote_lock_reason === 'no_received_vote'}
      />
    )
  }
  const Variant = resolveVariant(surfaceMap('vote'), factionSlug)
  // Published for the in-widget login gate's voice (#855).
  return (
    <VoteFactionContext.Provider value={factionSlug}>
      <Variant {...props} />
    </VoteFactionContext.Provider>
  )
}
