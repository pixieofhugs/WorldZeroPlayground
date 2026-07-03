import { useState } from 'react'
import type { ActivityFeedItem } from '../api/activityFeed'
import { respondToInvite } from '../api/praxis'
import { respondToChallenge } from '../api/duel'
import { extractError } from '../utils/errors'

/**
 * Shared accept/decline logic for the two request-shaped feed items
 * (#346, #393). Collab invites and duel challenges hit DIFFERENT backend
 * endpoints with different payload fields — this hook is the single place
 * that knows the switch, so the feed cards and the sidebar Pending Requests
 * panel can't drift apart again (the drift previously broke duel-accept:
 * the duel card read collab fields and called the collab endpoint with
 * `undefined` ids).
 */

export type RequestResponseStatus = 'pending' | 'accepted' | 'declined'

/**
 * Collapse the per-type raw status into the three states the UI cares about.
 * Collab invites report 'accepted'; duels report 'active' (and later
 * 'settled') once accepted.
 */
export function normalizeRequestStatus(
  raw: string | null | undefined,
): RequestResponseStatus {
  if (raw === null || raw === undefined || raw === 'pending') return 'pending'
  if (raw === 'declined') return 'declined'
  return 'accepted'
}

/** Read the item's current status from the right payload field per type. */
export function requestStatusOf(item: ActivityFeedItem): RequestResponseStatus {
  const raw =
    item.type === 'duel_challenge'
      ? item.payload.duel_status
      : item.payload.invite_status
  return normalizeRequestStatus(raw)
}

/**
 * Dispatch the response to the right endpoint for the item type.
 *
 * Returns the praxis the responder should land on after accepting: the
 * shared collab praxis, or the fresh opponent praxis a duel-accept creates
 * server-side. Null when declining a duel (no praxis is created).
 */
export async function respondToRequest(
  item: ActivityFeedItem,
  accept: boolean,
): Promise<number | null> {
  switch (item.type) {
    case 'collab_invite': {
      const { praxis_id, invite_id } = item.payload
      await respondToInvite(praxis_id, invite_id, accept)
      return praxis_id
    }
    case 'duel_challenge': {
      const duel = await respondToChallenge(item.payload.duel_id, { accept })
      return duel.opponent_praxis_id
    }
    default:
      throw new Error(`Not a respondable request type: ${item.type}`)
  }
}

export interface RespondResult {
  ok: boolean
  /** Praxis to navigate to after a successful accept (null on decline/failure). */
  praxisId: number | null
}

export function useRespondToRequest(item: ActivityFeedItem) {
  const [status, setStatus] = useState<RequestResponseStatus>(() =>
    requestStatusOf(item),
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const respond = async (acceptRequest: boolean): Promise<RespondResult> => {
    setLoading(true)
    setError('')
    try {
      const praxisId = await respondToRequest(item, acceptRequest)
      setStatus(acceptRequest ? 'accepted' : 'declined')
      return { ok: true, praxisId }
    } catch (err) {
      // Surface the real backend reason (e.g. 400 "Cannot join a submitted
      // praxis" after lazy-consensus auto-publish, or 409 bank-full) instead
      // of a generic swallow. (#318)
      const noun = item.type === 'duel_challenge' ? 'duel' : 'invite'
      const verb = acceptRequest ? 'accept' : 'decline'
      setError(extractError(err, `Could not ${verb} ${noun}. Please try again.`))
      return { ok: false, praxisId: null }
    } finally {
      setLoading(false)
    }
  }

  const accept = () => respond(true)
  const decline = () => respond(false)

  return { accept, decline, loading, status, error } as const
}
