/**
 * The ADR-0012 lazy-consensus state machine. A leaf on purpose (#1397): in a
 * component module it billed the praxis-detail page ~50 KB gzip. `CollabRoster`
 * re-exports it.
 *
 *   member_count < 2                      → awaiting  (S0) a crew of one
 *   cast_count === 0                      → writing   (S1) no proposal is live
 *   0 < cast < count, I cast               → waiting   (S2) I have approved
 *   0 < cast < count, I didn't             → holdout   (S3) the crew waits on me
 *   cast_count === member_count           → published (S4) everyone approved
 *
 * Since ADR-0079 `has_submitted` approves the live proposal, so `writing` is
 * the ordinary drafting state.
 */
import type { PraxisMemberOut } from '../../api/praxis'

export type CollabState =
  | 'awaiting'
  | 'writing'
  | 'waiting'
  | 'holdout'
  | 'published'

export interface CollabGate {
  memberCount: number
  castCount: number
  iCast: boolean
  state: CollabState
}

export function deriveCollabGate(
  members: readonly PraxisMemberOut[],
  currentCharacterId: number | null | undefined,
): CollabGate {
  const memberCount = members.length
  const castCount = members.filter((m) => m.has_submitted).length
  const iCast = members.some(
    (m) => m.character_id === currentCharacterId && m.has_submitted,
  )
  let state: CollabState
  // First, because every test below it lies at one member (#1274).
  if (memberCount < 2) state = 'awaiting'
  else if (castCount === 0) state = 'writing'
  else if (castCount >= memberCount) state = 'published'
  else state = iCast ? 'waiting' : 'holdout'
  return { memberCount, castCount, iCast, state }
}
