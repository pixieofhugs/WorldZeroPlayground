import type { } from 'react'
import { pickVariant } from '../../utils/factionDispatch'
import { surfaceMap } from '../../factions'
import { useAuth } from '../../auth/AuthContext'
import UnaffiliatedVote from './UnaffiliatedVote'
import { VoteFactionContext } from './VoteShell'

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
  /**
   * The backend's viewer-relative ``praxis.viewer_can_vote`` (#998). ``false``
   * only when the logged-in viewer's account owns the praxis or is a duel
   * participant — the two PERMANENT vote blocks the client can't compute itself.
   * When ``false`` for a logged-in viewer the whole module is hidden; anonymous
   * viewers fall through to each widget's own login gate regardless.
   */
  viewerCanVote?: boolean
}

export default function VoteUI({
  factionSlug,
  viewerCanVote,
  ...props
}: VoteUIProps & { factionSlug?: string | null }) {
  const { user } = useAuth()
  // Hide the whole module for a logged-in viewer the backend says can never
  // vote here (ownership / duel participation, #998). Anonymous viewers fall
  // through to the per-widget login gate — the login CTA is deliberate.
  if (user && viewerCanVote === false) {
    return null
  }
  const Variant = pickVariant(surfaceMap('vote'), factionSlug, UnaffiliatedVote)
  // The slug is published to the shared chrome as well as dispatched on: the
  // logged-out gate speaks in the task faction's eyebrow voice (#855) and is
  // returned from inside each widget, which takes no slug prop.
  return (
    <VoteFactionContext.Provider value={factionSlug}>
      <Variant {...props} />
    </VoteFactionContext.Provider>
  )
}
