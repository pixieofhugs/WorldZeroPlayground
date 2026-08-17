/**
 * The ADR-0012 lazy-consensus state machine, as a pure function.
 *
 * Lifted out of `CollabRoster.tsx` verbatim (#1397). It was always pure, but
 * living in a component module meant every importer paid for the roster, its
 * `ConfirmDialog`, and the eight-faction `composerConfirms` copy — ~50 KB gzip
 * of chunk for a fifteen-line reduce over `members[]`. `deriveEditPraxisPhase`
 * calls it, and the praxis-detail page calls that, so the bill landed on a page
 * that draws no roster at all.
 *
 * KEEP THIS MODULE A LEAF: types in, plain object out, no component imports.
 * `CollabRoster` re-exports all three names, so nothing that reached for them by
 * the old path had to change.
 *
 *   member_count < 2                      → awaiting  (S0) a crew of one
 *   cast_count === 0                      → writing   (S1) no proposal is live
 *   0 < cast < count, I cast               → waiting   (S2) I have approved
 *   0 < cast < count, I didn't             → holdout   (S3) the crew waits on me
 *   cast_count === member_count           → published (S4) everyone approved
 *
 * `has_submitted` is an **approval of the live proposal** since ADR-0079, not
 * "this member filed their part" — so `cast_count` is zero whenever no window
 * is open, and `writing` is the ordinary drafting state rather than a beat
 * before the first submit. The states themselves are unchanged; what they are
 * counting is.
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

/** Pure derivation of the consensus gate from the member list. */
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
