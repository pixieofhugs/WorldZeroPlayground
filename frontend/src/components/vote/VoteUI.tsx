import type { } from 'react'
import { resolveVariant } from '../../utils/factionDispatch'
import { surfaceMap } from '../../factions'
import { useAuth } from '../../auth/AuthContext'
import type { CurrentUser } from '../../api/auth'
import DefaultVote from './DefaultVote'
import { VoteFactionContext } from './VoteShell'

/**
 * Per-faction vote/rating UI dispatcher (Tier-3 surface). Keyed by the voted
 * praxis's task faction (praxis.task_faction_slug). A faction that registers a
 * `vote` variant in its manifest gets its bespoke widget; `na` and every
 * themed-but-unskinned faction fall through to the global spectrum-sweep
 * {@link DefaultVote} (#820, ADR-0039). See SPEC-faction-ui-profile §1-2.
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

/**
 * Should the vote region exist at all for this viewer? (#998, #1429)
 *
 * `false` only for a logged-in viewer the backend says can never vote here —
 * account ownership or duel participation, the two PERMANENT blocks. Anonymous
 * viewers are always `true`: they fall through to the per-widget login gate, and
 * that CTA is deliberate (#855). The backend never sends `viewer_can_vote:false`
 * to a logged-out visitor either (`services/vote.viewer_can_vote`), so the `user`
 * half is the client's belt-and-braces.
 *
 * THE ONE PREDICATE. `VoteUI` applies it to itself, and every caller that draws
 * chrome AROUND the widget — heading, prompt, plate — applies the same call to
 * that chrome. #1429 is what happens when the two halves are derived separately:
 * the widget hid itself and eight archetypes kept drawing an empty "Cast your
 * vote" plate over the hole.
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
  if (!voteRegionVisible(user, viewerCanVote)) {
    return null
  }
  const Variant = resolveVariant(surfaceMap('vote'), factionSlug)
  // The slug is published to the shared chrome as well as dispatched on: the
  // logged-out gate speaks in the task faction's eyebrow voice (#855) and is
  // returned from inside each widget, which takes no slug prop.
  return (
    <VoteFactionContext.Provider value={factionSlug}>
      <Variant {...props} />
    </VoteFactionContext.Provider>
  )
}
